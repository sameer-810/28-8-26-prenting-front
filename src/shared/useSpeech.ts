import { useCallback, useEffect, useRef, useState } from "react";
import type { LanguageCode } from "./fonts";

/**
 * Reading a passage aloud.
 *
 * The PRD's whole shape is a parent reading to their child, and a parent who
 * cannot read the script — a Marathi speaker handed an English sentence, or the
 * reverse — is stuck at the first sentence. This gives them a voice to lean on
 * without taking the reading away from them.
 *
 * `expo-speech` is imported lazily. It resolves to the Web Speech API on web
 * and to the platform engine on native, and a top-level import would pull a
 * native module into the web bundle.
 *
 * Availability is never assumed. A device with no voice for the requested
 * language, or a browser that has not loaded one, must leave the button hidden
 * rather than offer a control that does nothing.
 */

/** BCP-47 tags for the eight languages the product ships. */
const VOICE_TAG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ur: "ur-IN",
};

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const module = useRef<typeof import("expo-speech") | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("expo-speech")
      .then((m) => {
        if (cancelled) return;
        module.current = m;
        setSupported(true);
      })
      .catch(() => {
        // No speech engine on this platform. The caller hides its button.
        if (!cancelled) setSupported(false);
      });
    return () => {
      cancelled = true;
      // Leaving the screen must not leave a voice talking to an empty room.
      module.current?.stop?.();
    };
  }, []);

  const stop = useCallback(() => {
    module.current?.stop?.();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, language: LanguageCode = "en") => {
    const speech = module.current;
    if (!speech || !text.trim()) return;

    // A second tap stops rather than queues. Two voices reading over each
    // other is the worst outcome available here.
    speech.stop();

    setSpeaking(true);
    speech.speak(text, {
      language: VOICE_TAG[language] ?? "en-IN",
      /**
       * Deliberately below the default. This is being read by a parent to a
       * six-to-fourteen year old, and the default rate is pitched at an adult
       * skimming a notification.
       */
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  return { speak, stop, speaking, supported };
}
