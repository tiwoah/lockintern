import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const prompt = String(form.get("prompt") ?? "Please summarize the audio.");
    const audio = form.get("audio");
    const resume = form.get("resume");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Missing audio file" },
        { status: 400 },
      );
    }

    // Convert File -> base64 (Node runtime)
    const audioArrayBuffer = await audio.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString("base64");
    const audioMimeType = audio.type || "audio/mpeg";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const contents: any[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType: audioMimeType,
          data: audioBase64,
        },
      },
    ];

    // Add resume PDF if provided
    if (resume instanceof File) {
      const resumeArrayBuffer = await resume.arrayBuffer();
      const resumeBase64 = Buffer.from(resumeArrayBuffer).toString("base64");
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: resumeBase64,
        },
      });
    }

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
