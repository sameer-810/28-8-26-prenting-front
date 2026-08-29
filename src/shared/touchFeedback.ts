import { Platform, AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";

export type FeedbackTone = "select" | "impact" | "success" | "warning" | "error";

/**
 * Haptics, with the two guards that matter.
 *
 * 1. Web has no haptics — calling anyway throws in some browsers.
 * 2. Reduced-motion is respected. Vestibular sensitivity and haptic sensitivity
 *    are not the same thing, but the OS setting is the only signal available
 *    and a user who has asked for less motion has asked for a calmer device.
 *    This product's whole design position is calm; buzzing at someone who
 *    turned that off would contradict it.
 */

let reduceMotion = false;
if (Platform.OS !== "web") {
  AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      reduceMotion = v;
    })
    .catch(() => {});
  AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
    reduceMotion = v;
  });
}

export function haptic(tone: FeedbackTone = "select") {
  if (Platform.OS === "web" || reduceMotion) return;
  try {
    switch (tone) {
      case "impact":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.selectionAsync();
    }
  } catch {
    // A device without a taptic engine. Nothing to do.
  }
}

/** Read by animated components so motion can be skipped, not just softened. */
export function prefersReducedMotion() {
  if (Platform.OS === "web") {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  return reduceMotion;
}
