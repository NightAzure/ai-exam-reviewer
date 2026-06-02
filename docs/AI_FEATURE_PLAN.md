> **Historical note (2026-06):** Many items below are now implemented (diagnostics, flashcards, assessment review, AI notes, question generation). Kept for product context — not a current implementation checklist.

# AI Feature Plan — Exam Reviewer Platform

> Written: 2026-03-25 | Updated: 2026-03-26
> Context: The platform has a working RAG-backed AI (Qwen 14B + FAISS, ~1,223 questions across 11 subjects), a full assessment engine, a notes system, per-student analytics, and a chat UI. The core AI is **only wired to chat right now**. This document is the plan for making it the engine behind everything else.

---

## Section 0 — UX Foundation: The Student Loop

> **This section answers the question: "What should a student experience when using this as an exam reviewer?"**
> It must be read before any feature is built, because every feature is an entry point into this loop.

---

### The Core Loop

Every meaningful exam review system drives a single repeating cycle:

```
DIAGNOSE  →  STUDY  →  PRACTICE  →  REVIEW MISTAKES  →  (back to DIAGNOSE)
    ↑___________________________________________________|
```

| Stage | What it means | Current state | What's needed |
|---|---|---|---|
| **Diagnose** | Know what you're weak at | ⚠️ Analytics exist but no mastery labels, no topic drill-down | Mastery levels + topic detail view |
| **Study** | Review concepts before/after practicing | ❌ Notes exist but are manual, no AI, no topic association | AI-generated topic notes, chat-to-notes |
| **Practice** | Answer questions — low-stakes, fast | ❌ Only formal assessments (high-commitment) | Quick practice mode per topic |
| **Review Mistakes** | Understand *why* you were wrong | ❌ Score shown, no explanation | Post-assessment AI review |
| **Repeat** | See progress, get told what's next | ⚠️ Progress bars but no actionable "what's next" | AI-suggested next step, mastery history |

**The biggest gap:** Everything between Practice and Diagnose is missing. The student takes an assessment, sees a number, and has no path forward.

---

### What a Student Should Experience on the Course Page

The course page is the **home base** of the loop. It should answer one question immediately: **"What should I do right now?"**

#### Current course page problems:
1. **Topics are passive** — progress bars you can look at but not act on
2. **The AI banner just says "go chat"** — no specific entry point, no context
3. **Assessments tab mixes formal exams with practice** — different commitments, shouldn't coexist
4. **No "what to do next"** — student has to figure it out themselves
5. **No feedback loop** — after completing an assessment, the course page doesn't change meaningfully

#### Proposed course page layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Course name · Overall exam readiness % · Progress bar      │
├─────────────────────────────────────────────────────────────────────┤
│  AI NEXT STEP BANNER (full width — most important)                  │
│  "Your weakest topic is [X] at 38%. Suggested: 10-min practice."    │
│  [Start Practice] [Generate Study Notes] [Ask AI about this]        │
├────────────────────────┬────────────────────────────────────────────┤
│  LEFT COLUMN           │  RIGHT COLUMN                              │
│                        │                                            │
│  TOPIC MASTERY GRID    │  TABS: Assessments | Notes                 │
│  (cards per topic,     │  (assessments = formal only;               │
│   sorted weakest first)│   quick practice lives in topic cards)     │
│                        │                                            │
│  MASTERY OVERVIEW      │                                            │
│  (strengths/weaknesses │                                            │
│   as before)           │                                            │
└────────────────────────┴────────────────────────────────────────────┘
```

---

### Topic Cards — The Missing Interactive Unit

Topics are currently progress bars. They need to become **action cards**. Each topic card should show:

```
┌────────────────────────────────────────────────┐
│  Thermodynamics                [Needs Work 🔴]  │
│  ████░░░░░░░░░░░░░░  38%                       │
│  12 questions seen · Last practiced 3 days ago │
│  [Quick Practice ▶] [Study Notes 📄]            │
└────────────────────────────────────────────────┘
```

- **Sort order:** weakest first — so the student's attention lands on gaps, not strengths
- **Quick Practice:** launches a 5-10 question mini-quiz filtered to that topic (uses `question_bank` filtered by subject)
- **Study Notes:** opens existing notes for this topic, or prompts to generate AI notes if none exist
- **Clicking the card itself:** opens a Topic Detail Panel (see below)

**Mastery labels** (replaces raw %, more intuitive):

| Score | Label | Color |
|---|---|---|
| 0–39% | Needs Work | Red |
| 40–59% | Getting There | Orange |
| 60–74% | Almost There | Yellow |
| 75–89% | Proficient | Blue |
| 90–100% | Mastered | Green |

---

### Topic Detail Panel (slide-out sheet)

When a student clicks a topic card, a side sheet opens:

```
Topic: Thermodynamics
━━━━━━━━━━━━━━━━━━━━━━━━━━
Mastery:   [████░░] 38% — Needs Work
Questions: 12 answered, 5 correct

RECENT PERFORMANCE (mini bar chart — last 5 attempts)
35% → 40% → 32% → 50% → 38%

ASSESSMENTS THAT COVERED THIS TOPIC
  • Midterm Mock 1 — 3/8 correct (Mar 18)
  • Quiz 2 — 2/4 correct (Mar 22)

COMMON MISTAKES
  "Most of your wrong answers were on heat transfer.
   You also missed questions about entropy."   ← AI-generated, from wrong answer patterns

ACTIONS
  [Practice 10 Questions on This Topic]
  [Generate Study Notes for Thermodynamics]
  [Ask AI Tutor about Thermodynamics]
```

This panel is pure data assembly — all of it already exists in the DB (`assessment_attempt_answers` filtered by subject + topic). The AI summary of common mistakes is one small call, can be cached.

---

### The "What's Next" AI Widget

This is the most impactful single addition to the course page. It replaces the generic AI CTA banner with something specific and personalized:

> **"Based on your last 3 assessments:**
> Focus on **Thermodynamics** next — you've answered 5/13 questions correctly there.
> [Start 10-min Practice] [Generate Study Notes] [Ask AI Tutor]"

**How it works:**
1. Pull the student's weakest topic (lowest mastery score) from analytics
2. Check when they last practiced it (from `assessment_attempt_answers`, filter by subject + recent)
3. Compose the suggestion server-side and cache it for 1 hour
4. If they just did an assessment, the AI pulls from the wrong answers directly

This is NOT a big AI call — it's templated logic with the AI only filling in the suggestion sentence. Fast, predictable, specific.

---

### The Post-Assessment Flow (Fixing the Broken Feedback Loop)

Currently: Student submits → sees score → nothing.

This is the most broken part of the experience. The fix:

```
SUBMIT ASSESSMENT
       ↓
  Score screen
  "You scored 7/15 (47%)"
       ↓
  [Review Mistakes with AI]   ← new button, most prominent
       ↓
  Per-question AI breakdown:
  ┌─────────────────────────────────────────────────────┐
  │ Q3 — What is the unit of entropy?                   │
  │ You answered: Joules   ✗                            │
  │ Correct: Joules per Kelvin (J/K)                    │
  │                                                     │
  │ Why you were wrong:                                 │
  │ "Entropy is a measure of energy dispersal per unit  │
  │  temperature, so the unit includes temperature..."  │
  │                                                     │
  │ [Save explanation as note] [Practice this topic]    │
  └─────────────────────────────────────────────────────┘
       ↓
  "Back to course" → course page now shows updated mastery
```

Each question card in the review has:
- The question + your answer + correct answer
- AI explanation of the concept (streamed)
- "Save as note" → one click saves to course notes
- "Practice this topic" → launches topic quick practice

---

### Quick Practice vs. Formal Assessments

These are **fundamentally different things** and should not live in the same tab.

| | Quick Practice | Formal Assessment |
|---|---|---|
| Entry point | Topic card | Assessments tab |
| Length | 5–10 questions | Instructor-set |
| Timer | No | Optional |
| Score saved | No (or optional) | Yes, always |
| AI hints | Always available | Instructor toggleable |
| Post-review | Immediate per-question | Full AI review |
| Purpose | Low-stakes drilling | Measurement |

Quick practice can be built as a lightweight mode on top of the existing assessment engine. Questions are pulled from `question_bank` filtered by `subject`. No new DB schema needed.

---

### How Topics Become the Organizing Unit

Everything in the platform should be anchored to a topic:

- **Notes** → each note should be optionally linked to a topic
- **Assessments** → each question is tagged with a subject (already in `assessment_attempt_answers.subject`)
- **AI chat** → pre-fill the conversation with the topic context
- **Generated notes** → scoped to a topic
- **Mastery levels** → computed per topic
- **AI recommendations** → always reference a specific topic, never generic

Currently topics are just a display list. The schema already supports `topic_id` on `course_notes`, and `subject` on answer records. The wiring just needs to be done.

---

### Empty State Strategy

New students with no assessment history see everything as "No data yet." This kills the experience.

**Onboarding flow when a student first joins a course:**
1. Show a prompt: "Let's find out where you stand. Take a quick 10-question diagnostic quiz."
2. The diagnostic covers all topics (1–2 questions each from `question_bank`)
3. Results immediately populate mastery levels
4. Course page now shows real data

This is a lightweight assessment — same engine, just auto-generated and auto-presented on first visit.

---

## What We Have vs. What's Missing

| Area | Status |
|---|---|
| AI Chat (per course, per thread) | ✅ Working |
| RAG question retrieval (FAISS + SQLite) | ✅ Working |
| Assessment engine (manual + random question mode) | ✅ Working |
| Notes (CRUD, markdown content, per user) | ✅ CRUD only — no AI, no rendering |
| Mastery / progress | ⚠️ Analytics exist but no mastery levels, no adaptation |
| AI quiz generation | ❌ Not built |
| AI note generation | ❌ Not built |
| AI in assessments (hints, feedback) | ❌ Not built |
| Student-facing mastery dashboard | ❌ Not built |
| AI-aware chat (knows student's weak areas) | ❌ Not built |

---

## Guiding Principles

1. **AI should be a layer on top of existing data** — don't replace the question bank, enhance it.
2. **Solve generation time upfront** — async where needed, streaming where possible, cache aggressively.
3. **Every AI action should degrade gracefully** — if the model is down, the platform still works.
4. **Keep the student experience linear** — don't overwhelm with features. Surface AI naturally inside existing flows.
5. **Ground truth is the RAG database** — the AI should never invent facts. All generated content passes through the FAISS retrieval step.

---

## Priority 1 — Features That Unlock the Core Value

These are the minimum set that makes the platform genuinely useful as an AI exam reviewer.

---

### 1.1 Post-Assessment AI Review

**What it is:** After a student submits an assessment, they get a personalized AI-written breakdown of every wrong answer — not just "this was wrong," but *why*, with a reference to related concepts.

**Why first:** The assessment engine is fully built. This is just one new endpoint + one new UI component. Maximum impact, minimum build time.

**How it works:**
1. Student submits assessment → score is saved as now
2. A new button appears: "Review with AI"
3. On click → call a new `/api/ai/assessment-review` endpoint
4. The endpoint:
   - Pulls the student's `assessment_attempt_answers` for that attempt (wrong answers only)
   - For each wrong answer, queries RAG with the question text to retrieve related problems
   - Sends to Qwen: `"Student answered X for this question. Correct answer is Y. Using these related problems as context [RAG results], explain why Y is correct and what concept the student likely misunderstood."`
   - Streams the response back
5. UI renders it as a per-question expandable review card

**Generation time solution:** Stream the response. The student sees the first question reviewed in ~2 seconds. No waiting for the whole thing to complete.

**Storage:** Save the review to a new `assessment_reviews` table (keyed by `attempt_id`). Regenerating it is free — just re-call the endpoint.

---

### 1.2 AI Hints During Assessments

**What it is:** During an active quiz, the student can press a "Get a Hint" button on any question. The AI gives a Socratic hint — it guides without giving away the answer.

**Why second:** Students already use the chat for help. This brings the help to where the question is, with context automatically injected.

**How it works:**
1. Add a hint button to `QuestionCard.tsx`
2. On click → opens a small drawer/popover (not a full page nav)
3. Calls `/api/ai/hint` with `{ questionText, options, subject }`
4. Backend queries RAG for the question, then sends to Qwen:
   `"A student is stuck on this multiple choice question: [question]. Do NOT reveal the answer. Instead, ask a guiding question or give a conceptual reminder that helps them reason toward the answer."`
5. Response streams into the popover
6. Hint usage is tracked per attempt per question (for analytics later)

**Notes:**
- Hints are optional — instructors can disable them per assessment
- Hint count can be capped (e.g., max 2 hints per question)
- The system prompt explicitly forbids direct answers

---

### 1.3 AI-Aware Chat (Context Injection)

**What it is:** The chat already works. This makes it *smarter* by telling the AI who the student is and where they struggle, without the student having to explain anything.

**Why third:** It's a backend-only change. No new UI.

**How it works:**
Currently, `/api/chat/route.ts` proxies messages to FastAPI with no student context. Change this:

1. Before forwarding the request, the Next.js API route fetches the student's analytics:
   - Their weak subjects (score < 60%) from `assessment_attempt_answers`
   - Their current course
2. Prepend a system message to the conversation:
   ```
   You are an AI tutor for [Course Name].
   This student's weak areas are: [subject list].
   Their strong areas are: [subject list].
   Prioritize explanations related to their weak areas when relevant.
   Never mention these analytics to the student directly.
   ```
3. This is added server-side and never shown in the chat UI

**Impact:** The AI starts giving more relevant responses without any extra work from the student.

---

## Priority 2 — Building the Mastery System

This is the backbone that makes everything else meaningful. Without it, analytics are just numbers.

---

### 2.1 Mastery Levels Per Subject/Topic

**What mastery means here:** A student has "mastered" a topic when they can consistently answer questions on it correctly across multiple attempts, not just once by luck.

**The formula:**
```
Mastery Score = weighted average of correct rate across last N attempts
  where more recent attempts are weighted higher
  N = min(total_attempts, 10)

Level thresholds:
  0–39%    → Beginner       (needs significant review)
  40–59%   → Developing     (basic understanding forming)
  60–74%   → Competent      (passing but gaps remain)
  75–89%   → Proficient     (solid understanding)
  90–100%  → Mastery        (can apply and explain)
```

**Database change needed:**
```sql
CREATE TABLE subject_mastery (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  course_id   bigint REFERENCES courses NOT NULL,
  subject     text NOT NULL,
  mastery_score numeric(5,2) DEFAULT 0,
  level       text DEFAULT 'beginner', -- beginner/developing/competent/proficient/mastery
  total_questions_seen int DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id, subject)
);
```

**When it updates:** After every assessment attempt is submitted, a background recalculation runs for the subjects covered in that attempt.

**Student Dashboard widget:** A grid of subjects with colored progress bars. Clicking one shows which assessments contributed and what to study next.

---

### 2.2 Suggested Next Topic (AI Learning Path)

**What it is:** After an assessment, or on the dashboard, the AI suggests what the student should focus on next.

**How it works:**
1. Pull the student's mastery levels across all subjects
2. Sort by mastery score ascending (lowest first)
3. Send to AI:
   `"Student has mastery scores: [subject: score, ...]. Suggest the single best topic to study next and explain in 2 sentences why, using an encouraging tone."`
4. Display as a small card on the dashboard

**This is not adaptive learning (that's complex).** It's a simple, human-readable recommendation. Fast to build, immediately useful.

---

## Priority 3 — AI-Generated Content

These are the features with generation time concerns. Each one has a specific strategy to handle that.

---

### 3.1 AI-Generated Practice Quizzes

**The generation time problem and solution:**

Option A (Recommended): **Async with polling**
1. Student or instructor clicks "Generate Practice Quiz"
2. A job record is created in Supabase (`quiz_generation_jobs` table) with status `pending`
3. The UI immediately shows "Your practice quiz is being prepared... (~30 seconds)"
4. A background worker (can be a Next.js route called once, or a Supabase Edge Function) generates the quiz
5. When done, status → `ready`. UI polls every 5 seconds and transitions automatically
6. Generated quiz is cached — same topic/subject generates once, reused across students

Option B (for smaller sets): **Stream questions as they're generated**
1. Start generation for 5 questions
2. Stream each question to the frontend as it's ready
3. Student can start the quiz while remaining questions are being generated
4. Works for 5-question sets, not 20+

**What the AI generates:**
The AI doesn't invent questions from scratch. It:
1. Takes a question from the FAISS-retrieved set as a **seed**
2. Paraphrases or recontextualizes the question
3. Generates 4 plausible distractors (wrong answers that represent common mistakes)
4. Returns the question + options + correct answer + explanation

This grounds output in the real question bank and prevents hallucination.

**Quality gate:** Each generated question is validated:
- Has exactly 4-5 options
- Correct answer is one of the options
- Question text > 10 words
- Failed validation → regenerate (max 3 retries)

**Storage:** Save to `question_bank` with `source = 'ai_generated'` flag. Instructors can review and approve/reject from the admin panel.

---

### 3.2 AI-Generated Study Notes

**What it is:** A student requests AI-generated notes for a topic. The result is a markdown document they can read, edit, save, or export.

**The generation time solution:** This one genuinely takes 15-30 seconds. Handle it with:
1. Full-page loading state with a progress indicator and rotating "preparing..." messages
2. Once generated, auto-save to the notes system as a new note
3. Student lands on the note editor immediately after

**What the AI generates:**
Given a topic (e.g., "Fluid Mechanics — Bernoulli's Principle"), the AI:
1. Queries RAG for all questions tagged with that topic
2. Extracts the key concepts, formulas, and common question patterns from those questions
3. Generates a structured markdown document:
   ```markdown
   # Bernoulli's Principle

   ## Core Concept
   ...

   ## Key Formula
   ...

   ## What the Exam Tests
   - Common question type 1: ...
   - Common question type 2: ...

   ## Practice Problems (from question bank)
   ...

   ## Common Mistakes
   ...
   ```
4. Saves to `course_notes` with `source = 'ai_generated'`

**The notes are editable.** The AI draft is a starting point. Students can refine it with their own understanding.

**Export:** Markdown export is trivial (it's already markdown). PDF export via `window.print()` with a print stylesheet, or a library like `html2pdf`. This is a one-day build.

---

### 3.3 Chat-to-Notes (Save AI Explanations as Notes)

**What it is:** In any chat thread, the student can click a "Save as Note" button on any AI message. It creates a new note in the course's notes section pre-populated with that explanation.

**Why this is powerful:** It turns a conversation into a study document without any extra AI call. No generation time. No hallucination risk. The student already read and verified the explanation.

**How it works:**
1. Each assistant message in the chat gets a small "Save to notes" icon on hover
2. On click → POST to `/api/course/[courseId]/notes` with the message content pre-formatted as markdown
3. Student is shown a toast: "Saved to your notes" with a link

---

## Priority 4 — Spaced Repetition (Flashcards)

**What it is:** A flashcard system where cards are automatically scheduled based on how well the student knows each concept. The algorithm shows cards you struggle with more frequently.

**Why this works for exam reviewing:** The GEAS question bank is essentially a flashcard deck already. Each question + answer + explanation maps directly to a flashcard.

**The algorithm (SM-2, simplified):**
```
Each card has:
  - ease_factor (starts at 2.5)
  - interval (days until next review, starts at 1)
  - repetitions (count)

After each review (user rates: easy/medium/hard):
  - Hard:   interval = 1, ease_factor -= 0.2
  - Medium: interval = interval × ease_factor
  - Easy:   interval = interval × ease_factor × 1.3, ease_factor += 0.1
```

**Database:**
```sql
CREATE TABLE flashcard_reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL,
  course_id     bigint NOT NULL,
  question_id   text NOT NULL, -- references question_bank
  ease_factor   numeric DEFAULT 2.5,
  interval_days int DEFAULT 1,
  repetitions   int DEFAULT 0,
  next_review   date DEFAULT current_date,
  last_rating   text -- 'hard'|'medium'|'easy'
);
```

**UI:** A daily card stack. Student flips the card to reveal the answer, rates themselves, and moves to the next card. Due cards are shown first; overdue cards are highlighted.

**AI enhancement:** For questions the student marks "hard" 3 times in a row, the AI generates a simplified explanation and a memory trick, saved to the card.

---

## Priority 5 — Question-Level AI Feedback Loop

**What it is:** Track which questions students consistently get wrong across the entire class (not just one student). Use this to flag questions that might be poorly worded, ambiguous, or need a better explanation.

**For instructors:** An "Item Analysis" view in the admin panel showing:
- Questions with < 30% correct rate → likely ambiguous or poorly worded
- Questions with > 95% correct rate → too easy, consider replacing
- Distractor analysis: which wrong answer is chosen most (reveals common misconceptions)
- AI flag: "This question has a 22% correct rate and 60% of wrong answers chose option C. Consider reviewing option C as it may be partially correct."

**This data is already partially collected** in `assessment_attempt_answers`. It needs a new analytics endpoint and admin UI page.

---

## What NOT to Build (For Now)

| Feature | Why Not |
|---|---|
| Essay / free-response questions | AI grading of essays is unreliable for technical subjects. Not worth the risk. |
| Voice input | Nice to have but not core to exam reviewing. Adds significant complexity. |
| Collaborative notes | Scope creep. Individual notes cover the student use case. |
| Full adaptive learning path (like Duolingo) | Requires a learning graph and significant data. Build mastery levels first, then revisit. |
| Predictive performance ("will you pass?") | Not enough data yet. Come back to this after 3+ months of student data. |
| Proctoring / cheating detection | Different product entirely. Not in scope. |

---

## Implementation Order (Recommended)

```
Phase 0 (1 week) — UX Foundation
  ├── Topic Cards (actionable, with mastery labels)
  ├── Topic Detail Panel (slide-out sheet)
  ├── "What's Next" AI Widget (replaces generic AI CTA)
  └── Quick Practice Mode (lightweight quiz on a topic)
      → After this: the course page feels like a reviewer, not a dashboard

Phase 1 (2–3 weeks) — Close the Feedback Loop
  ├── Post-Assessment AI Review (1.1)   ← most impactful single feature
  ├── Notes Markdown Rendering (prerequisite for note features)
  └── Mastery Levels per Topic (2.1)    ← powers topic cards properly

Phase 2 (2–3 weeks) — Make the AI Smart
  ├── AI-Aware Chat Context Injection (1.3)
  ├── AI Hints During Assessments (1.2)
  └── Chat-to-Notes Save (3.3)

Phase 3 (3–4 weeks) — AI-Generated Content
  ├── AI-Generated Study Notes per Topic (3.2)
  ├── Diagnostic Quiz on First Visit (onboarding — see Section 0)
  └── Item Analysis for Instructors (5)

Phase 4 (3–4 weeks) — Advanced
  ├── AI-Generated Practice Quizzes (3.1)
  ├── Suggested Next Topic — full AI version (2.2)
  └── Spaced Repetition Flashcards (4)
```

> **Note on Phase 0:** This is purely frontend work. No new AI calls, no new DB tables (topics already exist, question_bank already has subject tags). It's reorganizing what you already have into an experience that makes sense. It should be done first because every AI feature from Phase 1 onward needs somewhere logical to surface in the UI.

---

## Technical Notes

### FastAPI Changes Needed
- New endpoint: `POST /ai/assessment-review` — takes wrong answers + RAG context, returns streamed explanation
- New endpoint: `POST /ai/hint` — takes question, returns Socratic hint
- New endpoint: `POST /ai/generate-notes` — takes topic + RAG context, returns markdown
- New endpoint: `POST /ai/generate-questions` — takes topic + seed questions, returns question set
- Existing `/chat` endpoints remain unchanged

### Streaming Strategy
All new endpoints should stream. The FastAPI `/chat/stream` endpoint exists already — use the same pattern (Server-Sent Events). The Next.js proxy already supports this via `Response` streaming.

### Caching Strategy
- Generated notes: cache by `(course_id, topic, model_version)` — invalidate when question bank updates
- Generated quiz questions: cache by `(subject, count, difficulty)` — 24-hour TTL
- Post-assessment reviews: cache by `attempt_id` — never expires (it's done)
- Mastery scores: recompute on demand but cache with 1-hour TTL

### The Notes Markdown Gap
Before building AI notes, the notes UI needs markdown rendering. Currently `content` is stored as markdown text but rendered as plain text. Add:
- `react-markdown` + `remark-gfm` for rendering
- A simple toggle between "Edit" (textarea) and "Preview" (rendered) mode
- This is a 2-hour build that unblocks all note-related features

---

## Summary

The platform's AI is already good — Qwen 14B with FAISS RAG at 0.09ms retrieval is a strong technical foundation. The gap is that the AI only talks in chat. The features above systematically extend it into every student workflow:

- **Struggling on a quiz?** → Get a hint from the same AI
- **Just finished an assessment?** → AI reviews every mistake
- **Studying a topic?** → AI generates structured notes from the question bank
- **Need practice?** → AI generates a fresh practice quiz grounded in real questions
- **Opening the app daily?** → Flashcards due for review, AI tells you what to study next
- **Opening chat?** → The AI already knows your weak areas

None of these require a fundamentally different AI. They're new entry points to the same RAG pipeline.
