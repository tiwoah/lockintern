import { useCallback, useState } from "react";
import { useResume } from "@/context/ResumeContext";

export function useAudioProcessing(prompt: string) {
  const { resumeFile } = useResume();
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendAudio = useCallback(async (audioFile: File) => {
    setLoading(true);
    setResult("");
    setError(null);

    try {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("audio", audioFile);
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
        // Ignore JSON parse errors
      }

      if (!res.ok) {
        const errorMessage = data?.error ?? "Request failed";
        setError(errorMessage);
        setResult("");
        return;
      }

      setResult(data?.text ?? "");
      setError(null);
    } catch (err) {
      setError("Failed to process audio");
      setResult("");
    } finally {
      setLoading(false);
    }
  }, [prompt, resumeFile]);

  return { result, loading, error, sendAudio };
}
