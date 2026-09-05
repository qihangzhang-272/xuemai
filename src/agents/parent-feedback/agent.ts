import { getAgentMetadata } from "../registry";
import { PARENT_FEEDBACK_AGENT_NAME } from "./constants";
import { runParentFeedbackWorkflow } from "./workflow";
import type { ParentFeedbackInput } from "./types";

export const parentFeedbackAgentMetadata = getAgentMetadata(PARENT_FEEDBACK_AGENT_NAME);

export async function runParentFeedbackAgent(input: ParentFeedbackInput) {
  return runParentFeedbackWorkflow(input);
}
