"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useJobDescription } from "@/context/JobDescriptionContext";

type Props = {
  label?: string;
  placeholder?: string;
  rows?: number;
};

export function JobDescriptionInput({
  label = "Job description",
  placeholder = "Paste the job description here…",
  rows = 10,
}: Props) {
  const id = React.useId();
  const { jobDescription, setJobDescription } = useJobDescription();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}
