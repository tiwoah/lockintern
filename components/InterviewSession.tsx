"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { blobToWavFile } from "@/utils/blobToWav";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Flag,
  Mic,
  PartyPopper,
  RotateCcw,
  User as UserIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";
import { getTranslations } from "@/lib/translations";

type Phase =
  | "setup"
  | "generating"
  | "question"
  | "recording"
  | "submitting"
  | "feedback"
  | "done";

interface FeedbackCategory {
  name: string;
  score: number;
  feedback: string;
}

interface StructuredFeedback {
  transcript?: string;
  categories: FeedbackCategory[];
  overall: string;
}

interface AnswerRecord {
  question: string;
  feedback: StructuredFeedback;
}

export default function InterviewSession() {
  // ── Setup state ──
  const [topic, setTopic] = useState("");
  const [company, setCompany] = useState("");
  const [questionCount, setQuestionCount] = useState(3);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [parsingResume, setParsingResume] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  // ── Webcam ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [isCamOn, setIsCamOn] = useState(false);

  // ── Meeting elapsed time ──
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  const meetingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Chat panel toggle ──
  const [isChatOpen, setIsChatOpen] = useState(true);

  // ── Feedback TTS mute ──
  const [isFeedbackMuted, setIsFeedbackMuted] = useState(false);

  const { lang } = useLanguage();
  const t = getTranslations(lang);

  // Sync TTS playing state with audio element (for AI “speaking” animation).
  // Use "playing" (not "play") so the animation starts when audio is actually audible, not when play() is called.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlaying = () => setIsTtsPlaying(true);
    const onPause = () => setIsTtsPlaying(false);
    const onEnded = () => setIsTtsPlaying(false);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

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
  const speak = useCallback(async (text: string, languageOverride?: "en" | "fr") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const ttsLang = languageOverride ?? lang;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, language: ttsLang }),
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
      el.muted = isFeedbackMuted;
      try {
        await el.play();
      } catch {
        /* ignore autoplay errors */
      }
    } catch {
      // TTS failure is non-critical
    }
  }, [lang, isFeedbackMuted]);

  // ── Stop any playing TTS audio ──
  const stopSpeaking = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      el.src = "";
    } catch {
      /* ignore */
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
          setError(parseData.error ?? t.failedToParseResume);
          setParsingResume(false);
          return;
        }
        currentResumeText = parseData.text;
        setResumeText(currentResumeText);
      } catch {
        setError(t.networkErrorParsing);
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
          company: company.trim() || undefined,
          count: questionCount,
          resumeText: currentResumeText || undefined,
          jobDescription: jobDescription.trim() || undefined,
          language: lang,
        }),
      });

      const data = (await res.json()) as {
        questions?: string[];
        error?: string;
      };

      if (!res.ok || !data.questions) {
        setError(data.error ?? t.failedToGenerateQuestions);
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
      setError(t.networkErrorGenerating);
      setPhase("setup");
    }
  }

  // ── Recording helpers ──
  async function startRecording() {
    setRecordingSeconds(0);
    chunksRef.current = [];

    // Capture question at start so we associate feedback with the right question
    // even if state updates before the async submit completes
    const questionIndexAtStart = currentIndex;
    const questionTextAtStart = questions[currentIndex] ?? "";
    const totalQuestionsAtStart = questions.length;

    if (!questionTextAtStart.trim()) {
      setError(t.noQuestionToAnswer);
      return;
    }

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

      // Submit with the question we were answering when recording started
      await submitAnswer(wavFile, questionIndexAtStart, questionTextAtStart, totalQuestionsAtStart);
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
  async function submitAnswer(
    audioFile: File,
    forQuestionIndex: number,
    questionText: string,
    totalQuestions: number
  ) {
    setPhase("submitting");
    setError("");

    if (!questionText.trim()) {
      setError(t.missingQuestion);
      setPhase("question");
      return;
    }

    try {
      const form = new FormData();
      form.append("question", questionText);
      form.append("questionIndex", String(forQuestionIndex + 1));
      form.append("totalQuestions", String(totalQuestions));
      form.append("language", lang);
      form.append("audio", audioFile);
      if (resumeText) form.append("resumeText", resumeText);
      if (jobDescription.trim())
        form.append("jobDescription", jobDescription.trim());
      if (company.trim()) form.append("company", company.trim());

      const res = await fetch("/api/interview/answer", {
        method: "POST",
        body: form,
      });

      const data = (await res.json()) as {
        feedback?: StructuredFeedback;
        error?: string;
      };

      if (!res.ok || !data.feedback) {
        setError(data.error ?? t.failedToEvaluate);
        setPhase("question");
        return;
      }

      setAnswers((prev) => [
        ...prev,
        { question: questionText, feedback: data.feedback! },
      ]);
      setPhase("feedback");
      setIsChatOpen(true); // ensure feedback panel is visible

      // Speak the overall feedback
      void speak(data.feedback.overall);
    } catch {
      setError(t.networkErrorSubmitting);
      setPhase("question");
    }
  }

  // ── Next question / Finish ──
  function nextQuestion() {
    stopSpeaking();

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
    stopSpeaking();
    setPhase("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setError("");
    setTopic("");
    setCompany("");
    setJobDescription("");
    setResumeFile(null);
    setResumeText("");
    setShowForm(false);
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

  // Resume TTS if the browser paused it (e.g. when toggling camera). Runs after a short delay.
  const resumeTtsIfPaused = useCallback(() => {
    const el = audioRef.current;
    if (el?.src && el.paused && !el.ended) {
      el.play().catch(() => {});
    }
  }, []);

  // ── Webcam toggle ──
  async function toggleCam() {
    if (isCamOn) {
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsCamOn(false);
      setTimeout(resumeTtsIfPaused, 50);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamStreamRef.current = stream;
        setIsCamOn(true);
        requestAnimationFrame(() => {
          if (videoRef.current && webcamStreamRef.current === stream) {
            videoRef.current.srcObject = stream;
          }
          setTimeout(resumeTtsIfPaused, 50);
        });
      } catch {
        // camera not available
      }
    }
  }

  // ── Leave meeting ──
  function leaveMeeting() {
    stopSpeaking();
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

      {/* Theme + language (language only when job form is open) — fixed so they don’t overlap meeting bar */}
      {!isMeetingView && (
        <div className="fixed top-3 right-3 z-[100] flex items-center gap-2">
          {phase === "setup" && showForm && <LanguageSwitcher />}
          <ThemeSwitcher />
        </div>
      )}

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} className="hidden" />

      {/* ════════════════════════════════════════════
          MEETING VIEW  (Teams-style)
         ════════════════════════════════════════════ */}
      {isMeetingView && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/30">
          {/* ─── TOP BAR ─── */}
          <div className="flex h-12 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                Lock<span className="text-primary">Intern</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">|</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {topic || t.interview} — Q{currentIndex + 1}/{questions.length || "…"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeSwitcher className="h-8 w-8" />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatTime(meetingSeconds)}
              </span>
            </div>
          </div>

          {/* ─── MAIN STAGE (participant tiles) ─── */}
          <div className="relative flex flex-1 items-center justify-center gap-4 overflow-hidden p-4 sm:p-6">
            {/* Error overlay */}
            {error && (
              <div className="absolute top-4 right-4 left-4 z-10 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="flex h-full w-full max-w-5xl flex-col gap-4 sm:flex-row">
              {/* ── AI Interviewer Tile ── */}
              <div
                className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${
                  isTtsPlaying ? "ring-2 ring-primary/30" : ""
                }`}
              >
                {/* AI name label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-muted/90 px-2.5 py-1 backdrop-blur-sm">
                  <span className="text-xs font-medium text-foreground">
                    {t.aiInterviewer}
                  </span>
                  {isTtsPlaying && (
                    <span className="flex h-4 items-end gap-[2px]">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="inline-block w-[3px] rounded-full bg-primary"
                          style={{
                            animationName: "sound-wave",
                            animationDuration: "0.6s",
                            animationTimingFunction: "ease-in-out",
                            animationIterationCount: "infinite",
                            animationDelay: `${i * 0.15}s`,
                            height: "4px",
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>

                {/* AI Avatar */}
                <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl text-primary-foreground shadow-lg shadow-primary/20 sm:h-32 sm:w-32 sm:text-5xl ${
                  isTtsPlaying ? "animate-float" : ""
                }`}>
                </div>

                {/* Question text overlay */}
                {phase !== "generating" && questions[currentIndex] && (
                  <div className="mt-6 max-w-md px-6 text-center">
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                      &ldquo;{questions[currentIndex]}&rdquo;
                    </p>
                  </div>
                )}

                {/* Generating / connecting state */}
                {phase === "generating" && (
                  <div className="mt-6 text-center">
                    <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    <p className="text-sm text-muted-foreground">{t.connecting}</p>
                  </div>
                )}
              </div>

              {/* ── User Tile ── */}
              <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {/* User name label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-muted/90 px-2.5 py-1 backdrop-blur-sm">
                  <span className="text-xs font-medium text-foreground">{t.you}</span>
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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted sm:h-32 sm:w-32">
                    <UserIcon className="h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" />
                  </div>
                )}

                {/* Recording overlay */}
                {phase === "recording" && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 backdrop-blur-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    <span className="font-mono text-xs font-semibold text-white">
                      REC {formatTime(recordingSeconds)}
                    </span>
                  </div>
                )}

                {/* Submitting overlay */}
                {phase === "submitting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
                    <p className="text-sm font-medium text-foreground">{t.evaluating}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── FEEDBACK PANEL (full screen overlay) ─── */}
          {phase === "feedback" && answers.length > 0 && isChatOpen && (
            <div className="absolute inset-0 z-20 flex flex-col bg-background/98 backdrop-blur-xl border-l border-border shadow-xl"
              style={{ animation: "slide-in-right 0.25s ease forwards" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t.feedback}</h2>
                  <p className="text-xs text-muted-foreground">{t.questionOf(currentIndex + 1, questions.length)}</p>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              {/* Body — transcript + score cards */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 bg-background">
                {/* Transcript */}
                {answers[answers.length - 1].feedback.transcript && (
                  <div className="mx-auto mb-4 max-w-3xl rounded-2xl bg-muted/50 border border-border p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">{t.yourAnswerTranscript}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground italic">
                      &ldquo;{answers[answers.length - 1].feedback.transcript}&rdquo;
                    </p>
                  </div>
                )}
                <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
                  {answers[answers.length - 1].feedback.categories.map((cat) => (
                    <div key={cat.name} className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{cat.name}</span>
                        <span className="text-sm font-bold text-foreground">{cat.score}/5</span>
                      </div>
                      <div className="mb-3 flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-3 flex-1 rounded-full ${
                              i <= cat.score
                                ? cat.score <= 1
                                  ? "bg-red-500"
                                  : cat.score <= 2
                                    ? "bg-orange-500"
                                    : cat.score <= 3
                                      ? "bg-yellow-500"
                                      : cat.score <= 4
                                        ? "bg-lime-500"
                                        : "bg-green-500"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      {cat.feedback && (
                        <p className="text-sm leading-relaxed text-muted-foreground">{cat.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
                {answers[answers.length - 1].feedback.overall && (
                  <div className="relative mx-auto mt-4 max-w-3xl rounded-2xl bg-primary/10 border border-primary/20 p-4 pl-12 text-sm leading-relaxed text-foreground">
                    <p>{answers[answers.length - 1].feedback.overall}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const el = audioRef.current;
                        if (el) {
                          const next = !isFeedbackMuted;
                          el.muted = next;
                          setIsFeedbackMuted(next);
                        }
                      }}
                      className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
                      aria-label={isFeedbackMuted ? t.unmuteFeedback : t.muteFeedback}
                      title={isFeedbackMuted ? t.unmuteFeedback : t.muteFeedback}
                    >
                      {isFeedbackMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              {/* Next / Finish button */}
              <div className="border-t border-border bg-card px-6 py-4">
                <div className="mx-auto max-w-3xl">
                  <button
                    onClick={nextQuestion}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {currentIndex + 1 < questions.length ? (
                      <>{t.nextQuestion}</>
                    ) : (
                      <>
                        <Flag className="h-4 w-4" /> {t.finishInterview}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── BOTTOM TOOLBAR ─── */}
          <div className="flex flex-col items-center gap-2 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
            {/* Progress pills */}
            <div className="flex items-center gap-1.5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i < currentIndex
                      ? "bg-green-500"
                      : i === currentIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/40"
                  }`}
                  title={`Question ${i + 1}`}
                />
              ))}
            </div>

            {/* Main buttons row */}
            <div className="flex items-center gap-3">
              {/* Mic / Record button */}
              {phase === "question" ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 rounded-xl bg-muted px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  <span>{t.startRecording}</span>
                </button>
              ) : phase === "recording" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span>{t.stopRecording}</span>
                </button>
              ) : (
                <button
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-muted/50 px-5 py-2.5 text-sm font-medium text-muted-foreground"
                  disabled
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  <span>{t.mic}</span>
                </button>
              )}

              {/* Camera toggle */}
              <button
                onClick={toggleCam}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                  isCamOn
                    ? "bg-muted text-foreground hover:bg-accent"
                    : "bg-muted/50 text-destructive hover:bg-destructive/10"
                }`}
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
                <span>{isCamOn ? t.cameraOn : t.cameraOff}</span>
              </button>

              {/* Chat toggle (feedback only) */}
              {phase === "feedback" && (
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                    isChatOpen
                      ? "bg-primary/20 text-primary hover:bg-primary/30"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
                  </svg>
                  <span>{t.feedback}</span>
                </button>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-border" />

              {/* Leave button */}
              <button
                onClick={leaveMeeting}
                className="flex items-center gap-2 rounded-xl bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                <span>{t.leave}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SETUP — Hackathon homepage (bubble → split)
         ════════════════════════════════════════════ */}
      {phase === "setup" && (
        <div className="font-gsans flex min-h-screen flex-col bg-background">
          

          {/* Viewport: bubble and form stages */}
          <div className={`hp-viewport${showForm ? " is-split" : ""}`}>
            {/* ── Flow 1: Thought Bubble ── */}
            <div className="hp-stage hp-stage--bubble">
              <button
                type="button"
                className="block cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit"
                aria-label={t.backToStart}
                onClick={() => setShowForm(true)}
              >
                <span className="thought-bubble">
                  <span className="bubble-shape">
                    <span className="bubble-logo">LockIntern</span>
                  </span>
                  <span className="bubble-dot bubble-dot--1" aria-hidden="true" />
                  <span className="bubble-dot bubble-dot--2" aria-hidden="true" />
                </span>
              </button>
            </div>

            {/* ── Flow 2: Card form (fades in after bubble click) ── */}
            <div className="hp-stage hp-stage--split">
              <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 sm:px-6">
                {/* Header */}
                <header className="text-center">
                  <button
                    type="button"
                    className="mb-2 inline-block cursor-pointer border-none bg-transparent p-0"
                    onClick={() => setShowForm(false)}
                    aria-label={t.backToStart}
                  >
                    <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                      Lock<span className="text-primary">Intern</span>
                    </h1>
                  </button>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.tagline}
                  </p>
                </header>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Setup card */}
                <Card className="shadow-lg shadow-primary/5">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm text-primary">
                        <ClipboardList className="h-4 w-4" />
                      </span>
                      {t.interviewSetup}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t.setupSubtitle}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-1">
                    {/* Role / Topic */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">
                        {t.roleTopic} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t.rolePlaceholder}
                        className="h-9"
                      />
                    </div>

                    {/* Company */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">
                        {t.company}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t.optional}
                        </span>
                      </label>
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder={t.companyPlaceholder}
                        className="h-9"
                      />
                    </div>

                    {/* Job Description */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">
                        {t.jobDescription}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t.optional}
                        </span>
                      </label>
                      <Textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder={t.jobDescriptionPlaceholder}
                        rows={3}
                        className="resize-none text-sm"
                      />
                    </div>

                    <Separator />

                    {/* Resume Upload */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">
                        {t.resume}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t.optionalPdf}
                        </span>
                      </label>
                      <div className="relative">
                        <label
                          htmlFor="resume-upload"
                          className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-primary/20 bg-primary/[0.02] p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm text-primary">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            {resumeFile ? (
                              <>
                                <p className="truncate text-sm font-medium">
                                  {resumeFile.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(resumeFile.size / 1024).toFixed(0)} KB — {t.clickToChange}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-muted-foreground">
                                  {t.clickToUpload}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t.pdfUpTo10}
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
                      <label className="text-xs font-semibold">
                        {t.numberOfQuestions}
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
                      className="h-10 w-full text-sm font-semibold shadow-lg shadow-primary/20"
                      size="default"
                    >
                      {parsingResume ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          {t.parsingResume}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {t.joinInterview}
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          DONE view
         ════════════════════════════════════════════ */}
      {phase === "done" && (
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
          {/* Summary header */}
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <PartyPopper className="mx-auto mb-3 h-12 w-12 shrink-0" />
              <h2 className="text-2xl font-bold">{t.interviewComplete}</h2>
              <p className="mt-2 text-primary-foreground/80">
                {t.youAnswered(answers.length, questions.length)}
              </p>
            </CardContent>
          </Card>

          {/* Per-question feedback cards */}
          {answers.map((a, i) => (
            <Card key={i} className="overflow-hidden shadow-md">
              <CardHeader className="pb-2">
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <CardTitle className="text-base leading-snug">
                  {a.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Transcript */}
                {a.feedback.transcript && (
                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-bold">{t.yourAnswerTranscript}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground italic">
                      &ldquo;{a.feedback.transcript}&rdquo;
                    </p>
                  </div>
                )}
                {a.feedback.categories.map((cat) => (
                  <div key={cat.name} className="rounded-xl bg-muted/60 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">{cat.name}</span>
                      <span className="text-sm font-bold">{cat.score}/5</span>
                    </div>
                    <div className="mb-2 flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-3 flex-1 rounded-full ${
                            i <= cat.score
                              ? cat.score <= 1
                                ? "bg-red-500"
                                : cat.score <= 2
                                  ? "bg-orange-500"
                                  : cat.score <= 3
                                    ? "bg-yellow-500"
                                    : cat.score <= 4
                                      ? "bg-lime-500"
                                      : "bg-green-500"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    {cat.feedback && (
                      <p className="text-xs leading-relaxed text-muted-foreground">{cat.feedback}</p>
                    )}
                  </div>
                ))}
                {a.feedback.overall && (
                  <div className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                    {a.feedback.overall}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Restart */}
          <Button
            onClick={restart}
            size="lg"
            className="h-12 w-full gap-2 text-base font-semibold shadow-lg shadow-primary/20"
          >
            <RotateCcw className="h-5 w-5" />
            {t.startNewInterview}
          </Button>
        </div>
      )}
    </div>
  );
}
