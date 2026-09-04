import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

export interface CapturedImage {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * One way to get a photo out of a parent, on every platform this ships to.
 *
 * Native uses `expo-image-picker` — the camera for "photograph the page", the
 * library for a page they already shot. Web uses a hidden file input with
 * `capture="environment"`, which a phone browser opens straight into the camera
 * and a desktop browser turns into a file picker. Both end at the same
 * `{uri, name, mimeType}` the upload helper takes.
 *
 * `expo-image-picker` is imported lazily. It pulls in native modules that do not
 * exist in the web bundle, and a top-level import would cost every web visitor
 * the download and break the export.
 *
 * Deliberately a hook rather than a component: the capture card wants an inline
 * grid of thumbnails, and a shared modal would fit that badly.
 */
export function useImageCapture() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resolver = useRef<((images: CapturedImage[]) => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  /** Resolves the pending web promise when the file dialog closes. */
  const onWebFiles = useCallback(
    (e: { target: { files?: FileList | null } }) => {
      const done = resolver.current;
      resolver.current = null;
      const files = Array.from(e.target.files ?? []);
      done?.(
        files.map((f) => ({
          uri: URL.createObjectURL(f),
          name: f.name || "page.jpg",
          mimeType: f.type || "image/jpeg",
        })),
      );
    },
    [],
  );

  const pickOnWeb = useCallback(async (): Promise<CapturedImage[]> => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      // Reset first, or choosing the same file twice fires no change event.
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.click();
    });
  }, []);

  /**
   * @param source "camera" opens the viewfinder; "library" opens the gallery.
   *   A parent photographing a page wants the first; one who already shot the
   *   page while the child was at school wants the second.
   */
  const capture = useCallback(
    async (
      source: "camera" | "library" = "camera",
    ): Promise<CapturedImage[]> => {
      setPermissionDenied(false);
      if (Platform.OS === "web") return pickOnWeb();

      setBusy(true);
      try {
        const picker = await import("expo-image-picker");

        const permission =
          source === "camera"
            ? await picker.requestCameraPermissionsAsync()
            : await picker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setPermissionDenied(true);
          return [];
        }

        const options = {
          quality: 0.75,
          // The server re-encodes and strips EXIF anyway (utils/imageStore.js);
          // this only keeps the upload sane on a phone connection.
          allowsEditing: false,
          mediaTypes: picker.MediaTypeOptions?.Images,
        };

        const result =
          source === "camera"
            ? await picker.launchCameraAsync(options)
            : await picker.launchImageLibraryAsync({
                ...options,
                allowsMultipleSelection: true,
                // The backend caps an upload at six images.
                selectionLimit: 6,
              });

        if (result.canceled || !result.assets?.length) return [];
        return result.assets.slice(0, 6).map((a, i) => ({
          uri: a.uri,
          name: a.fileName || `page-${i + 1}.jpg`,
          mimeType: a.mimeType || "image/jpeg",
        }));
      } finally {
        setBusy(false);
      }
    },
    [pickOnWeb],
  );

  return { capture, busy, permissionDenied, inputRef, onWebFiles };
}
