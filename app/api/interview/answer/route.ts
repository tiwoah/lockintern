import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const question = String(form.get("question") ?? "");
    const questionIndex = String(form.get("questionIndex") ?? "1");
    const totalQuestions = String(form.get("totalQuestions") ?? "1");
    const resumeText = String(form.get("resumeText") ?? "");
    const jobDescription = String(form.get("jobDescription") ?? "");
    const audio = form.get("audio");

    if (!question.trim()) {       
      return NextResponse.json(
        { error: "Missing question" },
        { status: 400 },
      );
    }

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Missing audio file" },
        { status: 400 },
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audio.type || "audio/wav";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const resumeSection = resumeText.trim()
      ? `\n\nCandidate's Resume:\n"""\n${resumeText.trim()}\n"""`
      : "";

    const jdSection = jobDescription.trim()
      ? `\n\nJob Description:\n"""\n${jobDescription.trim()}\n"""`
      : "";

    const prompt = `You are a strict, no-nonsense expert interview coach evaluating a candidate's spoken answer.

Interview question (${questionIndex} of ${totalQuestions}):
"${question}"${resumeSection}${jdSection}

The candidate's audio response is attached. Listen carefully and evaluate honestly.

CRITICAL RULES:
- If the audio is silent, empty, contains only noise/breathing, or the candidate does not provide a meaningful spoken answer, you MUST rate it 0–1 out of 10. Do NOT be generous with silence or non-answers.
- If the answer is vague, very short (just a few words), or does not address the question, rate it 1–3 out of 10.
- Only give 7+ for answers that are detailed, specific, and directly address the question.
- Be honest and critical. A mediocre answer should get a mediocre score (4–6).

Please provide:
1. **Summary**: What the candidate actually said (if nothing/silence, explicitly state "The candidate did not provide a spoken answer").
2. **Rating**: X/10 — be strict and honest.
3. **Feedback**: 1–2 sentences of constructive feedback.${resumeText.trim() ? "\n4. **Resume relevance**: Whether the candidate leveraged their resume experience." : ""}${jobDescription.trim() ? "\n5. **JD alignment**: How well the answer aligns with the job requirements." : ""}

Keep your response concise (under 200 words).`;

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
    });

    return NextResponse.json({ feedback: response.text ?? "" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
