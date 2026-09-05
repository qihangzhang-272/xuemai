export const AGENT_RUN_STATUSES = ["running", "success", "failed", "fallback", "cancelled"] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const TERMINAL_AGENT_RUN_STATUSES: AgentRunStatus[] = ["success", "failed", "fallback", "cancelled"];

export function isAgentRunStatus(value: string): value is AgentRunStatus {
  return AGENT_RUN_STATUSES.includes(value as AgentRunStatus);
}

export function isTerminalAgentRunStatus(status: AgentRunStatus) {
  return TERMINAL_AGENT_RUN_STATUSES.includes(status);
}
