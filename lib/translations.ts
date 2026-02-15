import type { Lang } from "@/context/LanguageContext";

export const translations = {
  en: {
    // Meeting / top bar
    interview: "Interview",
    questionOf: (current: number, total: number) => `Question ${current} of ${total}`,
    aiInterviewer: "AI Interviewer",
    you: "You",
    feedback: "Feedback",
    nextQuestion: "Next Question →",
    finishInterview: "Finish Interview",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    mic: "Mic",
    cameraOn: "Camera On",
    cameraOff: "Camera Off",
    leave: "Leave",
    connecting: "Connecting…",
    evaluating: "Evaluating…",
    yourAnswerTranscript: "Your Answer (Transcript)",
    overallFeedback: "Detailed Feedback",
    muteFeedback: "Mute",
    unmuteFeedback: "Unmute",

    // Setup / home
    tagline: "Practice interviews with AI. Upload your resume, paste a job description, and get tailored questions & feedback.",
    backToStart: "Back to start",
    interviewSetup: "Interview Setup",
    setupSubtitle: "Tell us about the role and optionally upload your resume.",
    roleTopic: "Role / Topic",
    rolePlaceholder: "e.g. Frontend React Developer, Product Manager…",
    company: "Company",
    optional: "(optional)",
    companyPlaceholder: "e.g. Stripe, Netflix, OpenAI…",
    jobDescription: "Job Description",
    jobDescriptionPlaceholder: "Paste or type the job description here…",
    resume: "Resume",
    optionalPdf: "(optional, PDF)",
    clickToUpload: "Click to upload your resume",
    clickToChange: "Click to change",
    pdfUpTo10: "PDF format, up to 10 MB",
    numberOfQuestions: "Number of Questions",
    joinInterview: "Join Interview",
    parsingResume: "Parsing resume…",

    // Done
    interviewComplete: "Interview Complete!",
    youAnswered: (count: number, total: number) =>
      `You answered ${count} of ${total} questions. Here's your feedback:`,
    startNewInterview: "Start New Interview",

    // Errors (keep in UI language)
    noQuestionToAnswer: "No question to answer.",
    missingQuestion: "Missing question.",
    failedToParseResume: "Failed to parse resume.",
    failedToGenerateQuestions: "Failed to generate questions.",
    networkErrorParsing: "Network error parsing resume.",
    networkErrorGenerating: "Network error generating questions.",
    failedToEvaluate: "Failed to evaluate answer.",
    networkErrorSubmitting: "Network error submitting answer.",
  },
  fr: {
    interview: "Entretien",
    questionOf: (current: number, total: number) => `Question ${current} sur ${total}`,
    aiInterviewer: "Intervieweur IA",
    you: "Vous",
    feedback: "Commentaires",
    nextQuestion: "Question suivante →",
    finishInterview: "Terminer l'entretien",
    startRecording: "Démarrer l'enregistrement",
    stopRecording: "Arrêter l'enregistrement",
    mic: "Micro",
    cameraOn: "Caméra activée",
    cameraOff: "Caméra désactivée",
    leave: "Quitter",
    connecting: "Connexion…",
    evaluating: "Évaluation…",
    yourAnswerTranscript: "Votre réponse (transcription)",
    overallFeedback: "Commentaire détaillé",
    muteFeedback: "Couper le son",
    unmuteFeedback: "Rétablir le son",

    tagline: "Entraînez-vous aux entretiens avec l'IA. Uploadez votre CV, collez une offre, et recevez des questions et retours personnalisés.",
    backToStart: "Retour au début",
    interviewSetup: "Préparation de l'entretien",
    setupSubtitle: "Parlez-nous du poste et uploadez éventuellement votre CV.",
    roleTopic: "Poste / Sujet",
    rolePlaceholder: "ex. Développeur React, Chef de produit…",
    company: "Entreprise",
    optional: "(optionnel)",
    companyPlaceholder: "ex. Stripe, Netflix, OpenAI…",
    jobDescription: "Description du poste",
    jobDescriptionPlaceholder: "Collez ou écrivez l'offre d'emploi ici…",
    resume: "CV",
    optionalPdf: "(optionnel, PDF)",
    clickToUpload: "Cliquez pour ajouter votre CV",
    clickToChange: "Cliquez pour modifier",
    pdfUpTo10: "PDF, 10 Mo max",
    numberOfQuestions: "Nombre de questions",
    joinInterview: "Rejoindre l'entretien",
    parsingResume: "Analyse du CV…",

    interviewComplete: "Entretien terminé !",
    youAnswered: (count: number, total: number) =>
      `Vous avez répondu à ${count} question${count > 1 ? "s" : ""} sur ${total}. Voici vos retours :`,
    startNewInterview: "Nouvel entretien",

    noQuestionToAnswer: "Aucune question à laquelle répondre.",
    missingQuestion: "Question manquante.",
    failedToParseResume: "Impossible d'analyser le CV.",
    failedToGenerateQuestions: "Impossible de générer les questions.",
    networkErrorParsing: "Erreur réseau lors de l'analyse du CV.",
    networkErrorGenerating: "Erreur réseau lors de la génération des questions.",
    failedToEvaluate: "Impossible d'évaluer la réponse.",
    networkErrorSubmitting: "Erreur réseau lors de l'envoi.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslations(lang: Lang) {
  return translations[lang];
}