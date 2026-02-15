import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { topic, company, count, resumeText, jobDescription, language } = (await request.json()) as {
      topic: string;
      company?: string;
      count?: number;
      resumeText?: string;
      jobDescription?: string;
      language?: string;
    };

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "Missing topic" },
        { status: 400 },
      );
    }

    const questionCount = Math.min(Math.max(count ?? 3, 3), 5);
    const isFrench = language === "fr";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Build context sections for resume and job description
    const companyLine = company?.trim()
      ? `\nTarget Company: ${company.trim()}`
      : "";

    const resumeSection = resumeText?.trim()
      ? `\n\nCandidate's Resume:\n"""\n${resumeText.trim()}\n"""`
      : "";

    const jdSection = jobDescription?.trim()
      ? `\n\nJob Description:\n"""\n${jobDescription.trim()}\n"""`
      : "";

    const langInstruction = isFrench
      ? "\n\nIMPORTANT: Write ALL questions in French (Français)."
      : "";

    const prompt = `You are an expert interviewer. Generate exactly ${questionCount} interview questions for the following topic or role:

"${topic}"${companyLine}${resumeSection}${jdSection}

Rules:
- Questions should be behavioral or situational (e.g. "Tell me about a time…", "How would you handle…").
- Mix difficulty: include easy, medium, and hard questions.${resumeText?.trim() ? "\n- Reference specific experiences, skills, or projects from the candidate's resume when relevant." : ""}${jobDescription?.trim() ? "\n- Tailor questions to the responsibilities and requirements in the job description." : ""}
- If a company is provided, align tone and priorities with that company's culture and interview style.
- Return ONLY a valid JSON array of strings with no extra text, markdown, or code fences.${langInstruction}

Example output:
["Question 1?", "Question 2?", "Question 3?"]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const raw = (response.text ?? "").trim();

    // Extract the JSON array from the response (strip markdown fences if present)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse questions from AI response" },
        { status: 502 },
      );
    }

    const questions: string[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "AI returned empty question list" },
        { status: 502 },
      );
    }

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
