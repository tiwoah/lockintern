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
    const company = String(form.get("company") ?? "");
    const language = String(form.get("language") ?? "en");
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

    const companySection = company.trim()
      ? `\n\nTarget Company:\n"""\n${company.trim()}\n"""`
      : "";

    const resumeSection = resumeText.trim()
      ? `\n\nCandidate's Resume:\n"""\n${resumeText.trim()}\n"""`
      : "";

    const jdSection = jobDescription.trim()
      ? `\n\nJob Description:\n"""\n${jobDescription.trim()}\n"""`
      : "";

    const isFrench = language === "fr";
    const langInstruction = isFrench
      ? "\n\nIMPORTANT: Respond with ALL JSON content in French (Français): category names (Relevance → Pertinence, Clarity → Clarté, Depth → Profondeur, Confidence → Confiance), feedback text, transcript, and overall summary must be in French."
      : "";

    const prompt = `You are a strict, no-nonsense expert interview coach evaluating a candidate's spoken answer.

Interview question (${questionIndex} of ${totalQuestions}):
"${question}"${companySection}${resumeSection}${jdSection}

The candidate's audio response is attached. Listen carefully and evaluate honestly.${langInstruction}

CRITICAL RULES:
- If the audio is silent, empty, contains only noise/breathing, or the candidate does not provide a meaningful spoken answer, give 1/5 for every category.
- If the answer is vague, very short (just a few words), or does not address the question, give 1–2/5.
- Only give 4–5/5 for answers that are detailed, specific, and directly address the question.
- Be honest and critical. If a target company is provided, evaluate whether the answer fits that company's culture and expectations.

You MUST respond with ONLY valid JSON (no markdown, no code fences, no extra text). Use this exact schema (use the category names and write all string values in the requested language):
{
  "transcript": "<Full verbatim transcript of exactly what the candidate said, word for word including filler words. If silent, write '[No speech detected]' or '[Aucune parole détectée]' for French>",
  "categories": [
    { "name": "${isFrench ? "Pertinence" : "Relevance"}", "score": <1-5>, "feedback": "<2-3 sentences>" },
    { "name": "${isFrench ? "Clarté" : "Clarity"}", "score": <1-5>, "feedback": "<2-3 sentences>" },
    { "name": "${isFrench ? "Profondeur" : "Depth"}", "score": <1-5>, "feedback": "<2-3 sentences>" },
    { "name": "${isFrench ? "Confiance" : "Confidence"}", "score": <1-5>, "feedback": "<2-3 sentences>" }
  ],
  "overall": "<3-5 sentences: summarize key strengths and weaknesses, give specific actionable advice>"
}

Respond with ONLY the JSON object.`;

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

    const raw = (response.text ?? "").trim();

    // Strip markdown code fences if present
    let jsonStr = raw;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json({ feedback: parsed });
    } catch {
      // Fallback: return raw text wrapped in a default structure
      return NextResponse.json({
        feedback: {
          transcript: "",
          categories: [
            { name: "Relevance", score: 3, feedback: raw.slice(0, 120) },
            { name: "Clarity", score: 3, feedback: "" },
            { name: "Depth", score: 3, feedback: "" },
            { name: "Confidence", score: 3, feedback: "" },
          ],
          overall: raw,
        },
      });
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
