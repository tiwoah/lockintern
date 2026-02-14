"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askGemini } from "@/utils/askGemini";

export default function Example() {
  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<string>("");

  async function handleSubmit() {
    if (!input.trim()) return;
    const text = await askGemini(input);
    setResult(text);
  }

  return (
    <div className="space-y-4">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type prompt"
      />
      <Button onClick={handleSubmit}>Send</Button>
      {result && <pre className="whitespace-pre-wrap">{result}</pre>}
    </div>
  );
}
