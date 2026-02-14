import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const prompt = String(form.get("prompt") ?? "Please summarize the audio.");
    const audio = form.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Missing audio file" },
        { status: 400 },
      );
    }

    // Convert File -> base64 (Node runtime)
    const arrayBuffer = await audio.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const mimeType = audio.type || "audio/mpeg";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
      // Use a model that supports audio input in the Gemini API
      model: "gemini-2.5-flash",
      contents,
    });

    return NextResponse.json({ text: response.text ?? "" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
