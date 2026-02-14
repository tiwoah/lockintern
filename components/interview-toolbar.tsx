"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, PhoneOff } from "lucide-react";
import { blobToWavFile } from "@/utils/blobToWav";
import { useAudioStore } from "@/context/AudioContext";
import { useInterview } from "@/context/InterviewContext";

export function InterviewToolbar() {
  const { setAudio, clearAudio } = useAudioStore();
  const { exitInterview } = useInterview();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  async function start() {
    clearAudio();
    setSeconds(0);
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      const webmBlob = new Blob(chunksRef.current, {
        type: mr.mimeType || "audio/webm",
      });

      const wavFile = await blobToWavFile(webmBlob, "recording.wav");
      setAudio({ file: wavFile, seconds });

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    mr.start();
    setIsRecording(true);

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center justify-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-sm border border-border rounded-full">
        <Button
          onClick={isRecording ? stop : start}
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          className="gap-2 rounded-full cursor-pointer"
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start Recording
            </>
          )}
        </Button>
        {isRecording && (
          <div className="px-3 py-2 bg-destructive/10 text-destructive rounded-full font-mono text-sm flex items-center gap-2">
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
            {formatTime(seconds)}
          </div>
        )}
        <Button
          onClick={exitInterview}
          variant="destructive"
          size="lg"
          className="gap-2 rounded-full cursor-pointer"
        >
          <PhoneOff className="h-4 w-4" />
          Leave Interview
        </Button>
      </div>
    </div>
  );
}
