"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function MicRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string>("audio/webm");

  async function start() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setFileSize(null);
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    setMimeType(mr.mimeType || "audio/webm");

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
      setFileSize(blob.size);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    mr.start();
    setIsRecording(true);
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function getExtension(type: string) {
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
