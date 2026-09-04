import { Platform } from "react-native";
import { apiClient, unwrap } from "@api/apiClient";
import { clientOpId } from "@modules/session/api/sessionApi";
import type { CapturedImage } from "@shared/useImageCapture";

export interface Material {
  id: string;
  kind: string;
  childId?: string;
  subject?: string;
  chapter?: string;
  topics?: string[];
  extractedText?: string;
  images?: { url: string; width: number; height: number }[];
}

/**
 * Uploading a photographed page.
 *
 * Multipart, not JSON: the API takes the file through multer so it can cap the
 * size and re-encode before anything sees it, and a base64 body would be a
 * third larger for no gain.
 *
 * The two platforms build a file part differently. Native has no `File`, so
 * react-native's fetch takes `{uri, name, type}` and streams from disk. Web has
 * a blob URL, which has to be read back into a real Blob first — appending the
 * string would upload the text "blob:http://…".
 */
async function toFilePart(image: CapturedImage): Promise<unknown> {
  if (Platform.OS === "web") {
    const blob = await fetch(image.uri).then((r) => r.blob());
    return new File([blob], image.name, {
      type: image.mimeType || blob.type || "image/jpeg",
    });
  }
  return {
    uri: image.uri,
    name: image.name,
    type: image.mimeType || "image/jpeg",
  } as unknown;
}

export const materialApi = {
  /**
   * @param kind What the parent says this is. The vision prompt is chosen from
   *   it, so a worksheet is read differently from a syllabus page.
   */
  async capture(input: {
    images: CapturedImage[];
    childId?: string;
    kind?:
      "textbook_page" | "worksheet" | "syllabus" | "question_paper" | "notes";
    opId?: string;
  }): Promise<Material> {
    const form = new FormData();
    if (input.childId) form.append("childId", input.childId);
    form.append("kind", input.kind ?? "textbook_page");
    // Stable per attempt, so an outbox replay or a double tap cannot store the
    // same page twice.
    form.append("clientOpId", input.opId ?? clientOpId());

    for (const image of input.images.slice(0, 6)) {
      form.append("images", (await toFilePart(image)) as never);
    }

    return unwrap<Material>(
      apiClient.post("/materials", form, {
        /**
         * Undefined, not "multipart/form-data". The boundary is generated when
         * the body is serialised, and setting the header by hand omits it — the
         * server then sees a body it cannot split and rejects every upload.
         */
        headers: { "Content-Type": undefined as unknown as string },
        // A page photo over a phone connection, then a vision call behind it.
        timeout: 60000,
      }),
    );
  },

  async remove(id: string) {
    return unwrap<{ message: string }>(apiClient.delete(`/materials/${id}`));
  },
};
