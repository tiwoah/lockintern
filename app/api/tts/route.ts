import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const runtime = "nodejs"; // keep it on Node runtime

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };

  if (!text || !text.trim()) {
    return new Response("Missing text", { status: 400 });
  }

  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY, // keep key server-side
  });

  const audioStream = await client.textToSpeech.convert(
    "21m00Tcm4TlvDq8ikWAM", // voiceId
    {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    },
  );

  return new Response(audioStream as any, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
