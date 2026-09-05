import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnalysisJob,
  AnalysisJobStatus,
  LearningMaterialAnalyzerRepository,
  TrustedTeacherContext,
  VisionEvidencePacket
} from "./types";

type IdRow = {
  id: string;
};

export function createSupabaseLearningMaterialAnalyzerRepository(client: SupabaseClient): LearningMaterialAnalyzerRepository {
  return {
    async saveVisionEvidencePacket(context, packet) {
      assertTeacherContext(context, packet);

      const { data, error } = await client
        .from("vision_evidence_packets")
        .upsert(
          {
            teacher_id: context.teacherId,
            tenant_id: context.tenantId ?? null,
            student_id: packet.student_id,
            material_id: packet.material_id,
            plugin_run_id: packet.plugin_run_id,
            schema_version: packet.schema_version,
            plugin_provider: packet.plugin_provider,
            plugin_model_version: packet.plugin_model_version,
            packet_json: packet as unknown as Record<string, unknown>,
            gates: packet.gates as unknown as Record<string, unknown>[],
            status: "extracted"
          },
          { onConflict: "teacher_id,plugin_run_id" }
        )
        .select("id")
        .single();

      if (error) throw error;
      const packetId = (data as IdRow).id;

      await upsertPages(client, context, packet, packetId);
      await upsertQuestions(client, context, packet, packetId);
      await upsertEvidences(client, context, packet, packetId);

      return { packetId };
    },

    async getVisionEvidencePacket(context, materialId) {
      const { data, error } = await client
        .from("vision_evidence_packets")
        .select("packet_json")
        .eq("teacher_id", context.teacherId)
        .eq("material_id", materialId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return (data as { packet_json: VisionEvidencePacket }).packet_json;
    },

    async saveStudentLearningMaterialAnalysisDraft(context, input) {
      const { data, error } = await client
        .from("student_learning_material_analyses")
        .upsert(
          {
            teacher_id: context.teacherId,
            tenant_id: context.tenantId ?? null,
            student_id: input.analysis.student_id,
            material_id: input.materialId,
            analysis_job_id: input.analysisJobId,
            vision_packet_id: input.packetId ?? null,
            analysis_id_external: input.analysis.analysis_id,
            status: input.analysis.teacher_review_required ? "degraded" : "draft",
            analysis_json: input.analysis as unknown as Record<string, unknown>,
            validation_errors: input.validationErrors,
            safety_warnings: input.safetyWarnings,
            teacher_review_required: input.analysis.teacher_review_required
          },
          { onConflict: "teacher_id,analysis_id_external" }
        )
        .select("id")
        .single();

      if (error) throw error;
      return { analysisId: (data as IdRow).id };
    },

    async createTeacherReviewItems(context, items) {
      if (!items.length) return [];

      const { error } = await client.from("teacher_review_items").upsert(
        items.map((item) => ({
          id: item.id,
          teacher_id: context.teacherId,
          student_id: item.studentId,
          material_id: item.materialId,
          analysis_job_id: item.analysisJobId,
          analysis_id_external: item.analysisId,
          item_type: item.itemType,
          title: item.title,
          content_json: item.content,
          evidence_refs: item.evidenceRefs,
          status: item.status,
          risk_flags: item.riskFlags
        })),
        { onConflict: "id" }
      );

      if (error) throw error;
      return items;
    },

    async getAnalysisJob(context, analysisJobId) {
      const { data, error } = await client
        .from("analysis_jobs")
        .select("id, material_id, student_id, teacher_id, tenant_id, status, error_code, error_message, metadata")
        .eq("teacher_id", context.teacherId)
        .eq("id", analysisJobId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as {
        id: string;
        material_id: string;
        student_id: string;
        teacher_id: string;
        tenant_id: string | null;
        status: AnalysisJobStatus;
        error_code?: string | null;
        error_message?: string | null;
        metadata?: Record<string, unknown> | null;
      };
      return {
        id: row.id,
        materialId: row.material_id,
        studentId: row.student_id,
        teacherId: row.teacher_id,
        tenantId: row.tenant_id ?? undefined,
        status: row.status,
        errorCode: row.error_code ?? undefined,
        errorMessage: row.error_message ?? undefined,
        metadata: row.metadata ?? undefined
      } satisfies AnalysisJob;
    },

    async updateAnalysisJobStatus(context, analysisJobId, status, metadata) {
      const { error } = await client
        .from("analysis_jobs")
        .update({
          status,
          metadata: metadata ?? {},
          updated_at: new Date().toISOString()
        })
        .eq("teacher_id", context.teacherId)
        .eq("id", analysisJobId);

      if (error) throw error;
    }
  };
}

async function upsertPages(client: SupabaseClient, context: TrustedTeacherContext, packet: VisionEvidencePacket, packetId: string) {
  if (!packet.pages.length) return;
  const { error } = await client.from("material_pages").upsert(
    packet.pages.map((page) => ({
      teacher_id: context.teacherId,
      tenant_id: context.tenantId ?? null,
      student_id: packet.student_id,
      material_id: packet.material_id,
      vision_packet_id: packetId,
      page_id: page.page_id,
      page_index: page.page_index,
      page_image_ref: page.page_image_ref ?? null,
      width: page.width ?? null,
      height: page.height ?? null,
      image_quality_confidence: page.image_quality_confidence,
      quality_flags: page.quality_flags
    })),
    { onConflict: "teacher_id,material_id,page_id" }
  );
  if (error) throw error;
}

async function upsertQuestions(client: SupabaseClient, context: TrustedTeacherContext, packet: VisionEvidencePacket, packetId: string) {
  if (!packet.questions.length) return;
  const { error } = await client.from("material_questions").upsert(
    packet.questions.map((question) => ({
      teacher_id: context.teacherId,
      tenant_id: context.tenantId ?? null,
      student_id: packet.student_id,
      material_id: packet.material_id,
      vision_packet_id: packetId,
      page_id: question.page_id ?? question.regions[0]?.page_id ?? null,
      question_id: question.question_id,
      question_number: question.question_number ?? null,
      question_type_candidate: question.question_type_candidate ?? null,
      regions: question.regions as unknown as Record<string, unknown>[],
      confidence: question.confidence,
      risk_flags: question.risk_flags
    })),
    { onConflict: "teacher_id,material_id,question_id" }
  );
  if (error) throw error;
}

async function upsertEvidences(client: SupabaseClient, context: TrustedTeacherContext, packet: VisionEvidencePacket, packetId: string) {
  if (!packet.evidences.length) return;
  const { error } = await client.from("material_evidences").upsert(
    packet.evidences.map((evidence) => ({
      teacher_id: context.teacherId,
      tenant_id: context.tenantId ?? null,
      student_id: packet.student_id,
      material_id: packet.material_id,
      vision_packet_id: packetId,
      page_id: evidence.page_id,
      question_id: evidence.question_id,
      region_id: evidence.region_id ?? null,
      evidence_id: evidence.evidence_id,
      evidence_ref: evidence.evidence_ref,
      evidence_type: evidence.evidence_type,
      text: evidence.text ?? null,
      raw_ocr_text: evidence.raw_ocr_text ?? null,
      normalized_text: evidence.normalized_text ?? null,
      bbox: evidence.bbox as unknown as Record<string, unknown>,
      crop_ref: evidence.crop_ref ?? null,
      confidence: evidence.confidence,
      teacher_verified: evidence.teacher_verified,
      risk_flags: evidence.risk_flags
    })),
    { onConflict: "teacher_id,evidence_ref" }
  );
  if (error) throw error;
}

function assertTeacherContext(context: TrustedTeacherContext, packet: VisionEvidencePacket) {
  if (packet.teacher_id && packet.teacher_id !== context.teacherId) {
    throw new Error("VisionEvidencePacket teacher_id does not match trusted server teacher context.");
  }
}
