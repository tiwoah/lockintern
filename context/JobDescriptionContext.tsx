"use client";

import { createContext, useContext, useState } from "react";

type JobDescriptionContextType = {
  jobDescription: string;
  setJobDescription: (value: string) => void;
};

const JobDescriptionContext = createContext<JobDescriptionContextType | null>(
  null,
);

const DEFAULT_JOB_DESCRIPTION = `What we are looking for:

An applicant for this position should possess the following skills:

- Strong analytical skills to identify, retrieve, evaluate data.
- Knowledge of Java, Python
- Knowledge of Agile Methodologies.
- Knowledge of SQL.
- Understanding of relational databases
- Experience with Git and platforms like GitHub
- Understanding of file types like CSV, JSON, Parquet, etc.
- Ability to debug simple data pipeline issues
- Strong communication skills (both oral & written) to present/relay information, provide updates etc. in a clear and concise manner.
- Strong problem-solving skills to work with and support the team with identifying issues and solutions for recommendation.
- Excellent collaboration and interpersonal skills to work co-operatively and collaboratively to achieve group and organizational goals.
- Working knowledge of productivity software such as Microsoft Word, Excel and PowerPoint, Microsoft SharePoint, and Microsoft Teams etc.`;

export function JobDescriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB_DESCRIPTION);

  return (
    <JobDescriptionContext.Provider
      value={{ jobDescription, setJobDescription }}
    >
      {children}
    </JobDescriptionContext.Provider>
  );
}

export function useJobDescription() {
  const context = useContext(JobDescriptionContext);
  if (!context) {
    throw new Error(
      "useJobDescription must be used within JobDescriptionProvider",
    );
  }
  return context;
}
