"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Briefcase, Coffee, Sparkles } from "lucide-react";

const loadingMessages = [
  { icon: FileText, text: "Reading your resume...", delay: 800 },
  { icon: Briefcase, text: "Reviewing job description...", delay: 1200 },
  { icon: Coffee, text: "Taking a sip of coffee...", delay: 1000 },
  { icon: Sparkles, text: "Preparing thoughtful questions...", delay: 1500 },
  { icon: FileText, text: "Analyzing your experience...", delay: 1000 },
  { icon: Briefcase, text: "Matching skills to requirements...", delay: 1200 },
];

export function InterviewLoading() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let messageTimeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const showNextMessage = () => {
      setIsVisible(false);
      
      messageTimeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % loadingMessages.length;
        setCurrentMessageIndex(currentIndex);
        setIsVisible(true);

        const currentMessage = loadingMessages[currentIndex];
        timeoutId = setTimeout(showNextMessage, currentMessage.delay);
      }, 300); // Fade out duration
    };

    // Start the cycle
    const firstMessage = loadingMessages[0];
    timeoutId = setTimeout(showNextMessage, firstMessage.delay);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(messageTimeoutId);
    };
  }, []);

  const currentMessage = loadingMessages[currentMessageIndex];
  const Icon = currentMessage.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <div
          className={`transition-opacity duration-300 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Icon className="h-6 w-6 text-muted-foreground" />
            <p className="text-xl font-medium">{currentMessage.text}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Please wait while we prepare your interview...
        </p>
      </div>
    </div>
  );
}
