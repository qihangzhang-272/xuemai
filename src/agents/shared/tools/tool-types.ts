export type ToolPermission = "read" | "write" | "risky_write" | "external_send" | "destructive";

export type ToolName = `${string}.${string}`;

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: ToolName;
  description: string;
  permissions: ToolPermission[];
  inputSchemaName?: string;
  outputSchemaName?: string;
  enabled: boolean;
  execute?: (input: TInput) => Promise<TOutput>;
};

export type ToolInvocation<TInput = unknown> = {
  toolName: ToolName;
  input: TInput;
  requestedByAgentRunId?: string;
  requiresTeacherConfirmation?: boolean;
};
