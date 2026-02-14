import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;

        if (!audioFile) {
            return NextResponse.json(
                { error: "No audio file provided" },
                { status: 400 }
            );
        }

        // Convert file to base64
        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");

        // Determine MIME type
        const mimeType = audioFile.type || "audio/wav";

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "API key not configured" },
                { status: 500 }
            );
        }

        // Call Google Gemini API for transcription
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Audio,
                                    },
                                },
                                {
                                    text: "Transcribe this audio accurately. Return ONLY the transcribed text, nothing else. Do not add any labels, prefixes, or commentary. If the audio is silent or unintelligible, return an empty string.",
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Gemini API error:", errorData);
            return NextResponse.json(
                { error: "Transcription failed. Please try again." },
                { status: 500 }
            );
        }

        const data = await response.json();
        const transcript =
            data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        return NextResponse.json({ text: transcript });
    } catch (error) {
        console.error("Transcription error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
