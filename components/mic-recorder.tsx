"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { blobToWavFile } from "@/utils/blobToWav";

export default function MicRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string>("audio/webm");
  const [seconds, setSeconds] = useState(0);

  async function start() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setFileSize(null);
    setSeconds(0);
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    setMimeType(mr.mimeType || "audio/webm");

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      const webmBlob = new Blob(chunksRef.current, {
        type: mr.mimeType || "audio/webm",
      });

      const wavFile = await blobToWavFile(webmBlob, "recording.wav");

      const url = URL.createObjectURL(wavFile);
      setAudioUrl(url);
      setFileSize(wavFile.size);
      setMimeType(wavFile.type);

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
    };
  }, []);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  function getExtension(type: string) {
    if (type.includes("wav")) return "wav";
    if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
    if (type.includes("mp4")) return "m4a";
    if (type.includes("webm")) return "webm";
    return "audio";
  }

  return (
    <div>
      <Button onClick={start} disabled={isRecording}>
        Start
      </Button>
      <Button onClick={stop} disabled={!isRecording}>
        Stop
      </Button>

      {isRecording && <div>Recording: {formatTime(seconds)}</div>}

      {audioUrl && (
        <>
          <audio controls src={audioUrl} />
          {fileSize !== null && <div>Size: {formatSize(fileSize)}</div>}
          <a href={audioUrl} download={`recording.${getExtension(mimeType)}`}>
            <Button>Download</Button>
          </a>
        </>
      )}
    </div>
  );
}
