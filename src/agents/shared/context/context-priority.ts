import type { ContextBlock, ContextPriority } from "./context-types";

export const CONTEXT_PRIORITY_WEIGHT: Record<ContextPriority, number> = {
  required: 100,
  high: 75,
  medium: 50,
  low: 25
};

export function compareContextBlocks(a: ContextBlock, b: ContextBlock) {
  return CONTEXT_PRIORITY_WEIGHT[b.priority] - CONTEXT_PRIORITY_WEIGHT[a.priority];
}

export function sortContextBlocks(blocks: ContextBlock[]) {
  return [...blocks].sort(compareContextBlocks);
}

export function hasMinimumPriority(priority: ContextPriority, minimum: ContextPriority) {
  return CONTEXT_PRIORITY_WEIGHT[priority] >= CONTEXT_PRIORITY_WEIGHT[minimum];
}

export function filterContextBlocksByPriority(blocks: ContextBlock[], minimum: ContextPriority) {
  return blocks.filter((block) => hasMinimumPriority(block.priority, minimum));
}
