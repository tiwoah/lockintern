"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
    Mic,
    MicOff,
    Upload,
    Copy,
    Download,
    Trash2,
    FileAudio,
    Loader2,
    Check,
} from "lucide-react";

// Types for Web Speech API
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    }
}

export default function SpeechToText() {
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState("");
    const [error, setError] = useState("");
    const [speechSupported, setSpeechSupported] = useState(true);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            !("SpeechRecognition" in window) &&
            !("webkitSpeechRecognition" in window)
        ) {
            setSpeechSupported(false);
        }
    }, []);

    // ─── Live Mic Recording ───────────────────────────────────────────────
    const startRecording = useCallback(() => {
        setError("");
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = "";
            let final = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                setTranscript((prev) => prev + (prev ? " " : "") + final);
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", event.error);
            if (event.error !== "aborted") {
                setError(`Recognition error: ${event.error}`);
            }
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            setInterimTranscript("");
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, []);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
        setInterimTranscript("");
    }, []);

    // ─── File Upload ──────────────────────────────────────────────────────
    const handleFileUpload = useCallback(async (file: File) => {
        const validTypes = [
            "audio/mpeg",
            "audio/wav",
            "audio/mp4",
            "audio/x-m4a",
            "audio/webm",
            "audio/ogg",
            "audio/flac",
            "video/mp4",
            "video/webm",
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|flac|mp4)$/i)) {
            setError("Unsupported file format. Please upload an audio file.");
            return;
        }

        setError("");
        setIsProcessing(true);
        setUploadedFileName(file.name);

        try {
            const formData = new FormData();
            formData.append("audio", file);

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Transcription failed");
            }

            setTranscript((prev) => (prev ? prev + "\n\n" : "") + data.text);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to transcribe audio"
            );
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
        },
        [handleFileUpload]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            // Reset input so the same file can be re-uploaded
            e.target.value = "";
        },
        [handleFileUpload]
    );

    // ─── Actions ──────────────────────────────────────────────────────────
    const copyToClipboard = useCallback(async () => {
        if (!transcript) return;
        await navigator.clipboard.writeText(transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [transcript]);

    const downloadTranscript = useCallback(() => {
        if (!transcript) return;
        const blob = new Blob([transcript], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transcript.txt";
        a.click();
        URL.revokeObjectURL(url);
    }, [transcript]);

    const clearTranscript = useCallback(() => {
        setTranscript("");
        setInterimTranscript("");
        setUploadedFileName("");
        setError("");
    }, []);

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a0a2e] text-white flex flex-col items-center justify-start px-4 py-12">
            {/* Header */}
            <div className="text-center mb-10 animate-fade-in">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                    Speech to Text
                </h1>
                <p className="text-white/50 text-lg max-w-md mx-auto">
                    Transcribe audio in real-time or upload a file for instant
                    transcription
                </p>
            </div>

            {/* Main Card */}
            <Card className="w-full max-w-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-2xl shadow-2xl shadow-violet-500/5 overflow-hidden">
                <Tabs defaultValue="live" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 bg-white/[0.03] border-b border-white/[0.06] rounded-none h-14 p-0">
                        <TabsTrigger
                            value="live"
                            className="rounded-none h-full text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/[0.06] data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-violet-500 transition-all cursor-pointer"
                        >
                            <Mic className="w-4 h-4 mr-2" />
                            Live Recording
                        </TabsTrigger>
                        <TabsTrigger
                            value="upload"
                            className="rounded-none h-full text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/[0.06] data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-cyan-500 transition-all cursor-pointer"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                        </TabsTrigger>
                    </TabsList>

                    {/* ─── Live Recording Tab ────────────────────────────── */}
                    <TabsContent value="live" className="p-8 mt-0">
                        <div className="flex flex-col items-center gap-6">
                            {!speechSupported ? (
                                <div className="text-center py-4">
                                    <p className="text-amber-400/80 text-sm">
                                        Speech recognition is not supported in this browser.
                                        <br />
                                        Please use Chrome, Edge, or Safari.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Mic Button */}
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`relative group w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${isRecording
                                                ? "bg-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
                                                : "bg-violet-500/10 hover:bg-violet-500/20 shadow-[0_0_40px_rgba(139,92,246,0.15)] hover:shadow-[0_0_60px_rgba(139,92,246,0.25)]"
                                            }`}
                                    >
                                        {/* Pulse rings */}
                                        {isRecording && (
                                            <>
                                                <span className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
                                                <span
                                                    className="absolute inset-[-8px] rounded-full border-2 border-red-500/20 animate-pulse"
                                                />
                                            </>
                                        )}
                                        {isRecording ? (
                                            <MicOff className="w-10 h-10 text-red-400 relative z-10" />
                                        ) : (
                                            <Mic className="w-10 h-10 text-violet-400 group-hover:text-violet-300 relative z-10 transition-colors" />
                                        )}
                                    </button>
                                    <p className="text-sm text-white/40">
                                        {isRecording
                                            ? "Listening... click to stop"
                                            : "Click to start recording"}
                                    </p>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* ─── Upload Tab ────────────────────────────────────── */}
                    <TabsContent value="upload" className="p-8 mt-0">
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer ${dragOver
                                    ? "border-cyan-400 bg-cyan-500/10"
                                    : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*,video/mp4,video/webm"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                                    <p className="text-white/60 text-sm">
                                        Transcribing{" "}
                                        <span className="text-cyan-400">{uploadedFileName}</span>
                                        ...
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <FileAudio className="w-10 h-10 text-white/30" />
                                    <p className="text-white/50 text-sm">
                                        Drag & drop an audio file here, or{" "}
                                        <span className="text-cyan-400 underline underline-offset-2">
                                            browse
                                        </span>
                                    </p>
                                    <p className="text-white/25 text-xs">
                                        MP3, WAV, M4A, WebM, OGG, FLAC
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* ─── Error ───────────────────────────────────────────── */}
                {error && (
                    <div className="mx-8 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* ─── Transcript Output ───────────────────────────────── */}
                {(transcript || interimTranscript) && (
                    <div className="p-8 pt-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                                Transcript
                            </h3>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={copyToClipboard}
                                    disabled={!transcript}
                                    className="text-white/40 hover:text-white hover:bg-white/10 h-8 px-3 cursor-pointer"
                                >
                                    {copied ? (
                                        <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={downloadTranscript}
                                    disabled={!transcript}
                                    className="text-white/40 hover:text-white hover:bg-white/10 h-8 px-3 cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={clearTranscript}
                                    className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 px-3 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Clear
                                </Button>
                            </div>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 min-h-[120px] max-h-[400px] overflow-y-auto">
                            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                                {transcript}
                                {interimTranscript && (
                                    <span className="text-white/30 italic">
                                        {transcript ? " " : ""}
                                        {interimTranscript}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Footer */}
            <p className="mt-8 text-white/20 text-xs">
                Powered by Google Gemini &amp; Web Speech API
            </p>

            {/* Animation keyframes injected as inline style */}
            <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
        </div>
    );
}
