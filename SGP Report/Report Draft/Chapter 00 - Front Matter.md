# Front Matter — ExamAI

> Draft content for the preliminary pages. Ordering and titles follow the official
> format documents (`Software Group Project Report Format/00–08`).

## Cover Page

- Title block: **PROJECT REPORT / On / ExamAI — AI-Powered Exam Preparation over Teacher-Approved Material**
- Submitted by:
  - PATEL DHAIRYA (IU2341230041)
  - KHATRI KESHAV (IU2341230068)
  - PATEL SWET (IU2341230111)
- "In fulfillment for the requirements of Software Group Project as a part of BACHELOR OF TECHNOLOGY in COMPUTER SCIENCE AND ENGINEERING"
- INSTITUTE OF TECHNOLOGY AND ENGINEERING, INDUS UNIVERSITY CAMPUS, RANCHARDA, VIA-THALTEJ, AHMEDABAD-382115, GUJARAT, INDIA. WEB: www.indusuni.ac.in
- NOV 2026

## First Page

- PROJECT REPORT ON **ExamAI** — same degree block as cover.
- PREPARED BY: Patel Dhairya (IU2341230041), Khatri Keshav (IU2341230068), Patel Swet (IU2341230111)
- UNDER GUIDANCE OF (Internal Guide): **Ms. Shreya Bhatt, Assistant Professor, Department of Computer Science and Engineering, IITE, Indus University, Ahmedabad.** No external guide / company applies to this project.
- SUBMITTED TO: Institute of Technology and Engineering, Indus University (address block as cover). NOV 2026.

## College Certificate

- Heading: INDUS INSTITUTE OF TECHNOLOGY AND ENGINEERING / COMPUTER SCIENCE & ENGINEERING / NOV 2026. CERTIFICATE dated __/10/2026.
- Body: "This is to certify that the Software Group Project work entitled **'ExamAI — AI-Powered Exam Preparation over Teacher-Approved Material'** has been carried out by Patel Dhairya, Khatri Keshav and Patel Swet under the guidance of Ms. Shreya Bhatt in partial fulfillment of the requirements for the Bachelor of Technology in Computer Science and Engineering (7th Semester) of Indus University, Ahmedabad during the academic year 2026."
- Signatories: Ms. Shreya Bhatt (Guide) | Dr. Kaushal Jani (Head of Department) | Prof. Zalak Vyas (Head of Department) — titles as per the official certificate template.

## Candidate's Declaration

- Standard declaration naming the report title "ExamAI — AI-Powered Exam Preparation over Teacher-Approved Material", carried out under the supervision of Ms. Shreya Bhatt, with originality statement per the official template. Signed by all three candidates with enrollment numbers; countersigned by the guide.

## Acknowledgement

We thank our internal guide, **Ms. Shreya Bhatt, Assistant Professor, Department of Computer Science and Engineering**, for her constant guidance — from finalizing the project scope, through the system design and RAG architecture reviews, to the final report. We thank Dr. Kaushal Jani and Prof. Zalak Vyas, Heads of the Department of Computer Science and Engineering, and the faculty of Indus Institute of Technology and Engineering for their encouragement and for an environment that supports independent, practical project work. We also thank Mr. Jignesh Patel for his help in identifying and defining the project topic. Finally, we thank our families and friends for their patience and support during the many hours spent building, testing and documenting this project.

— Patel Dhairya (IU2341230041), Khatri Keshav (IU2341230068), Patel Swet (IU2341230111), Computer Science & Engineering.

## Abstract

ExamAI is a full-stack, AI-assisted exam-preparation platform that connects students with teacher-approved learning material. Students select an enrolled subject, choose which approved materials should scope a study session, ask questions, and receive answers grounded in retrieved passages with numbered citations that identify the teacher, the file, and the page or slide. Teachers upload PDF, PPTX and DOCX materials, monitor ingestion status, author quizzes manually or with AI assistance, publish one shared quiz per topic for the whole class, and review class performance through analytics. Students additionally generate personal flashcard decks from their selected materials. Administrators provision teacher/student accounts, subjects, and teacher assignments / student enrollments through the admin console (`/api/admin/*`, `/admin/*`).

The platform is implemented as a React frontend and a FastAPI backend. Supabase provides authentication, PostgreSQL storage and private file storage. A single metadata-filtered Qdrant collection stores embedded material chunks; Gemini provides structured language-model generation for chat answers, quiz questions and flashcards, guarded by schema-driven retries. Authorization is enforced in the service layer: teacher access follows subject membership, student access follows subject enrollment, administration follows the global `require_admin` gate (which manages but never bypasses those relations), and every retrieval is pre-validated so a student can never cite material from a subject they are not enrolled in.

The project was built incrementally over one academic semester, verified by 103 offline backend tests and 84 frontend tests. In conclusion, ExamAI demonstrates that retrieval-grounded study help, shared teacher-authored assessment, personal revision content, class-wide analytics, and centralized administration can be combined into one coherent, role-aware system — closing the specific gaps identified in the literature survey in Chapter 2.

## Company Profile

There is no external company for this Software Group Project. ExamAI is an in-house academic project carried out at the Institute of Technology and Engineering, Indus University, under the internal guidance of Ms. Shreya Bhatt (Assistant Professor, Department of Computer Science and Engineering). The reference production layout is Render.com (backend API) + static frontend hosting + managed Supabase (Postgres, Auth, Storage) and Qdrant Cloud services.

## List of Figures (proposed)

| Figure No | Title |
|---|---|
| Figure 8.1 | System architecture |
| Figure 8.2 | Class diagram |
| Figure 8.3 | Use-case diagram |
| Figure 8.4 | RAG chat sequence |
| Figure 8.5 | Material ingestion activity |
| Figure 8.6.1 | Level 0 DFD |
| Figure 8.6.2 | Level 1 DFD |
| Figure 9.1 | Sign-in form — email and password only, no signup or role selector |
| Figure 9.2 | Student dashboard — study hero, quick stats, and enrolled subjects with teachers and progress |
| Figure 9.3 | Subject resources — approved materials grouped by teacher with filter; only ready items are visible to students |
| Figure 9.4 | RAG chat — per-session material scope, numbered citations with teacher/file tooltip, and grounded refusal of an off-corpus question |
| Figure 9.5 | Published quiz list with scores |
| Figure 9.6 | Quiz taking — one question at a time under a visible countdown with Previous/Next navigation |
| Figure 9.7 | Result card — grade, score, and per-topic areas to review |
| Figure 9.8 | Question review — per-question correct/wrong marking against the correct choice |
| Figure 9.9 | Flashcard deck list with mastery progress |
| Figure 9.10 | Flip-study view — question front with answer reveal and mastery controls |
| Figure 9.11 | Teacher materials — upload dropzone, subject tabs, owner column separating own vs co-teacher files, Ready status badges |
| Figure 9.12 | Teacher quiz list — draft/published badges, manual/AI source tags, publish flow |
| Figure 9.13 | Per-quiz analytics — class stats, accuracy heatmap, grade distribution, weak topics |
| Figure 9.14 | Student progress roster — averages, completion, at-risk flags with drill-down |
| Figure 9.15 | Teacher dashboard overview — activity stats, recent completions, grade distribution, AI insights |
| Figure 9.16 | Admin users — full account list with search, role filter, and per-row subject drill-down |
| Figure 9.17 | Admin user drill-down — expanded teacher row with assigned subjects |
| Figure 9.18 | Admin subjects — full subject list with add action |
| Figure 9.19 | Admin subject drill-down — expanded subject with teacher and student rosters |
| Figure 9.20 | Admin membership — assign or remove teacher/student by subject, kind, and user |

## List of Tables (proposed)

| Table No | Title |
|---|---|
| Table 2.3 | Existing systems vs ExamAI |
| Table 3.1 | Work breakdown structure |
| Table 3.2 | Time allocation |
| Table 3.3 | Task sets |
| Table 3.4 | Risk management |
| Table 4.2 | Functional requirements |
| Table 4.4 | Non-functional requirements |
| Table 4.5 | Software stack (as used) |
| Table 7.1 | Representative test cases |
| Table 8.1 | System architecture layers and responsibilities |
| Table 12.1 | Product deployment layout |
| Table 12.2 | API and web service summary |

## Abbreviations

| Abbreviation | Full Form |
|---|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CORS | Cross-Origin Resource Sharing |
| CRUD | Create, Read, Update, Delete |
| CSS | Cascading Style Sheets |
| DFD | Data Flow Diagram |
| DOCX | Word Open XML Document |
| HTTP | HyperText Transfer Protocol |
| JSON | JavaScript Object Notation |
| JSX | JavaScript XML |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| LMS | Learning Management System |
| MOOC | Massive Open Online Course |
| ORM | Object Relational Mapping |
| PDF | Portable Document Format |
| PPTX | PowerPoint Open XML Presentation |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SDK | Software Development Kit |
| SQL | Structured Query Language |
| UI | User Interface |
| UX | User Experience |
| UUID | Universally Unique Identifier |
