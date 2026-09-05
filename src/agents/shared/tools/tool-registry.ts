import type { ToolDefinition, ToolName, ToolPermission } from "./tool-types";

export type ToolRegistry = {
  list: () => ToolDefinition[];
  get: (name: ToolName) => ToolDefinition | undefined;
  getRequired: (name: ToolName) => ToolDefinition;
  listByPermission: (permission: ToolPermission) => ToolDefinition[];
};

export function createToolRegistry(tools: ToolDefinition[] = []): ToolRegistry {
  const toolMap = new Map<ToolName, ToolDefinition>();

  for (const tool of tools) {
    toolMap.set(tool.name, tool);
  }

  return {
    list: () => [...toolMap.values()],
    get: (name) => toolMap.get(name),
    getRequired: (name) => {
      const tool = toolMap.get(name);
      if (!tool) {
        throw new Error(`Tool is not registered: ${name}`);
      }
      return tool;
    },
    listByPermission: (permission) => [...toolMap.values()].filter((tool) => tool.permissions.includes(permission))
  };
}

export const EMPTY_TOOL_REGISTRY = createToolRegistry();
