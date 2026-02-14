import AudioToGemini from "@/components/AudioToGemini";
import Example from "@/components/example";
import MicRecorder from "@/components/mic-recorder";
import TextToSpeech from "@/components/TextToSpeech";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

export default function Home() {
  return (
    <div>
      <h1>LockIntern</h1>
      <Button>
        <Mic />
        Click me
      </Button>
      <Example />
      <TextToSpeech />
      <MicRecorder />
      <AudioToGemini />
    </div>
  );
}
