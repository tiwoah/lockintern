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

export async function generateInterviewQuestions(
  jobDescription: string | null,
  resumeFile: File | null,
  numQuestions: number = 5
): Promise<string[]> {
  let prompt = `You are conducting a job interview. Generate exactly ${numQuestions} interview questions based on the job description and candidate's resume. 

Return ONLY a JSON array of question strings, nothing else. Example format: ["Question 1?", "Question 2?", "Question 3?"]

Here is the job description:\n${
    (jobDescription ?? "").trim() || "(none)"
  }`;

  if (resumeFile) {
    prompt += `\n\nA resume PDF has been provided. Please use it to create personalized questions based on the candidate's background and experience.`;
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
    throw new Error(data?.error ?? "Failed to generate questions");
  }

  const data = await res.json();
  const text = data?.text ?? "";
  
  // Try to parse JSON from the response
  try {
    // Extract JSON array from the response (might have markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      if (Array.isArray(questions) && questions.length > 0) {
        return questions;
      }
    }
    // Fallback: try parsing the whole response
    const questions = JSON.parse(text);
    if (Array.isArray(questions)) {
      return questions;
    }
  } catch {
    // If JSON parsing fails, try to extract questions from text
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const questions = lines
      .filter(line => line.includes('?') || line.match(/^\d+[\.\)]/))
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(q => q.length > 0);
    
    if (questions.length > 0) {
      return questions.slice(0, numQuestions);
    }
  }

  // Ultimate fallback: return default questions
  return [
    "Tell me about yourself.",
    "Why are you interested in this position?",
    "What relevant experience do you have?",
    "What are your strengths?",
    "Do you have any questions for us?",
  ].slice(0, numQuestions);
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
