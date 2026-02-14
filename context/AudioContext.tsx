// app/audio/AudioContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type StoredAudio = {
  file: File | null;
  url: string | null;
  mimeType: string | null;
  fileSize: number | null;
  seconds: number | null;
};

type AudioStore = StoredAudio & {
  setAudio: (next: { file: File; seconds?: number | null }) => void;
  clearAudio: () => void;
};

const AudioContext = createContext<AudioStore | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);

  // keep the object URL lifecycle inside the provider
  useEffect(() => {
    if (!file) {
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      setMimeType(null);
      setFileSize(null);
      return;
    }

    if (url) URL.revokeObjectURL(url);
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    setMimeType(file.type || null);
    setFileSize(file.size);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const value = useMemo<AudioStore>(
    () => ({
      file,
      url,
      mimeType,
      fileSize,
      seconds,
      setAudio: ({ file: nextFile, seconds: nextSeconds = null }) => {
        setSeconds(nextSeconds);
        setFile(nextFile);
      },
      clearAudio: () => {
        setSeconds(null);
        setFile(null);
      },
    }),
    [file, url, mimeType, fileSize, seconds],
  );

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

export function useAudioStore() {
  const ctx = useContext(AudioContext);
  if (!ctx)
    throw new Error("useAudioStore must be used within <AudioProvider>");
  return ctx;
}
