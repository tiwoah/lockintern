"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TTS() {
  const [text, setText] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleSpeak() {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) return;

    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  }

  return (
    <div>
      <Input
        placeholder="Enter text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button onClick={handleSpeak}>Speak</Button>
      <audio ref={audioRef} controls />
    </div>
  );
}
