import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const runtime = "nodejs"; // keep it on Node runtime

export async function POST(req: Request) {
  const { text, language } = (await req.json()) as {
    text?: string;
    language?: string;
  };

  if (!text || !text.trim()) {
    return new Response("Missing text", { status: 400 });
  }

  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY, // keep key server-side
  });

  // Prefer French voice for French content when requested
  const voiceId =
    language === "fr"
      ? "EXAVITQu4vr4xnSDxMaL" // Sarah - French-friendly multilingual
      : "21m00Tcm4TlvDq8ikWAM"; // Rachel - default English

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: text.trim(),
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  return new Response(audioStream as any, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
