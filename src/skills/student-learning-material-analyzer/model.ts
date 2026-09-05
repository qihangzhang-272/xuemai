import { createJsonChatCompletion } from "@/src/agents/shared/model/call-model";
import type { AiModelConfig } from "@/src/agents/shared/model/model-config";
import type { LearningMaterialAnalysisModel, StudentLearningMaterialAnalysis } from "./types";

type JsonCompletionCaller = (input: Parameters<typeof createJsonChatCompletion>[0]) => Promise<{
  choices: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
}>;

export type LearningMaterialAnalysisModelAdapterOptions = {
  config?: AiModelConfig;
  model?: string;
  completionCaller?: JsonCompletionCaller;
};

export function createLearningMaterialAnalysisModel(options: LearningMaterialAnalysisModelAdapterOptions = {}): LearningMaterialAnalysisModel {
  const completionCaller = options.completionCaller ?? createJsonChatCompletion;

  return {
    async generateAnalysis(input) {
      const completion = await completionCaller({
        config: options.config,
        model: options.model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: [
              "Return valid JSON only.",
              "You are the Xuemai learning material analysis reasoning layer.",
              "You must output the StudentLearningMaterialAnalysis contract exactly; do not depend on provider-specific behavior."
            ].join(" ")
          },
          {
            role: "user",
            content: input.prompt
          }
        ]
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Learning material analysis model returned empty content.");
      }

      const analysis = parseStudentLearningMaterialAnalysisJson(content);
      return annotateModelContract(analysis, {
        providerName: options.config?.provider,
        modelName: options.model ?? options.config?.model
      });
    }
  };
}

export function createDeepSeekLearningMaterialAnalysisModel(options: LearningMaterialAnalysisModelAdapterOptions = {}): LearningMaterialAnalysisModel {
  return createLearningMaterialAnalysisModel(options);
}

export function parseStudentLearningMaterialAnalysisJson(content: string): StudentLearningMaterialAnalysis {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`StudentLearningMaterialAnalysis JSON parse failed: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new Error("StudentLearningMaterialAnalysis JSON must be an object.");
  }

  return parsed as StudentLearningMaterialAnalysis;
}

function annotateModelContract(
  analysis: StudentLearningMaterialAnalysis,
  metadata: {
    providerName?: string;
    modelName?: string;
  }
) {
  if (analysis.model_contract) {
    analysis.model_contract.provider_name = analysis.model_contract.provider_name || metadata.providerName;
    analysis.model_contract.model_name = analysis.model_contract.model_name || metadata.modelName;
  }

  if (analysis.audit && metadata.modelName) {
    analysis.audit.runtime_model = analysis.audit.runtime_model || metadata.modelName;
  }

  return analysis;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
