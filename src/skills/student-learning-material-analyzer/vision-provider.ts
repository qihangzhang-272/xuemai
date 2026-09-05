import { getMockVisionEvidencePacket } from "./mock-fixtures";
import type { VisionProvider, VisionProviderInput } from "./types";
export { createVisionEvidencePacketFromExternalProvider } from "./vision-adapter";
export type {
  ExternalVisionAdapterInput,
  ExternalVisionEvidenceCandidate,
  ExternalVisionPage,
  ExternalVisionQuestionCandidate,
  ExternalVisionRegionCandidate,
  ExternalVisionSourceKind
} from "./vision-adapter";

export class MockVisionProvider implements VisionProvider {
  readonly name = "mock";

  async analyzeMaterial(input: VisionProviderInput) {
    return getMockVisionEvidencePacket(input.fixtureId ?? "clear_exam_with_teacher_correction", {
      materialId: input.materialId,
      studentId: input.studentId,
      teacherId: input.teacherId,
      tenantId: input.tenantId
    });
  }
}

export type VisionProviderKind = "mock";

export function createVisionProvider(kind: VisionProviderKind = "mock"): VisionProvider {
  if (kind === "mock") return new MockVisionProvider();

  return new MockVisionProvider();
}
