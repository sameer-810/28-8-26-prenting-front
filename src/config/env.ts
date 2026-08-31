import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * `localhost` on a phone means the phone, so Expo Go borrows the dev server's
 * LAN address instead. Failing that, requests error in a way that looks like
 * the API being down.
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

/** EXPO_PUBLIC_API_URL is the ORIGIN; `/api/v1` is appended here, not there. */
const ENV = {
  development: () => {
    const base = devApiHost();
    return { apiUrl: `${base}/api/v1`, socketUrl: base };
  },
  production: () => {
    const base = process.env.EXPO_PUBLIC_API_URL || "https://two8-8-26-prenting-back.onrender.com";
    return { apiUrl: `${base}/api/v1`, socketUrl: base };
  },
};

export const environment = __DEV__ ? ENV.development() : ENV.production();

/** The privacy-policy version the app currently presents at signup. */
export const POLICY_VERSION = "1.0";
