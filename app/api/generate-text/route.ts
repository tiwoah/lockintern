import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const prompt = String(form.get("prompt") ?? "");
    const resume = form.get("resume");

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const contents: any[] = [{ text: prompt }];

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
