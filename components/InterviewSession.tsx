"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { blobToWavFile } from "@/utils/blobToWav";

type Phase =
  | "setup"
  | "generating"
  | "question"
  | "recording"
  | "submitting"
  | "feedback"
  | "done";

interface AnswerRecord {
  question: string;
  feedback: string;
}

export default function InterviewSession() {
  // ── Setup state ──
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(3);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [parsingResume, setParsingResume] = useState(false);

  // ── Interview state ──
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [error, setError] = useState("");

  // ── Recording state ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // ── TTS ──
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Webcam ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [isCamOn, setIsCamOn] = useState(false);

  // ── Meeting elapsed time ──
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  const meetingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Chat panel toggle ──
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (meetingIntervalRef.current) clearInterval(meetingIntervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Speak helper (TTS) ──
  const speak = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) return;

      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const el = audioRef.current;
      if (!el) return;

      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* ignore */
      }

      el.src = url;
      try {
        await el.play();
      } catch {
        /* ignore autoplay errors */
      }
    } catch {
      // TTS failure is non-critical
    }
  }, []);

  // ── Generate questions ──
  async function generateQuestions() {
    if (!topic.trim()) return;

    setError("");

    // If a resume file was selected but not yet parsed, parse it first
    let currentResumeText = resumeText;
    if (resumeFile && !currentResumeText) {
      setParsingResume(true);
      try {
        const form = new FormData();
        form.append("resume", resumeFile);
        const parseRes = await fetch("/api/interview/parse-resume", {
          method: "POST",
          body: form,
        });
        const parseData = (await parseRes.json()) as {
          text?: string;
          error?: string;
        };
        if (!parseRes.ok || !parseData.text) {
          setError(parseData.error ?? "Failed to parse resume.");
          setParsingResume(false);
          return;
        }
        currentResumeText = parseData.text;
        setResumeText(currentResumeText);
      } catch {
        setError("Network error parsing resume.");
        setParsingResume(false);
        return;
      }
      setParsingResume(false);
    }

    setPhase("generating");

    try {
      const res = await fetch("/api/interview/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          count: questionCount,
          resumeText: currentResumeText || undefined,
          jobDescription: jobDescription.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        questions?: string[];
        error?: string;
      };

      if (!res.ok || !data.questions) {
        setError(data.error ?? "Failed to generate questions.");
        setPhase("setup");
        return;
      }

      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setPhase("question");

      // Start meeting timer
      setMeetingSeconds(0);
      meetingIntervalRef.current = setInterval(() => {
        setMeetingSeconds((prev) => prev + 1);
      }, 1000);

      // Read the first question aloud
      void speak(data.questions[0]);
    } catch {
      setError("Network error generating questions.");
      setPhase("setup");
    }
  }

  // ── Recording helpers ──
  async function startRecording() {
    setRecordingSeconds(0);
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

      const wavFile = await blobToWavFile(webmBlob, "answer.wav");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      // Submit answer
      await submitAnswer(wavFile);
    };

    mr.start();
    setPhase("recording");

    intervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setPhase("submitting");
  }

  // ── Submit answer audio ──
  async function submitAnswer(audioFile: File) {
    setPhase("submitting");
    setError("");

    try {
      const form = new FormData();
      form.append("question", questions[currentIndex]);
      form.append("questionIndex", String(currentIndex + 1));
      form.append("totalQuestions", String(questions.length));
      form.append("audio", audioFile);
      if (resumeText) form.append("resumeText", resumeText);
      if (jobDescription.trim())
        form.append("jobDescription", jobDescription.trim());

      const res = await fetch("/api/interview/answer", {
        method: "POST",
        body: form,
      });

      const data = (await res.json()) as {
        feedback?: string;
        error?: string;
      };

      if (!res.ok || !data.feedback) {
        setError(data.error ?? "Failed to evaluate answer.");
        setPhase("question");
        return;
      }

      setAnswers((prev) => [
        ...prev,
        { question: questions[currentIndex], feedback: data.feedback! },
      ]);

      setPhase("feedback");

      // Speak the feedback
      void speak(data.feedback);
    } catch {
      setError("Network error submitting answer.");
      setPhase("question");
    }
  }

  // ── Next question / Finish ──
  function nextQuestion() {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      setPhase("done");
      return;
    }

    setCurrentIndex(nextIdx);
    setPhase("question");

    // Read the next question aloud
    void speak(questions[nextIdx]);
  }

  function restart() {
    setPhase("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setError("");
    setTopic("");
    setJobDescription("");
    setResumeFile(null);
    setResumeText("");
    // Stop meeting timer
    if (meetingIntervalRef.current) {
      clearInterval(meetingIntervalRef.current);
      meetingIntervalRef.current = null;
    }
    setMeetingSeconds(0);
    // Stop webcam
    webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    webcamStreamRef.current = null;
    setIsCamOn(false);
  }

  // ── Webcam toggle ──
  async function toggleCam() {
    if (isCamOn) {
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsCamOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCamOn(true);
      } catch {
        // camera not available
      }
    }
  }

  // ── Leave meeting ──
  function leaveMeeting() {
    if (meetingIntervalRef.current) {
      clearInterval(meetingIntervalRef.current);
      meetingIntervalRef.current = null;
    }
    webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    webcamStreamRef.current = null;
    setIsCamOn(false);
    // If there are answers, go to done, otherwise back to setup
    if (answers.length > 0) {
      setPhase("done");
    } else {
      restart();
    }
  }

  // ── Formatting helpers ──
  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  const isInterviewActive =
    phase === "question" ||
    phase === "recording" ||
    phase === "submitting" ||
    phase === "feedback";

  const isMeetingView = isInterviewActive || phase === "generating";

  // ── Render ──
  return (
    <div className="relative min-h-screen">
      {/* Gradient background — only on non-meeting views */}
      {!isMeetingView && (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/30" />
      )}

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} className="hidden" />

      {/* ════════════════════════════════════════════
          MEETING VIEW  (Teams-style)
         ════════════════════════════════════════════ */}
      {isMeetingView && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a2e]">
          {/* ─── TOP BAR ─── */}
          <div className="flex h-12 items-center justify-between border-b border-white/5 bg-[#1a1a2e] px-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">
                Lock<span className="text-[#7b6fe6]">Intern</span>
              </span>
              <span className="hidden text-xs text-white/40 sm:inline">|</span>
              <span className="hidden text-xs text-white/40 sm:inline">
                {topic || "Interview"} — Q{currentIndex + 1}/{questions.length || "…"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tabular-nums text-white/50">
                {formatTime(meetingSeconds)}
              </span>
            </div>
          </div>

          {/* ─── MAIN STAGE (participant tiles) ─── */}
          <div className="relative flex flex-1 items-center justify-center gap-4 overflow-hidden p-4 sm:p-6">
            {/* Error overlay */}
            {error && (
              <div className="absolute top-4 right-4 left-4 z-10 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300 backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="flex h-full w-full max-w-5xl flex-col gap-4 sm:flex-row">
              {/* ── AI Interviewer Tile ── */}
              <div
                className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#252547] to-[#1e1e3a] ${
                  phase === "question" || phase === "generating"
                    ? "ring-2 ring-[#7b6fe6]/40"
                    : ""
                }`}
              >
                {/* AI name label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/50 px-2.5 py-1 backdrop-blur-sm">
                  <span className="text-xs font-medium text-white/90">
                    AI Interviewer
                  </span>
                  {(phase === "question" || phase === "generating") && (
                    <span className="flex gap-[2px]">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="inline-block w-[3px] rounded-full bg-[#7b6fe6]"
                          style={{
                            animationName: "sound-wave",
                            animationDuration: "0.6s",
                            animationTimingFunction: "ease-in-out",
                            animationIterationCount: "infinite",
                            animationDelay: `${i * 0.15}s`,
                            minHeight: "3px",
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>

                {/* AI Avatar */}
                <div className={`${phase === "question" || phase === "generating" ? "animate-float" : ""}`}>
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#7b6fe6] to-[#5b4fc6] text-4xl shadow-lg shadow-[#7b6fe6]/20 sm:h-32 sm:w-32 sm:text-5xl">
                    🤖
                  </div>
                </div>

                {/* Question text overlay */}
                {phase !== "generating" && questions[currentIndex] && (
                  <div className="mt-6 max-w-md px-6 text-center">
                    <p className="text-sm leading-relaxed text-white/70 sm:text-base">
                      &ldquo;{questions[currentIndex]}&rdquo;
                    </p>
                  </div>
                )}

                {/* Generating / connecting state */}
                {phase === "generating" && (
                  <div className="mt-6 text-center">
                    <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#7b6fe6]" />
                    <p className="text-sm text-white/50">Connecting…</p>
                  </div>
                )}
              </div>

              {/* ── User Tile ── */}
              <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a2a4a] to-[#202040]">
                {/* User name label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/50 px-2.5 py-1 backdrop-blur-sm">
                  <span className="text-xs font-medium text-white/90">You</span>
                  {phase === "recording" && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  )}
                </div>

                {/* Webcam video (hidden if off) */}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`absolute inset-0 h-full w-full object-cover ${isCamOn ? "block" : "hidden"}`}
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Fallback avatar when cam is off */}
                {!isCamOn && (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4a4a6a] to-[#3a3a5a] text-4xl sm:h-32 sm:w-32 sm:text-5xl">
                    👤
                  </div>
                )}

                {/* Recording overlay */}
                {phase === "recording" && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-red-600/80 px-3 py-1 backdrop-blur-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    <span className="font-mono text-xs font-semibold text-white">
                      REC {formatTime(recordingSeconds)}
                    </span>
                  </div>
                )}

                {/* Submitting overlay */}
                {phase === "submitting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
                    <p className="text-sm font-medium text-white">Evaluating…</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── FEEDBACK CHAT PANEL (slides from right) ─── */}
          {phase === "feedback" && answers.length > 0 && isChatOpen && (
            <div className="absolute top-12 right-0 bottom-16 z-20 flex w-full flex-col border-l border-white/5 bg-[#1e1e38]/95 backdrop-blur-md sm:w-96"
              style={{ animation: "slide-in-right 0.3s ease forwards" }}
            >
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <span className="text-sm font-semibold text-white/90">Feedback</span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {/* Chat body */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7b6fe6]/20 text-sm">
                      🤖
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-white/5 p-3 text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                      {answers[answers.length - 1].feedback}
                    </div>
                  </div>
                </div>
              </div>
              {/* Next / Finish button */}
              <div className="border-t border-white/5 p-3">
                <button
                  onClick={nextQuestion}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#7b6fe6] font-semibold text-white transition-colors hover:bg-[#6b5fd6]"
                >
                  {currentIndex + 1 < questions.length ? (
                    <>Next Question →</>
                  ) : (
                    <>🏁 Finish Interview</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Feedback prompt when panel is closed */}
          {phase === "feedback" && !isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="absolute right-4 bottom-20 z-20 flex h-10 items-center gap-2 rounded-full bg-[#7b6fe6] px-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#6b5fd6]"
            >
              💬 View Feedback
            </button>
          )}

          {/* ─── BOTTOM TOOLBAR ─── */}
          <div className="flex h-16 items-center justify-center gap-2 border-t border-white/5 bg-[#1a1a2e] px-4 sm:gap-3">
            {/* Mic / Record button */}
            {phase === "question" ? (
              <button
                onClick={startRecording}
                className="teams-toolbar-btn bg-white/10 text-white hover:bg-white/20"
                title="Start recording"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>
            ) : phase === "recording" ? (
              <button
                onClick={stopRecording}
                className="teams-toolbar-btn bg-red-600 text-white hover:bg-red-700"
                title="Stop recording"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                className="teams-toolbar-btn cursor-not-allowed bg-white/5 text-white/30"
                disabled
                title="Mic"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>
            )}

            {/* Camera toggle */}
            <button
              onClick={toggleCam}
              className={`teams-toolbar-btn ${
                isCamOn
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-white/5 text-red-400 hover:bg-white/10"
              }`}
              title={isCamOn ? "Turn off camera" : "Turn on camera"}
            >
              {isCamOn ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.66 5H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 6.87v10.128" />
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              )}
            </button>

            {/* Chat toggle */}
            {phase === "feedback" && (
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`teams-toolbar-btn ${
                  isChatOpen
                    ? "bg-[#7b6fe6]/20 text-[#7b6fe6] hover:bg-[#7b6fe6]/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Toggle feedback chat"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
                </svg>
              </button>
            )}

            {/* Separator */}
            <div className="mx-1 h-8 w-px bg-white/10 sm:mx-2" />

            {/* Progress pills */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i < currentIndex
                      ? "bg-green-500"
                      : i === currentIndex
                        ? "bg-[#7b6fe6]"
                        : "bg-white/20"
                  }`}
                  title={`Question ${i + 1}`}
                />
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Leave button */}
            <button
              onClick={leaveMeeting}
              className="teams-toolbar-btn w-auto gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              title="Leave interview"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" x2="1" y1="1" y2="23" />
              </svg>
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SETUP + DONE views (normal layout)
         ════════════════════════════════════════════ */}
      {!isMeetingView && (
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
          {/* ─── HEADER ─── */}
          <header className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Lock<span className="text-primary">Intern</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Practice interviews with AI. Upload your resume, paste a job
              description, and get tailored questions &amp; feedback.
            </p>
          </header>

          {/* ─── ERROR ─── */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <span className="mt-0.5 text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ─── SETUP ─── */}
          {phase === "setup" && (
            <Card className="shadow-lg shadow-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-base">
                    📋
                  </span>
                  Interview Setup
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tell us about the role and optionally upload your resume for
                  personalized questions.
                </p>
              </CardHeader>

              <CardContent className="space-y-5 pt-2">
                {/* Role / Topic */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Role / Topic <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Frontend React Developer, Product Manager…"
                    className="h-11"
                  />
                </div>

                {/* Job Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Job Description{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here for more relevant questions…"
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Separator />

                {/* Resume Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Resume{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional, PDF)
                    </span>
                  </label>
                  <div className="relative">
                    <label
                      htmlFor="resume-upload"
                      className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-primary/20 bg-primary/[0.02] p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                        📄
                      </span>
                      <div className="min-w-0 flex-1">
                        {resumeFile ? (
                          <>
                            <p className="truncate text-sm font-medium">
                              {resumeFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(resumeFile.size / 1024).toFixed(0)} KB — Click
                              to change
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-muted-foreground">
                              Click to upload your resume
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PDF format, up to 10 MB
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setResumeFile(f);
                        setResumeText("");
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Question count */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">
                    Number of Questions
                  </label>
                  <div className="flex items-center gap-1">
                    {[3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                          questionCount === n
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start button */}
                <Button
                  onClick={generateQuestions}
                  disabled={!topic.trim() || parsingResume}
                  className="h-12 w-full text-base font-semibold shadow-lg shadow-primary/20"
                  size="lg"
                >
                  {parsingResume ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Parsing resume…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      🚀 Join Interview
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ─── DONE ─── */}
          {phase === "done" && (
            <div className="space-y-6">
              {/* Summary header */}
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20">
                <CardContent className="py-10 text-center">
                  <span className="mb-3 inline-block text-5xl">🎉</span>
                  <h2 className="text-2xl font-bold">Interview Complete!</h2>
                  <p className="mt-2 text-primary-foreground/80">
                    You answered{" "}
                    <span className="font-bold">{answers.length}</span> of{" "}
                    <span className="font-bold">{questions.length}</span>{" "}
                    questions. Here&apos;s your feedback:
                  </p>
                </CardContent>
              </Card>

              {/* Per-question feedback cards */}
              {answers.map((a, i) => (
                <Card key={i} className="overflow-hidden shadow-md">
                  <div
                    className="h-1"
                    style={{
                      background: `linear-gradient(to right, hsl(${260 + i * 20}, 60%, 55%), hsl(${280 + i * 20}, 50%, 65%))`,
                    }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <CardTitle className="text-base leading-snug">
                        {a.question}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl bg-muted/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {a.feedback}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Restart */}
              <Button
                onClick={restart}
                size="lg"
                className="h-12 w-full gap-2 text-base font-semibold shadow-lg shadow-primary/20"
              >
                <span className="text-lg">🔄</span>
                Start New Interview
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
