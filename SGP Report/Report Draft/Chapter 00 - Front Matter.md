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

ExamAI is a full-stack, AI-assisted exam-preparation platform that connects students with teacher-approved learning material. Students select an enrolled subject, choose which approved materials should scope a study session, ask questions, and receive answers grounded in retrieved passages with numbered citations that identify the teacher, the file, and the page or slide. Teachers upload PDF, PPTX and DOCX materials, monitor ingestion status, author quizzes manually or with AI assistance, publish one shared quiz per topic for the whole class, and review class performance through analytics. Students additionally generate personal flashcard decks from their selected materials.

The platform is implemented as a React frontend and a FastAPI backend. Supabase provides authentication, PostgreSQL storage and private file storage. A single metadata-filtered Qdrant collection stores embedded material chunks; Gemini provides structured language-model generation for chat answers, quiz questions and flashcards, guarded by schema-driven retries. Authorization is enforced in the service layer: teacher access follows subject membership, student access follows subject enrollment, and every retrieval is pre-validated so a student can never cite material from a subject they are not enrolled in.

The project was built incrementally over one academic semester, verified by 82 offline backend tests and 63 frontend tests. In conclusion, ExamAI demonstrates that retrieval-grounded study help, shared teacher-authored assessment, personal revision content and class-wide analytics can be combined into one coherent, role-aware system — closing the specific gaps identified in the literature survey in Chapter 2.

## List of Figures (proposed)

| Figure No | Title |
|---|---|
| Figure 7.1 | System architecture |
| Figure 7.2 | Class diagram |
| Figure 7.3 | Use-case diagram |
| Figure 7.4 | Sequence diagram — RAG chat |
| Figure 7.5 | Activity diagram — material ingestion |
| Figure 7.6.1 | Data flow diagram — Level 0 |
| Figure 7.6.2 | Data flow diagram — Level 1 |
| Figure 8.1 | Login and role-based landing |
| Figure 8.2a / 8.2b | Student dashboard; subject view grouped by teacher |
| Figure 8.3a / 8.3b | Chat with material-scope panel; cited answer |
| Figure 8.4a / 8.4b | Quiz taking; result with feedback and weak topics |
| Figure 8.5a / 8.5b | Flashcard deck generation; flip-study view |
| Figure 8.6 | Teacher materials with ingestion states |
| Figure 8.7a / 8.7b | Manual quiz editor; AI-assisted draft review |
| Figure 8.8a / 8.8b | Per-quiz analytics; student progress roster |

## List of Tables (proposed)

| Table No | Title |
|---|---|
| Table 2.3 | Existing systems vs ExamAI |
| Table 3.2.5.1 | Time allocation |
| Table 3.3 | Risk management |
| Table 4.2 | Functional requirements |
| Table 4.4 | Non-functional requirements |

## Abbreviations

| Abbreviation | Full Form |
|---|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| DFD | Data Flow Diagram |
| DOCX | Word Open XML Document |
| HTTP | HyperText Transfer Protocol |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| ORM | Object Relational Mapping |
| PDF | Portable Document Format |
| PPTX | PowerPoint Open XML Presentation |
| RAG | Retrieval-Augmented Generation |
| REST | Representational State Transfer |
| SQL | Structured Query Language |
| UI | User Interface |
| UX | User Experience |
| UUID | Universally Unique Identifier |
