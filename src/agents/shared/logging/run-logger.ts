import type { AgentOutputLog, AgentOutputLogRef, AgentRunCompleteLog, AgentRunFailureLog, AgentRunLogRef, AgentRunStartLog } from "./trace-types";

export type RunLogger = {
  startRun: (input: AgentRunStartLog) => Promise<AgentRunLogRef>;
  completeRun: (input: AgentRunCompleteLog) => Promise<void>;
  failRun: (input: AgentRunFailureLog) => Promise<void>;
  recordOutput: (input: AgentOutputLog) => Promise<AgentOutputLogRef>;
};

export function createNoopRunLogger(): RunLogger {
  return {
    startRun: async () => ({}),
    completeRun: async () => undefined,
    failRun: async () => undefined,
    recordOutput: async () => ({})
  };
}

export function createSupabaseRunLoggerPlaceholder(): RunLogger {
  // TODO: Wire this to a server-side Supabase client after Auth establishes teacher_id.
  // The implementation must only persist privacy-safe fields such as context_summary
  // and context_record_ids by default. It must not persist full assembled context.
  return createNoopRunLogger();
}
