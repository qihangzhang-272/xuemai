import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateVisionEvidencePacket } from "./validators";
import {
  createVisionEvidencePacketFromExternalProvider,
  validateExternalVisionAdapterInput,
  type ExternalVisionAdapterInput
} from "./vision-adapter";
import type { VisionEvidencePacket } from "./types";

export type GenerateVisionEvidencePacketFileInput = {
  externalVisionInputPath: string;
  visionPacketOutputPath: string;
  failOnWarnings?: boolean;
};

export type GenerateVisionEvidencePacketFileResult = {
  visionPacketOutputPath: string;
  provider: string;
  providerRunId: string;
  materialId: string;
  materialState: VisionEvidencePacket["material_state"];
  questionCount: number;
  evidenceCount: number;
  validationWarnings: string[];
};

export async function generateVisionEvidencePacketFile(input: GenerateVisionEvidencePacketFileInput): Promise<GenerateVisionEvidencePacketFileResult> {
  const externalVisionInput = await readJsonFile<ExternalVisionAdapterInput>(input.externalVisionInputPath);
  const inputValidation = validateExternalVisionAdapterInput(externalVisionInput);

  if (!inputValidation.ok) {
    throw new Error(`VisionEvidencePacket was not written because external provider input is invalid: ${inputValidation.errors.join("；")}`);
  }

  const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
  const validation = validateVisionEvidencePacket(packet);

  if (!validation.ok) {
    throw new Error(`VisionEvidencePacket was not written because adapter output is invalid: ${validation.errors.join("；")}`);
  }

  const validationWarnings = uniqueStrings([...inputValidation.warnings, ...validation.warnings]);

  if (input.failOnWarnings && validationWarnings.length > 0) {
    throw new Error(`VisionEvidencePacket was not written because adapter output has warnings: ${validationWarnings.join("；")}`);
  }

  await writeJsonFile(input.visionPacketOutputPath, packet);

  return {
    visionPacketOutputPath: input.visionPacketOutputPath,
    provider: packet.plugin_provider,
    providerRunId: packet.plugin_run_id,
    materialId: packet.material_id,
    materialState: packet.material_state,
    questionCount: packet.questions.length,
    evidenceCount: packet.evidences.length,
    validationWarnings
  };
}

export async function readVisionEvidencePacketFile(filePath: string): Promise<VisionEvidencePacket> {
  return readJsonFile<VisionEvidencePacket>(filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
