"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAudioStore } from "@/context/AudioContext";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";

export default function AutoAudioToGemini() {
  const { file } = useAudioStore();
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();

  const [instruction, setInstruction] = useState(
    "Respond in a friendly but brief manner.",
  );

  const prompt = useMemo(() => {
    let promptText = `${instruction}\n\nHere is the job description:\n${
      (jobDescription ?? "").trim() || "(none)"
    }`;
    
    if (resumeFile) {
      promptText += `\n\nA resume PDF has been provided as additional context. Please use it to tailor your responses.`;
    }
    
    return promptText;
  }, [instruction, jobDescription, resumeFile]);

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSentForFileKey, setAutoSentForFileKey] = useState<string | null>(
    null,
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSpokenTextRef = useRef<string>("");

  const fileKey = file
    ? `${file.name}:${file.size}:${file.lastModified}:${file.type}`
    : null;

  async function speak(text: string) {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    // avoid replaying the same text over and over on re-renders
    if (lastSpokenTextRef.current === trimmed) return;
    lastSpokenTextRef.current = trimmed;

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

    // stop any current playback
    try {
      el.pause();
      el.currentTime = 0;
    } catch {}

    el.src = url;

    // autoplay may fail until the user has interacted with the page
    try {
      await el.play();
    } catch {
      // ignore autoplay errors; user can press Play on controls
    }
  }

  async function send(f: File) {
    setLoading(true);
    setResult("");

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("audio", f);
    if (resumeFile) {
      form.append("resume", resumeFile);
    }

    const res = await fetch("/api/generate-audio", {
      method: "POST",
      body: form,
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }

    setLoading(false);

    if (!res.ok) {
      setResult(data?.error ?? "Request failed");
      return;
    }

    setResult(data?.text ?? "");
  }

  // instantly send when a new recording lands in context
  useEffect(() => {
    if (!file || !fileKey) return;
    if (autoSentForFileKey === fileKey) return;
    setAutoSentForFileKey(fileKey);
    void send(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  // auto TTS + play when result changes
  useEffect(() => {
    void speak(result);
  }, [result]);

  return (
    <div className="space-y-4">
      <Input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Instruction"
      />

      {file ? (
        <div className="text-sm">
          {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB •{" "}
          {file.type || "unknown mime"}
        </div>
      ) : (
        <div className="text-sm">No recorded audio yet.</div>
      )}

      <Button onClick={() => file && send(file)} disabled={!file || loading}>
        {loading ? "Sending..." : "Send"}
      </Button>

      {result && <pre className="whitespace-pre-wrap">{result}</pre>}

      <audio ref={audioRef} controls />
    </div>
  );
}
