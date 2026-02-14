import { useEffect, useRef } from "react";

export function useTextToSpeech(text: string) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSpokenTextRef = useRef<string>("");

  const speak = async (textToSpeak: string) => {
    const trimmed = (textToSpeak ?? "").trim();
    if (!trimmed) return;

    // Avoid replaying the same text over and over on re-renders
    if (lastSpokenTextRef.current === trimmed) return;
    lastSpokenTextRef.current = trimmed;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) return;

      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const el = audioRef.current;
      if (!el) return;

      // Stop any current playback
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}

      el.src = url;

      // Autoplay may fail until the user has interacted with the page
      try {
        await el.play();
      } catch {
        // Ignore autoplay errors; user can press Play on controls
      }
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  // Auto-speak when text changes
  useEffect(() => {
    if (text) {
      void speak(text);
    }
  }, [text]);

  return { audioRef, speak };
}
