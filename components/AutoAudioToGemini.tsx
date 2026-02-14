"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAudioStore } from "@/context/AudioContext";
import { useInterview } from "@/context/InterviewContext";
import { useInterviewPrompt } from "@/hooks/useInterviewPrompt";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioProcessing } from "@/hooks/useAudioProcessing";

export default function AutoAudioToGemini() {
  const { file } = useAudioStore();
  const { isInterviewActive } = useInterview();
  const [instruction, setInstruction] = useState(
    "Respond in a friendly but brief manner.",
  );

  const prompt = useInterviewPrompt(instruction);
  const { result, loading, error, sendAudio } = useAudioProcessing(prompt);
  const { audioRef } = useTextToSpeech(result);

  const [autoSentForFileKey, setAutoSentForFileKey] = useState<string | null>(
    null,
  );

  const fileKey = file
    ? `${file.name}:${file.size}:${file.lastModified}:${file.type}`
    : null;

  // Auto-send when a new recording lands in context (only if interview is active)
  useEffect(() => {
    if (!isInterviewActive) return;
    if (!file || !fileKey) return;
    if (autoSentForFileKey === fileKey) return;
    setAutoSentForFileKey(fileKey);
    void sendAudio(file);
  }, [fileKey, isInterviewActive, file, autoSentForFileKey, sendAudio]);

  if (!isInterviewActive) {
    return null;
  }

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

      <Button onClick={() => file && sendAudio(file)} disabled={!file || loading}>
        {loading ? "Sending..." : "Send"}
      </Button>

      {error && <div className="text-sm text-red-500">{error}</div>}
      {result && <pre className="whitespace-pre-wrap">{result}</pre>}

      <audio ref={audioRef} controls />
    </div>
  );
}
