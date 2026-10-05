# Chapter 10 — Limitation and Future Enhancement

- LIMITATION
- FUTURE ENHANCEMENT

## 10.1 Limitation

- ExamAI is a web application only — there is no mobile app yet.
- Users are provisioned by the seed operation plus runtime admin user management (`admin@examai.com`); there is no public signup, password reset, or OAuth.
- The generated answer is limited by the quality and coverage of uploaded material. Source attribution identifies the retrieved passage but does not guarantee the model's interpretation is correct; teachers must review AI-assisted quizzes before publication.
- Retrieval is dense-vector only; sparse/keyword signals (exact terms, codes, formulae) are not separately indexed.
- Generation features depend on the configured Gemini model, quota, and billing, which must be verified per deployment.
- There is no in-app teacher–student messaging or broadcast, and no payment or purchase flow.
- Analytics describe quiz attempts within the application; they do not claim to measure long-term learning outcomes.

## 10.2 Future Enhancement

- Add hybrid dense-plus-sparse retrieval and compare retrieval quality on a controlled dataset.
- Add richer source previews (page/slide thumbnails) and material version history.
- Introduce student-generated personal practice quizzes as explicit v2 scope, kept separate from shared graded assessment.
- Add institutional identity integration and deployment observability (logging, metrics, backups); extend the delivered administrator console (bulk import, audit log) as needed.
- Build mobile clients against the existing REST API without backend changes.
- Run accessibility audits and extend evaluation to citation correctness, quiz quality, and study outcomes.
