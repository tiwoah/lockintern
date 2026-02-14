export async function generateIntroductionText(
  jobDescription: string | null,
  resumeFile: File | null
): Promise<string> {
  let prompt = `You are conducting a job interview. Please introduce yourself to the candidate and welcome them to the interview. Be friendly and professional. Briefly mention that you'll be asking questions about their background and experience.\n\nHere is the job description:\n${
    (jobDescription ?? "").trim() || "(none)"
  }`;

  if (resumeFile) {
    prompt += `\n\nA resume PDF has been provided. Please use it to personalize your introduction and mention something specific from their background.`;
  }

  const form = new FormData();
  form.append("prompt", prompt);
  if (resumeFile) {
    form.append("resume", resumeFile);
  }

  const res = await fetch("/api/generate-text", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error ?? "Failed to generate introduction");
  }

  const data = await res.json();
  return data?.text ?? "";
}

export async function speakText(text: string): Promise<void> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate speech");
  }

  const buffer = await res.arrayBuffer();
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  await audio.play();
}
