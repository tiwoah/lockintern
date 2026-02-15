# LockIntern

## Inspiration

As students, we weren't prepared for our first interviews. We didn’t know how to structure answers, explain our experience clearly, or tell what interviewers wanted. When we got ghosted, we had no feedback loop. So we built LockIntern to simulate real interviews and give instant, actionable feedback in a safe space.

## What it does

LockIntern is an AI-powered interview simulation platform that provides a realistic interview experience with instant, detailed feedback. Users can:

- **Upload their resume** and paste a job description to get personalized interview questions
- **Practice in a meeting-style interface** (similar to Google Meet) with optional webcam support
- **Record their answers** to questions, which are automatically transcribed and analyzed
- **Receive structured feedback** across four key dimensions: Relevance, Clarity, Depth, and Confidence
- **Get actionable advice** on how to improve their answers, with specific suggestions for what an ideal response would include
- **See their progress** through a visual progress tracker and comprehensive feedback summary

The platform uses Google Gemini's multimodal capabilities to understand audio responses, transcribe speech, and provide nuanced feedback that helps users identify exactly where they can improve.

## How we built it

**Frontend & Backend**

* **Next.js 16**: One codebase for the UI and server-side API routes
* **TypeScript**: Type safety
* **Tailwind CSS**: UI Styling

**AI & Speech**

* **Google Gemini API (`gemini-2.5-flash`)**: Generates interview questions, parses PDF resumes with multimodal input, and evaluates answers with actionable feedback
* **ElevenLabs (TTS Multilingual v2)**: Text-to-speech to read questions out loud


**Key Features:**
- Audio recording using Web Audio API and MediaRecorder
- Real-time transcription and feedback
- Structured JSON responses from AI for consistent feedback format
- Meeting-style UI with video support
- Progress tracking and visual feedback indicators

## Challenges we ran into

1. **Audio Processing Complexity**: Converting WebM recordings to WAV format for compatibility with Gemini's audio processing, and handling different browser audio formats.

2. **Structured AI Responses**: Getting Gemini to consistently return properly formatted JSON for feedback categories without markdown code fences or extra text required careful prompt engineering and multiple parsing fallbacks.

3. **State Management**: Managing the complex interview flow (setup → generating → question → recording → submitting → feedback → done) with proper cleanup of media streams and timers.

4. **Real-time Feedback**: Balancing the need for thorough evaluation with response time, ensuring users get detailed feedback quickly without feeling like they're waiting too long.

5. **Resume Parsing**: Extracting clean, structured text from PDF resumes using Gemini's vision capabilities while preserving important context like skills and experience.

6. **UI/UX for Interview Simulation**: Creating a meeting-style interface that feels professional and realistic while maintaining usability and clear visual feedback about interview progress.

## Accomplishments that we're proud of

1. **Comprehensive Feedback System**: Built a structured feedback system that evaluates answers across four dimensions (Relevance, Clarity, Depth, Confidence) with specific, actionable advice—not just generic tips.

2. **Personalized Question Generation**: Successfully integrated resume parsing and job description analysis to generate truly personalized interview questions that reference specific experiences and skills.

3. **Realistic Interview Experience**: Created a meeting-style interface that mimics real video interview platforms, making practice feel authentic and helping users get comfortable with the format.

4. **Multimodal AI Integration**: Leveraged Gemini's multimodal capabilities to handle PDF parsing, audio transcription, and intelligent feedback generation all in one seamless flow.

5. **Professional UI/UX**: Designed a polished, intuitive interface with smooth transitions, visual progress indicators, and clear feedback presentation that makes the experience engaging rather than intimidating.

6. **Complete Interview Flow**: Built an end-to-end solution from setup to completion, including error handling, loading states, and a comprehensive summary view.

## What we learned

1. **Multimodal AI Capabilities**: Deep dive into how Gemini handles different input types (text, PDF, audio) and how to structure prompts for consistent, structured outputs.

2. **Audio Processing in Web Apps**: Learned about MediaRecorder API, audio format conversion, and how to handle browser-specific audio codecs and limitations.

3. **Complex State Management**: Gained experience managing intricate application flows with multiple phases, media streams, and cleanup requirements.

4. **Prompt Engineering**: Discovered the importance of detailed, structured prompts for getting reliable JSON responses from LLMs, including handling edge cases like empty audio or vague answers.

5. **User Experience Design**: Learned how to create engaging, non-intimidating interfaces for high-stakes scenarios like interview practice, balancing professionalism with approachability.

6. **Real-time Feedback Systems**: Explored how to provide meaningful, detailed feedback quickly while maintaining quality and accuracy.

## What's next for LockIntern

* **Public Deployment**
  Move from local prototype to a secure, scalable production environment. Implement authentication, data storage, and session persistence so users can track progress over time.

* **Video Analysis**
  Add computer vision to analyze posture, eye contact, facial expressions, and speaking pace. Provide structured feedback on non-verbal communication alongside verbal response scoring.

* **Technical Question Engine**
  Integrate algorithm and system design questions similar to LeetCode-style prompts. Add automated evaluation for code correctness, efficiency, and clarity, with detailed feedback.

* **Interview History & Analytics**
  Store past interviews and responses. Provide longitudinal performance metrics, trend analysis, and targeted improvement suggestions based on recurring weaknesses.

* **Investor Outreach**
  Prepare a clear pitch deck, usage metrics, and early user validation data. Pursue seed funding to support model costs, infrastructure, and product development.
