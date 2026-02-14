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

    const prompt = `You are an expert interview coach evaluating a candidate's spoken answer.

Interview question (${questionIndex} of ${totalQuestions}):
"${question}"${resumeSection}${jdSection}

The candidate's audio response is attached. Please:
1. Briefly summarize what the candidate said.
2. Rate the answer on a scale of 1–10.
3. Give 1–2 sentences of constructive feedback on how to improve.${resumeText.trim() ? "\n4. Note whether the candidate effectively leveraged their resume experience in their answer." : ""}${jobDescription.trim() ? "\n5. Comment on how well the answer aligns with the job description requirements." : ""}

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
