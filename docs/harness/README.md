# Harness Architecture

This directory explains the reusable Agent Harness layer for 学脉.

The Harness is not a separate product. It is the shared execution foundation that lets multiple teaching Agents reuse the same boundaries:

- model calls
- context building
- internal tools
- memory
- evaluation
- guardrails
- run logging
- recovery

Parent Feedback Agent is the first workflow that should use this Harness. Future agents such as Wrong Question Analysis, Student Profile, Monthly Report, Batch Feedback, Lesson Planning, and Teacher Orchestrator should not rebuild these foundations from scratch.

## Phase 1 Boundary

Phase 1 only creates the architecture skeleton. It does not implement complex business logic, database persistence, or multi-agent orchestration.

## Required Safety Rule

AI output is a draft until the teacher confirms it. Confirmed records may become `feedback_history` and `student_learning_records`; drafts should remain in `agent_outputs`.
