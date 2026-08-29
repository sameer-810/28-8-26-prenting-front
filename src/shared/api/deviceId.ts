import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * A stable per-install identifier.
 *
 * The API uses it so re-login on the SAME device replaces that device's session
 * rather than consuming another slot against the plan's device cap. Without it,
 * a parent who reinstalls the app three times is locked out of their own
 * account by their own device limit — a support ticket, not a security outcome.
 *
 * Deliberately random and local: not a hardware id, not an advertising id,
 * nothing that could identify the person or follow them between apps. It means
 * "this install", and clearing app data legitimately makes it a new device.
 */

const KEY = "parentai.deviceId";
let cached: string | null = null;

function generate(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
    const fresh = generate();
    await AsyncStorage.setItem(KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // Storage unavailable (a private browser session, say). A per-run id still
    // beats none: the cap is enforced either way, it just cannot recognise a
    // returning install.
    cached = cached || generate();
    return cached;
  }
}

export function getDeviceName(): string {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined") return "Browser";
    const ua = navigator.userAgent || "";
    if (/edg/i.test(ua)) return "Edge";
    if (/chrome/i.test(ua)) return "Chrome";
    if (/firefox/i.test(ua)) return "Firefox";
    if (/safari/i.test(ua)) return "Safari";
    return "Browser";
  }
  return Platform.OS === "ios" ? "iPhone" : "Android phone";
}

export function getPlatform(): "ios" | "android" | "web" {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
}

/** The `device` block every credential exchange sends. */
export async function deviceContext() {
  return {
    deviceId: await getDeviceId(),
    deviceName: getDeviceName(),
    platform: getPlatform(),
  };
}
