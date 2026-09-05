# Shared Harness Core

Shared Harness Core contains reusable infrastructure for all Agents.

Phase 1 keeps these modules as skeleton boundaries only.

Required modules:

- `model`: model client and structured output helpers.
- `run`: Agent run lifecycle, runner contracts, and status handling.
- `context`: context blocks, prioritization, and assembly.
- `tools`: internal data tools and tool registry.
- `memory`: teacher preferences, student memory, workflow memory.
- `evaluation`: quality scoring and rubrics.
- `guardrails`: privacy and parent communication rules.
- `logging`: `agent_runs` and trace boundaries.
- `recovery`: retry, fallback, and error mapping.
