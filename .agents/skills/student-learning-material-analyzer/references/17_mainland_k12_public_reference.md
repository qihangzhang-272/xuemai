# Mainland China K12 Public Reference

Use this reference for coarse subject/stage recognition and professional-report wording. Do not treat it as a full knowledge-point database.

## Public Sources Searched
- `义务教育课程方案和课程标准（2022年版）`
- `普通高中课程方案和语文等学科课程标准（2017年版2020年修订）`
- `教育部关于加强初中学业水平考试命题工作的意见（教基〔2019〕15号）`
- `深化新时代教育评价改革总体方案`

Keep official-source URLs in `src/skills/student-learning-material-analyzer/mainland-k12-reference.ts`. If a claim depends on exact textbook chapters, regional exam rules, or current local policy, verify from the relevant province/city official source before using it.

## Engineering Use
- Use `buildMainlandK12PromptReference()` to ground the reasoning prompt in public subject/stage boundaries.
- Use `getMainlandK12SubjectReference(subject)` to add teacher-report ability dimensions.
- Use `getStageSubjectCompatibility({ stage, subject })` to flag likely stage/subject mismatches for teacher review.

## Boundaries
- Do not infer a region, textbook version, or local exam scope unless the material contains evidence.
- Do not mark suspected out-of-scope or competition material as a normal weakness; route it to teacher review.
- Do not claim 99% correctness from public curriculum references; correctness still requires OCR/Vision evidence, answer/rubric basis, model output, and human-labeled eval data.
