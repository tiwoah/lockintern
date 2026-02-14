"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useResume } from "@/context/ResumeContext";

type Props = {
  label?: string;
};

export function ResumeInput({ label = "Resume (PDF)" }: Props) {
  const id = React.useId();
  const { resumeFile, setResumeFile } = useResume();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }
    setResumeFile(file);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
      />
      {resumeFile && (
        <div className="text-sm text-muted-foreground">
          {resumeFile.name} • {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
        </div>
      )}
    </div>
  );
}
