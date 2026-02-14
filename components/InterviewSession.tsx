"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { blobToWavFile } from "@/utils/blobToWav";

type Phase = "setup" | "generating" | "question" | "recording" | "submitting" | "feedback" | "done";

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
      } catch { /* ignore */ }

      el.src = url;
      try {
        await el.play();
      } catch { /* ignore autoplay errors */ }
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
        const parseData = (await parseRes.json()) as { text?: string; error?: string };
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

      const data = (await res.json()) as { questions?: string[]; error?: string };

      if (!res.ok || !data.questions) {
        setError(data.error ?? "Failed to generate questions.");
        setPhase("setup");
        return;
      }

      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setPhase("question");

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
      if (jobDescription.trim()) form.append("jobDescription", jobDescription.trim());

      const res = await fetch("/api/interview/answer", {
        method: "POST",
        body: form,
      });

      const data = (await res.json()) as { feedback?: string; error?: string };

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
  }

  // ── Formatting helpers ──
  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  const progressPercent =
    questions.length > 0
      ? Math.round(((phase === "done" ? questions.length : currentIndex) / questions.length) * 100)
      : 0;

  // ── Render ──
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">LockIntern</h1>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} className="hidden" />

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ─── SETUP ─── */}
      {phase === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle>Start an Interview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role / Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Frontend React Developer, Product Manager…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Job Description <span className="text-muted-foreground">(optional)</span></label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here…"
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Resume <span className="text-muted-foreground">(optional, PDF)</span></label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setResumeFile(f);
                  setResumeText(""); // reset parsed text when a new file is chosen
                }}
              />
              {resumeFile && (
                <p className="text-xs text-muted-foreground">
                  {resumeFile.name} • {(resumeFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Questions:</label>
              <select
                className="rounded-md border px-3 py-1.5 text-sm"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
              >
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>

            <Button onClick={generateQuestions} disabled={!topic.trim() || parsingResume}>
              {parsingResume ? "Parsing resume…" : "Generate Questions"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── GENERATING ─── */}
      {phase === "generating" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Generating interview questions…
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── QUESTION / RECORDING / SUBMITTING / FEEDBACK ─── */}
      {(phase === "question" || phase === "recording" || phase === "submitting" || phase === "feedback") && (
        <>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} />
          </div>

          <Card>
            <CardHeader>
              <Badge variant="outline" className="w-fit">
                Q{currentIndex + 1}
              </Badge>
              <CardTitle className="text-lg">
                {questions[currentIndex]}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Record / Stop controls */}
              {phase === "question" && (
                <Button onClick={startRecording}>🎙️ Record Answer</Button>
              )}

              {phase === "recording" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-sm">
                      {formatTime(recordingSeconds)}
                    </span>
                  </div>
                  <Button variant="destructive" onClick={stopRecording}>
                    ⏹ Stop Recording
                  </Button>
                </div>
              )}

              {phase === "submitting" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Evaluating your answer…
                </div>
              )}

              {phase === "feedback" && answers.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                    {answers[answers.length - 1].feedback}
                  </div>

                  <Button onClick={nextQuestion}>
                    {currentIndex + 1 < questions.length
                      ? "Next Question →"
                      : "Finish Interview"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── DONE ─── */}
      {phase === "done" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Complete 🎉</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You answered {answers.length} of {questions.length} questions.
                Here&apos;s your feedback summary:
              </p>
            </CardContent>
          </Card>

          {answers.map((a, i) => (
            <Card key={i}>
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Q{i + 1}
                </Badge>
                <CardTitle className="text-base">{a.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                  {a.feedback}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={restart} className="w-full">
            Start New Interview
          </Button>
        </div>
      )}
    </div>
  );
}
