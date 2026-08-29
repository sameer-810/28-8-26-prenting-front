import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Where the API lives.
 *
 * WHY DEVELOPMENT RESOLVES THE HOST DYNAMICALLY
 * ---------------------------------------------
 * `localhost` means the device itself. On the web build that is the developer's
 * machine and works; in Expo Go on a real phone it is the phone, and every
 * request fails with a connection error that looks like the API being down.
 *
 * Expo's dev server already knows the LAN address it is being reached on
 * (`hostUri`), so the phone borrows it. An explicit `EXPO_PUBLIC_API_URL_DEV`
 * still wins for anyone on a different setup.
 */
function devApiHost(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL_DEV;
  if (explicit) return explicit;

  if (Platform.OS === "web") return "http://localhost:5005";

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(":")[0];
  return host ? `http://${host}:5005` : "http://localhost:5005";
}

const ENV = {
  development: () => {
    const base = devApiHost();
    return { apiUrl: `${base}/api/v1`, socketUrl: base };
  },
  production: () => {
    const base = process.env.EXPO_PUBLIC_API_URL || "https://api.parentai.app";
    return { apiUrl: `${base}/api/v1`, socketUrl: base };
  },
};

export const environment = __DEV__ ? ENV.development() : ENV.production();

/** The privacy-policy version the app currently presents at signup. */
export const POLICY_VERSION = "1.0";
