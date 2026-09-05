import type {
  AnalysisJob,
  AnalysisJobStatus,
  LearningMaterialAnalyzerRepository,
  StudentLearningMaterialAnalysis,
  TeacherReviewItem,
  TrustedTeacherContext,
  VisionEvidencePacket
} from "./types";

export class MemoryLearningMaterialAnalyzerRepository implements LearningMaterialAnalyzerRepository {
  readonly packets = new Map<string, VisionEvidencePacket>();
  readonly jobs = new Map<string, AnalysisJob>();
  readonly analyses = new Map<string, StudentLearningMaterialAnalysis>();
  readonly reviewItems = new Map<string, TeacherReviewItem>();
  readonly jobStatusEvents: Array<{ analysisJobId: string; status: AnalysisJobStatus }> = [];

  constructor(seed?: { jobs?: AnalysisJob[]; packets?: VisionEvidencePacket[] }) {
    seed?.jobs?.forEach((job) => this.jobs.set(job.id, job));
    seed?.packets?.forEach((packet) => this.packets.set(packet.material_id, packet));
  }

  async saveVisionEvidencePacket(context: TrustedTeacherContext, packet: VisionEvidencePacket) {
    assertContextOwnsStudent(context, packet.teacher_id);
    this.packets.set(packet.material_id, packet);
    return { packetId: packet.plugin_run_id };
  }

  async getVisionEvidencePacket(context: TrustedTeacherContext, materialId: string) {
    const packet = this.packets.get(materialId) ?? null;
    if (packet) assertContextOwnsStudent(context, packet.teacher_id);
    return packet;
  }

  async saveStudentLearningMaterialAnalysisDraft(
    _context: TrustedTeacherContext,
    input: {
      analysisJobId: string;
      materialId: string;
      packetId?: string;
      analysis: StudentLearningMaterialAnalysis;
      validationErrors: string[];
      safetyWarnings: string[];
    }
  ) {
    this.analyses.set(input.analysis.analysis_id, input.analysis);
    const job = this.jobs.get(input.analysisJobId);
    if (job) {
      this.jobs.set(input.analysisJobId, {
        ...job,
        status: input.analysis.teacher_review_required || input.validationErrors.length ? "degraded" : "draft_ready",
        metadata: {
          ...job.metadata,
          materialId: input.materialId,
          packetId: input.packetId,
          validationErrors: input.validationErrors,
          safetyWarnings: input.safetyWarnings
        }
      });
    }
    return { analysisId: input.analysis.analysis_id };
  }

  async createTeacherReviewItems(_context: TrustedTeacherContext, items: TeacherReviewItem[]) {
    items.forEach((item) => this.reviewItems.set(item.id, item));
    return items;
  }

  async getAnalysisJob(context: TrustedTeacherContext, analysisJobId: string) {
    const job = this.jobs.get(analysisJobId) ?? null;
    if (job) assertContextOwnsStudent(context, job.teacherId);
    return job;
  }

  async updateAnalysisJobStatus(_context: TrustedTeacherContext, analysisJobId: string, status: AnalysisJobStatus, metadata?: Record<string, unknown>) {
    this.jobStatusEvents.push({ analysisJobId, status });
    const job = this.jobs.get(analysisJobId);
    if (!job) return;
    this.jobs.set(analysisJobId, {
      ...job,
      status,
      metadata: {
        ...job.metadata,
        ...metadata
      }
    });
  }
}

function assertContextOwnsStudent(context: TrustedTeacherContext, rowTeacherId: string | undefined) {
  if (rowTeacherId && rowTeacherId !== context.teacherId) {
    throw new Error("Teacher context does not own requested learning material analyzer record.");
  }
}
