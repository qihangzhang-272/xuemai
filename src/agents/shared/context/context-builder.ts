import { sortContextBlocks } from "./context-priority";
import type { AssembledContext, ContextBlock, ContextRecordRef } from "./context-types";

export type AssembleContextOptions = {
  maxBlocks?: number;
  includeSensitive?: boolean;
  tokenEstimatePerCharacter?: number;
  metadata?: Record<string, unknown>;
};

export function createContextBlock(block: ContextBlock): ContextBlock {
  return block;
}

export function assembleContext(blocks: ContextBlock[], options: AssembleContextOptions = {}): AssembledContext {
  const warnings: string[] = [];
  const includeSensitive = options.includeSensitive ?? false;
  const sortedBlocks = sortContextBlocks(blocks);
  const privacyFilteredBlocks = includeSensitive ? sortedBlocks : sortedBlocks.filter((block) => !block.sensitive);

  if (!includeSensitive && privacyFilteredBlocks.length < sortedBlocks.length) {
    warnings.push("Sensitive context blocks were omitted from the default assembled context.");
  }

  const selectedBlocks = typeof options.maxBlocks === "number" ? privacyFilteredBlocks.slice(0, options.maxBlocks) : privacyFilteredBlocks;
  const contextRecordIds = collectContextRecordIds(selectedBlocks);

  return {
    blocks: selectedBlocks,
    contextSummary: summarizeContext(selectedBlocks),
    contextRecordIds,
    warnings,
    tokenEstimate: estimateContextTokens(selectedBlocks, options.tokenEstimatePerCharacter),
    metadata: options.metadata
  };
}

export function collectContextRecordIds(blocks: ContextBlock[]): ContextRecordRef[] {
  return blocks.flatMap((block) => block.recordIds ?? []);
}

export function summarizeContext(blocks: ContextBlock[]): Record<string, unknown> {
  return {
    blockCount: blocks.length,
    sources: [...new Set(blocks.map((block) => block.source))],
    requiredTitles: blocks.filter((block) => block.priority === "required").map((block) => block.title),
    highPriorityTitles: blocks.filter((block) => block.priority === "high").map((block) => block.title)
  };
}

export function estimateContextTokens(blocks: ContextBlock[], tokenEstimatePerCharacter = 0.35) {
  const characterCount = blocks.reduce((sum, block) => sum + block.content.length, 0);
  return Math.ceil(characterCount * tokenEstimatePerCharacter);
}
