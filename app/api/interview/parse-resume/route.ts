import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing resume file" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `Extract ALL text content from the attached resume document. Return ONLY the plain text — no commentary, no markdown formatting, no extra explanation. Preserve section headings and structure with newlines.`,
        },
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
      ],
    });

    const text = (response.text ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from resume" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
