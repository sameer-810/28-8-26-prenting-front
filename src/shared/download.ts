import { Platform } from "react-native";

/**
 * Handing a file to the person using the app.
 *
 * Two halves, shared separately and on purpose. The modules that download things
 * — a yearly PDF report, a full data export — obtain their bytes differently:
 * the report is a GET streamed straight to disk on native, the export is a POST
 * whose body is written out. Forcing those into one function would mean a
 * parameter that switches the whole strategy.
 *
 * What they DID have in common, copied verbatim in both, was the fiddly part:
 * the web blob-and-anchor dance including the two-second revoke, and the native
 * "share it, or explain why you cannot" tail. Those are here.
 */

/**
 * Saves a blob to the browser's downloads.
 *
 * The revoke is deferred rather than immediate. Revoking an object URL in the
 * same tick as the click cancels the download in some browsers before they have
 * finished reading the blob — the file simply never appears, with no error
 * anywhere.
 */
export function saveOnWeb(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export interface DeliveryResult {
  ok: boolean;
  reason?: string;
}

/**
 * Offers a file on the device's share sheet.
 *
 * When sharing is unavailable the file HAS been written and there is simply
 * nowhere to send it. That is reported as a failure with the reason, rather
 * than as a success — telling a parent their report downloaded when they have
 * no way to reach it is worse than telling them it did not.
 */
export async function shareOrExplain(
  uri: string,
  mimeType: string,
  dialogTitle?: string,
  uti?: string,
): Promise<DeliveryResult> {
  const Sharing = await import("expo-sharing");
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: uti });
    return { ok: true };
  }
  return { ok: false, reason: "Saved to this device, but sharing isn't available here." };
}

/** True on the web, where a download goes to the browser rather than a share sheet. */
export const isWeb = Platform.OS === "web";
