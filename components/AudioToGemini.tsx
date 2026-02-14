"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AudioToGemini() {
  const [prompt, setPrompt] = useState("Please summarize the audio.");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!file) return;

    setLoading(true);
    setResult("");

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("audio", file);

    const res = await fetch("/api/generate-audio", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult(data?.error ?? "Request failed");
      return;
    }

    setResult(data.text ?? "");
  }

  return (
    <div className="space-y-4">
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt"
      />

      <Input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file && (
        <div className="text-sm">
          {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB •{" "}
          {file.type || "unknown mime"}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!file || loading}>
        {loading ? "Sending..." : "Send"}
      </Button>

      {result && <pre className="whitespace-pre-wrap">{result}</pre>}
    </div>
  );
}
