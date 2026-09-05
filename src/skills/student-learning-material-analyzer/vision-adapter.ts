import type {
  BoundingBox,
  GateStatus,
  MaterialGate,
  MaterialState,
  Polygon,
  VisionEvidence,
  VisionEvidencePacket,
  VisionEvidenceQuestion,
  VisionEvidenceType,
  VisionPipelineStageTrace,
  ValidationResult
} from "./types";

export type ExternalVisionSourceKind = "image" | "pdf" | "text" | "mock";

export type ExternalVisionPage = {
  page_id: string;
  page_index: number;
  page_image_ref?: string;
  width?: number;
  height?: number;
  image_quality_confidence?: number;
  quality_flags?: string[];
};

export type ExternalVisionRegionCandidate = {
  region_id?: string;
  region_role?: string;
  page_id?: string;
  bbox?: BoundingBox;
  polygon?: Polygon;
  crop_ref?: string;
  confidence?: number;
};

export type ExternalVisionEvidenceCandidate = {
  evidence_id: string;
  evidence_ref?: string;
  evidence_type: VisionEvidenceType;
  text?: string;
  raw_ocr_text?: string;
  normalized_text?: string;
  page_id?: string;
  question_id?: string;
  region_id?: string;
  bbox?: BoundingBox;
  polygon?: Polygon;
  crop_ref?: string;
  confidence?: number;
  teacher_verified?: boolean;
  risk_flags?: string[];
};

export type ExternalVisionQuestionCandidate = {
  question_id: string;
  question_number?: string;
  question_type_candidate?: string;
  page_id?: string;
  regions?: ExternalVisionRegionCandidate[];
  evidences?: ExternalVisionEvidenceCandidate[];
  confidence?: number;
  risk_flags?: string[];
};

export type ExternalVisionAdapterInput = {
  provider: string;
  providerRunId: string;
  providerModelVersion: string;
  materialId: string;
  sourceMaterialId?: string;
  studentId: string;
  teacherId?: string;
  tenantId?: string;
  studentIdentityStatus?: VisionEvidencePacket["student_identity_status"];
  sourceKind?: ExternalVisionSourceKind;
  createdAt?: string;
  materialStateHint?: MaterialState;
  pages: ExternalVisionPage[];
  questions: ExternalVisionQuestionCandidate[];
  pluginErrors?: VisionEvidencePacket["plugin_errors"];
  metadata?: Record<string, unknown>;
};

type VisionProviderCandidate = NonNullable<NonNullable<VisionEvidencePacket["pipeline_trace"]>["provider_candidates"]>[number];

const studentTraceTypes = new Set<VisionEvidenceType>([
  "student_original_answer",
  "student_revised_answer",
  "student_process",
  "student_note",
  "teacher_mark",
  "teacher_comment",
  "teacher_score"
]);

const answerBasisTypes = new Set<VisionEvidenceType>(["answer_key", "rubric"]);
const validVisionEvidenceTypes = new Set<string>([
  "question_stem",
  "student_original_answer",
  "student_revised_answer",
  "student_process",
  "student_note",
  "teacher_mark",
  "teacher_comment",
  "teacher_score",
  "answer_key",
  "rubric",
  "material_metadata"
]);
const validExternalSourceKinds = new Set<string>(["image", "pdf", "text", "mock"]);

const openSourceVisionProviderCandidates: Array<VisionProviderCandidate & { aliases: string[]; defaultFit: VisionProviderCandidate["fit"] }> = [
  {
    name: "paddleocr",
    aliases: ["paddleocr", "pp-ocr", "pp-structure", "pp-structurev3"],
    role: "document_parser",
    fit: "fallback_candidate",
    defaultFit: "fallback_candidate",
    license_note: "Apache-2.0 project; verify downloaded model/package licenses before production use.",
    evidence_source_url: "https://github.com/PaddlePaddle/PaddleOCR",
    notes: ["First OCR/Layout/Vision candidate for Chinese K12 material trials; still requires VisionEvidencePacket gates and human gold dataset reruns."]
  },
  {
    name: "paddlex",
    aliases: ["paddlex"],
    role: "deployment",
    fit: "fallback_candidate",
    defaultFit: "fallback_candidate",
    license_note: "Apache-2.0 project; deployment and model usage still need environment and license review.",
    evidence_source_url: "https://github.com/PaddlePaddle/PaddleX",
    notes: ["Productionization candidate for PaddleOCR pipelines, model composition, serving, and secondary development."]
  },
  {
    name: "docling",
    aliases: ["docling"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "MIT project; individual OCR/VLM model licenses and offline deployment requirements still need review.",
    evidence_source_url: "https://github.com/docling-project/docling",
    notes: ["Document conversion baseline for PDF/image/Office inputs, reading order, tables, formulas, Markdown and JSON; not a K12 student-trace judge."]
  },
  {
    name: "monkeyocr",
    aliases: ["monkeyocr", "monkey-ocr"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 repository, but model use is described as academic/non-commercial; review model terms before production use.",
    evidence_source_url: "https://github.com/Yuliang-Liu/MonkeyOCR",
    notes: ["Structure-recognition-relation document parsing candidate for Chinese/English layouts; K12 question attribution still requires VisionEvidencePacket gates."]
  },
  {
    name: "olmocr",
    aliases: ["olmocr", "olm-ocr"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; VLM weights, serving backend, GPU cost, and Chinese K12 coverage require trial review.",
    evidence_source_url: "https://github.com/allenai/olmocr",
    notes: ["PDF/image linearization baseline for Markdown reading order; not a student answer, teacher-mark, or question-correctness engine."]
  },
  {
    name: "deepseek-ocr",
    aliases: ["deepseek-ocr", "deepseekocr"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "MIT project; OCR model/deployment terms and the project boundary from DeepSeek text reasoning must be reviewed separately.",
    evidence_source_url: "https://github.com/deepseek-ai/DeepSeek-OCR",
    notes: ["External OCR/Vision candidate only. It must emit VisionEvidencePacket evidence before any text reasoning model sees the material."]
  },
  {
    name: "dots.mocr",
    aliases: ["dots.mocr", "dots-mocr", "dots_ocr", "dotsocr"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Review project license, model weights, GPU requirements, and student-data privacy boundaries before any production use.",
    evidence_source_url: "https://github.com/rednote-hilab/dots.mocr",
    notes: [
      "Multimodal document parsing candidate for layout, formula, table, and reading-order comparison; it must stay behind VisionEvidencePacket and human-gold gates."
    ]
  },
  {
    name: "pix2text",
    aliases: ["pix2text", "p2t"],
    role: "formula",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "MIT project; downstream model assets and optional VLM integrations must be reviewed separately.",
    evidence_source_url: "https://github.com/breezedeus/Pix2Text",
    notes: ["Specialty candidate for math formula/table/layout-to-Markdown comparison, not a K12 correctness judge."]
  },
  {
    name: "surya",
    aliases: ["surya", "surya-ocr"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Code is Apache-2.0, but model weights have commercial-use conditions; review before any production use.",
    evidence_source_url: "https://github.com/datalab-to/surya",
    notes: ["Benchmark candidate for bbox, polygon, reading order, and table recognition schema compatibility."]
  },
  {
    name: "mineru",
    aliases: ["mineru"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Review project and model licenses before production use.",
    evidence_source_url: "https://github.com/opendatalab/MinerU",
    notes: ["Candidate for complex PDF/image document parsing; K12 student trace attribution still needs adapter gates."]
  },
  {
    name: "marker",
    aliases: ["marker"],
    role: "document_parser",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "GPL-3.0 code and model/commercial terms require legal review before production use.",
    evidence_source_url: "https://github.com/datalab-to/marker",
    notes: ["Offline comparison candidate for PDF/image to Markdown/JSON and OCR-only block extraction."]
  },
  {
    name: "cnocr",
    aliases: ["cnocr"],
    role: "ocr",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; optional model assets may have separate terms.",
    evidence_source_url: "https://github.com/breezedeus/CnOCR",
    notes: ["Lightweight Chinese/English OCR baseline, not a layout or K12 question attribution solution."]
  },
  {
    name: "easyocr",
    aliases: ["easyocr", "easy-ocr"],
    role: "ocr",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; verify language-model performance on Chinese K12 photos before use.",
    evidence_source_url: "https://github.com/JaidedAI/EasyOCR",
    notes: ["Multilingual OCR baseline for text detection/recognition comparison; it does not provide K12 question evidence gates."]
  },
  {
    name: "rapidocr",
    aliases: ["rapidocr"],
    role: "ocr",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Review OCR backend and model licenses before production use.",
    evidence_source_url: "https://github.com/RapidAI/RapidOCR",
    notes: ["Lightweight OCR deployment baseline; does not replace question segmentation or student evidence gates."]
  },
  {
    name: "tesseract",
    aliases: ["tesseract", "tesseract-ocr"],
    role: "ocr",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; use only as a traditional OCR baseline for K12 material trials.",
    evidence_source_url: "https://github.com/tesseract-ocr/tesseract",
    notes: ["Traditional OCR baseline for offline smoke comparison; Chinese handwriting and complex test layouts require separate evidence gates."]
  },
  {
    name: "doctr",
    aliases: ["doctr", "doc-tr", "mindee-doctr"],
    role: "ocr",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; model/package terms and Chinese K12 coverage need trial review.",
    evidence_source_url: "https://github.com/mindee/doctr",
    notes: ["Document OCR baseline for page/block/line/word style extraction; not a student-material reasoning system."]
  },
  {
    name: "doclayout-yolo",
    aliases: ["doclayout-yolo", "doclayout_yolo"],
    role: "layout",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "AGPL-3.0 project; avoid production dependency until commercial compliance is reviewed.",
    evidence_source_url: "https://github.com/opendatalab/DocLayout-YOLO",
    notes: ["Layout-only benchmark candidate for region detection."]
  },
  {
    name: "layoutparser",
    aliases: ["layoutparser", "layout-parser"],
    role: "layout",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; bundled model licenses and maintenance status still need review.",
    evidence_source_url: "https://github.com/Layout-Parser/layout-parser",
    notes: ["Offline layout tooling candidate, not a default OCR/Vision provider."]
  },
  {
    name: "latex-ocr",
    aliases: ["latex-ocr", "pix2tex", "latexocr"],
    role: "formula",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "MIT project; formula-recognition model assets and deployment terms should still be reviewed.",
    evidence_source_url: "https://github.com/lukas-blecher/LaTeX-OCR",
    notes: ["Formula crop-to-LaTeX comparison candidate; cannot judge student correctness or full-question context."]
  },
  {
    name: "unimernet",
    aliases: ["unimernet", "unimer", "unimer-net"],
    role: "formula",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Apache-2.0 project; formula-recognition model assets and deployment terms should still be reviewed.",
    evidence_source_url: "https://github.com/opendatalab/UniMERNet",
    notes: ["Real-world mathematical expression recognition benchmark candidate for formula crops only; it cannot judge full-question correctness or student mistake causes."]
  },
  {
    name: "mmocr",
    aliases: ["mmocr"],
    role: "ocr",
    fit: "benchmark_only",
    defaultFit: "benchmark_only",
    license_note: "Review OpenMMLab code/model licenses before custom training or production use.",
    evidence_source_url: "https://github.com/open-mmlab/mmocr",
    notes: ["Research/training candidate if custom OCR or text detection becomes necessary."]
  }
];

export function validateExternalVisionAdapterInput(value: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ["ExternalVisionAdapterInput must be an object"], warnings };
  }

  const input = value as Partial<ExternalVisionAdapterInput>;
  for (const field of ["provider", "providerRunId", "providerModelVersion", "materialId", "studentId"] as const) {
    if (!readString(input[field])) errors.push(`${field} is required`);
    checkNoTemplatePlaceholder(input[field], field, errors);
  }
  for (const field of ["sourceMaterialId", "teacherId", "tenantId"] as const) {
    checkNoTemplatePlaceholder(input[field], field, errors);
  }
  if (input.sourceKind && !validExternalSourceKinds.has(input.sourceKind)) {
    errors.push(`sourceKind=${input.sourceKind} is not supported`);
  }

  if (!Array.isArray(input.pages)) errors.push("pages must be an array");
  if (!Array.isArray(input.questions)) errors.push("questions must be an array");

  const pages = Array.isArray(input.pages) ? input.pages : [];
  const questions = Array.isArray(input.questions) ? input.questions : [];
  if (!pages.length) errors.push("pages must not be empty");
  if (!questions.length) errors.push("questions must not be empty");

  const pageIds = new Set<string>();
  const questionIds = new Set<string>();
  const regionIds = new Set<string>();
  const regionQuestionIds = new Map<string, string>();
  const regionPageIds = new Map<string, string>();
  const evidenceIds = new Set<string>();
  const evidenceRefs = new Set<string>();

  pages.forEach((page, index) => {
    if (!isRecord(page)) {
      errors.push(`pages[${index}] must be an object`);
      return;
    }
    const pageId = readString(page.page_id);
    if (!pageId) {
      errors.push(`pages[${index}].page_id is required`);
    } else if (pageIds.has(pageId)) {
      errors.push(`pages duplicate page_id=${pageId}`);
    } else {
      pageIds.add(pageId);
    }
    checkNoTemplatePlaceholder(page.page_id, `pages[${index}].page_id`, errors);
    checkNoTemplatePlaceholder(page.page_image_ref, `pages[${index}].page_image_ref`, errors);
    if (typeof page.page_index !== "number") errors.push(`pages[${index}].page_index must be a number`);
    checkOptionalConfidence(page.image_quality_confidence, `pages[${index}].image_quality_confidence`, errors);
    if (page.quality_flags && !Array.isArray(page.quality_flags)) errors.push(`pages[${index}].quality_flags must be an array when present`);
  });

  questions.forEach((question, questionIndex) => {
    if (!isRecord(question)) {
      errors.push(`questions[${questionIndex}] must be an object`);
      return;
    }
    const questionId = readString(question.question_id);
    if (!questionId) {
      errors.push(`questions[${questionIndex}].question_id is required`);
    } else if (questionIds.has(questionId)) {
      errors.push(`questions duplicate question_id=${questionId}`);
    } else {
      questionIds.add(questionId);
    }
    checkNoTemplatePlaceholder(question.question_id, `questions[${questionIndex}].question_id`, errors);
    checkNoTemplatePlaceholder(question.question_number, `questions[${questionIndex}].question_number`, errors);
    checkNoTemplatePlaceholder(question.question_type_candidate, `questions[${questionIndex}].question_type_candidate`, errors);
    const questionPageId = readString(question.page_id);
    if (questionPageId && !pageIds.has(questionPageId)) errors.push(`questions[${questionIndex}].page_id=${questionPageId} missing from pages`);
    checkNoTemplatePlaceholder(question.page_id, `questions[${questionIndex}].page_id`, errors);
    checkOptionalConfidence(question.confidence, `questions[${questionIndex}].confidence`, errors);
    if (question.risk_flags && !Array.isArray(question.risk_flags)) errors.push(`questions[${questionIndex}].risk_flags must be an array when present`);

    const regions = Array.isArray(question.regions) ? question.regions : [];
    if (question.regions && !Array.isArray(question.regions)) errors.push(`questions[${questionIndex}].regions must be an array when present`);
    regions.forEach((region, regionIndex) => {
      if (!isRecord(region)) {
        errors.push(`questions[${questionIndex}].regions[${regionIndex}] must be an object`);
        return;
      }
      const regionId = readString(region.region_id);
      if (regionId) {
        if (regionIds.has(regionId)) errors.push(`questions duplicate region_id=${regionId}`);
        regionIds.add(regionId);
        if (questionId) regionQuestionIds.set(regionId, questionId);
        const resolvedRegionPageId = readString(region.page_id) || questionPageId;
        if (resolvedRegionPageId) regionPageIds.set(regionId, resolvedRegionPageId);
      }
      checkNoTemplatePlaceholder(region.region_id, `questions[${questionIndex}].regions[${regionIndex}].region_id`, errors);
      checkNoTemplatePlaceholder(region.region_role, `questions[${questionIndex}].regions[${regionIndex}].region_role`, errors);
      const regionPageId = readString(region.page_id);
      if (regionPageId && !pageIds.has(regionPageId)) errors.push(`questions[${questionIndex}].regions[${regionIndex}].page_id=${regionPageId} missing from pages`);
      checkNoTemplatePlaceholder(region.page_id, `questions[${questionIndex}].regions[${regionIndex}].page_id`, errors);
      checkNoTemplatePlaceholder(region.crop_ref, `questions[${questionIndex}].regions[${regionIndex}].crop_ref`, errors);
      checkOptionalGeometry(region, `questions[${questionIndex}].regions[${regionIndex}]`, errors);
      if (!hasCandidateGeometry(region)) warnings.push(`questions[${questionIndex}].regions[${regionIndex}] lacks bbox/polygon/crop_ref; downstream judgement must route to teacher review`);
      checkOptionalConfidence(region.confidence, `questions[${questionIndex}].regions[${regionIndex}].confidence`, errors);
    });

    const evidences = Array.isArray(question.evidences) ? question.evidences : [];
    if (question.evidences && !Array.isArray(question.evidences)) errors.push(`questions[${questionIndex}].evidences must be an array when present`);
    evidences.forEach((evidence, evidenceIndex) => {
      if (!isRecord(evidence)) {
        errors.push(`questions[${questionIndex}].evidences[${evidenceIndex}] must be an object`);
        return;
      }
      const prefix = `questions[${questionIndex}].evidences[${evidenceIndex}]`;
      const evidenceId = readString(evidence.evidence_id);
      if (!evidenceId) {
        errors.push(`${prefix}.evidence_id is required`);
      } else if (evidenceIds.has(evidenceId)) {
        errors.push(`evidences duplicate evidence_id=${evidenceId}`);
      } else {
        evidenceIds.add(evidenceId);
      }
      checkNoTemplatePlaceholder(evidence.evidence_id, `${prefix}.evidence_id`, errors);
      const evidenceRef = readString(evidence.evidence_ref);
      if (evidenceRef) {
        if (evidenceRefs.has(evidenceRef)) errors.push(`evidences duplicate evidence_ref=${evidenceRef}`);
        evidenceRefs.add(evidenceRef);
      }
      checkNoTemplatePlaceholder(evidence.evidence_ref, `${prefix}.evidence_ref`, errors);
      const evidenceType = readString(evidence.evidence_type);
      if (!evidenceType) {
        errors.push(`${prefix}.evidence_type is required`);
      } else if (!validVisionEvidenceTypes.has(evidenceType)) {
        errors.push(`${prefix}.evidence_type=${evidenceType} is not supported`);
      }
      const evidenceQuestionId = readString(evidence.question_id);
      if (evidenceQuestionId && evidenceQuestionId !== questionId) errors.push(`${prefix}.question_id=${evidenceQuestionId} must match parent question_id=${questionId}`);
      checkNoTemplatePlaceholder(evidence.question_id, `${prefix}.question_id`, errors);
      const evidencePageId = readString(evidence.page_id);
      if (evidencePageId && !pageIds.has(evidencePageId)) errors.push(`${prefix}.page_id=${evidencePageId} missing from pages`);
      checkNoTemplatePlaceholder(evidence.page_id, `${prefix}.page_id`, errors);
      const evidenceRegionId = readString(evidence.region_id);
      if (evidenceRegionId && !regionIds.has(evidenceRegionId)) {
        errors.push(`${prefix}.region_id=${evidenceRegionId} missing from question regions`);
      } else if (evidenceRegionId) {
        const regionQuestionId = regionQuestionIds.get(evidenceRegionId);
        if (questionId && regionQuestionId && regionQuestionId !== questionId) {
          errors.push(`${prefix}.region_id=${evidenceRegionId} belongs to question_id=${regionQuestionId}, not parent question_id=${questionId}`);
        }
        const regionPageId = regionPageIds.get(evidenceRegionId);
        if (evidencePageId && regionPageId && regionPageId !== evidencePageId) {
          errors.push(`${prefix}.region_id=${evidenceRegionId} belongs to page_id=${regionPageId}, not evidence.page_id=${evidencePageId}`);
        }
      }
      checkNoTemplatePlaceholder(evidence.region_id, `${prefix}.region_id`, errors);
      checkNoTemplatePlaceholder(evidence.crop_ref, `${prefix}.crop_ref`, errors);
      checkOptionalGeometry(evidence, prefix, errors);
      if (!readString(evidence.text) && !readString(evidence.raw_ocr_text) && !readString(evidence.normalized_text)) {
        warnings.push(`${prefix} has no text/raw_ocr_text/normalized_text; downstream evidence should be teacher-reviewed`);
      }
      if (!hasCandidateGeometry(evidence)) warnings.push(`${prefix} lacks bbox/polygon/crop_ref; downstream judgement must route to teacher review`);
      checkOptionalConfidence(evidence.confidence, `${prefix}.confidence`, errors);
      if (evidence.risk_flags && !Array.isArray(evidence.risk_flags)) errors.push(`${prefix}.risk_flags must be an array when present`);
    });
  });

  if (input.pluginErrors && !Array.isArray(input.pluginErrors)) {
    errors.push("pluginErrors must be an array when present");
  } else {
    input.pluginErrors?.forEach((pluginError, index) => {
      if (!isRecord(pluginError)) {
        errors.push(`pluginErrors[${index}] must be an object`);
        return;
      }
      if (!readString(pluginError.code)) errors.push(`pluginErrors[${index}].code is required`);
      if (!readString(pluginError.message)) errors.push(`pluginErrors[${index}].message is required`);
      checkNoTemplatePlaceholder(pluginError.code, `pluginErrors[${index}].code`, errors);
      if (typeof pluginError.recoverable !== "boolean") errors.push(`pluginErrors[${index}].recoverable must be boolean`);
      if (pluginError.recoverable === false) warnings.push(`pluginErrors[${index}] is unrecoverable; generated packet should block or degrade downstream analysis`);
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function createVisionEvidencePacketFromExternalProvider(input: ExternalVisionAdapterInput): VisionEvidencePacket {
  const inputValidation = validateExternalVisionAdapterInput(input);
  if (!inputValidation.ok) {
    throw new Error(`ExternalVisionAdapterInput is invalid: ${inputValidation.errors.join("；")}`);
  }

  const sourceMaterialId = input.sourceMaterialId ?? input.materialId;
  const firstPageId = input.pages[0]?.page_id ?? "p01";
  const pages = input.pages.map((page) => ({
    page_id: page.page_id,
    page_index: page.page_index,
    page_image_ref: page.page_image_ref,
    width: page.width,
    height: page.height,
    image_quality_confidence: clampConfidence(page.image_quality_confidence ?? 0.85),
    quality_flags: uniqueStrings(page.quality_flags ?? [])
  }));
  const questions = input.questions.map((question, questionIndex) => toVisionQuestion(question, questionIndex, firstPageId));
  const evidences = input.questions.flatMap((question) =>
    (question.evidences ?? []).map((evidence) => toVisionEvidence(evidence, question, sourceMaterialId, firstPageId))
  );
  const materialState = input.materialStateHint ?? inferMaterialState({ pages, evidences });
  const gates = buildAdapterGates({ materialState, questions, evidences, pages });

  return {
    schema_version: "vision_evidence_packet.v0.4",
    plugin_run_id: input.providerRunId,
    material_id: input.materialId,
    source_material_id: sourceMaterialId,
    tenant_id: input.tenantId,
    teacher_id: input.teacherId,
    student_id: input.studentId,
    student_identity_status: input.studentIdentityStatus ?? "confirmed",
    plugin_provider: input.provider,
    plugin_model_version: input.providerModelVersion,
    material_state: materialState,
    created_at: input.createdAt ?? new Date().toISOString(),
    pages,
    questions,
    evidences,
    gates,
    plugin_errors: input.pluginErrors ?? [],
    pipeline_trace: buildPipelineTrace({
      input,
      pages,
      questions,
      evidences,
      gates
    }),
    metadata: {
      ...input.metadata,
      adapter: "external_vision_provider_v0.1"
    }
  };
}

function toVisionQuestion(question: ExternalVisionQuestionCandidate, questionIndex: number, firstPageId: string): VisionEvidenceQuestion {
  const pageId = question.page_id ?? firstPageId;
  return {
    question_id: question.question_id,
    question_number: question.question_number,
    question_type_candidate: question.question_type_candidate,
    page_id: pageId,
    regions: (question.regions ?? []).map((region, regionIndex) => ({
      region_id: region.region_id ?? `${question.question_id}_region_${regionIndex + 1}`,
      region_role: region.region_role ?? "question_region",
      page_id: region.page_id ?? pageId,
      bbox: region.bbox,
      polygon: region.polygon,
      crop_ref: region.crop_ref,
      confidence: clampConfidence(region.confidence ?? question.confidence ?? 0.8)
    })),
    confidence: clampConfidence(question.confidence ?? 0.8),
    risk_flags: uniqueStrings(question.risk_flags ?? (question.regions?.some((region) => !region.crop_ref) ? ["crop_missing"] : []))
  };
}

function toVisionEvidence(
  evidence: ExternalVisionEvidenceCandidate,
  question: ExternalVisionQuestionCandidate,
  sourceMaterialId: string,
  firstPageId: string
): VisionEvidence {
  const pageId = evidence.page_id ?? question.page_id ?? firstPageId;
  const questionId = evidence.question_id ?? question.question_id;
  const evidenceRef =
    evidence.evidence_ref ??
    `material.${sanitizeRefSegment(sourceMaterialId)}.page_${sanitizeRefSegment(pageId)}.question_${sanitizeRefSegment(questionId)}.${sanitizeRefSegment(
      evidence.evidence_id
    )}`;
  const text = evidence.text ?? evidence.normalized_text ?? evidence.raw_ocr_text;

  return {
    evidence_id: evidence.evidence_id,
    evidence_ref: evidenceRef,
    source_material_id: sourceMaterialId,
    page_id: pageId,
    question_id: questionId,
    region_id: evidence.region_id,
    evidence_type: evidence.evidence_type,
    text,
    raw_ocr_text: evidence.raw_ocr_text ?? text,
    normalized_text: evidence.normalized_text ?? text,
    bbox: evidence.bbox,
    polygon: evidence.polygon,
    crop_ref: evidence.crop_ref,
    confidence: clampConfidence(evidence.confidence ?? 0.8),
    teacher_verified: evidence.teacher_verified ?? false,
    risk_flags: uniqueStrings(evidence.risk_flags ?? [])
  };
}

function inferMaterialState(input: {
  pages: VisionEvidencePacket["pages"];
  evidences: VisionEvidence[];
}): MaterialState {
  const lowQuality = input.pages.length > 0 && input.pages.every((page) => page.image_quality_confidence < 0.65 || page.quality_flags.includes("low_image_quality"));
  if (lowQuality) return "low_quality";
  if (!input.evidences.some((evidence) => studentTraceTypes.has(evidence.evidence_type))) return "insufficient_student_trace";
  return "valid_student_material";
}

function buildAdapterGates(input: {
  materialState: MaterialState;
  questions: VisionEvidenceQuestion[];
  evidences: VisionEvidence[];
  pages: VisionEvidencePacket["pages"];
}): MaterialGate[] {
  const studentTraceRefs = input.evidences.filter((evidence) => studentTraceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref);
  const answerBasisRefs = input.evidences.filter((evidence) => answerBasisTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref);
  const questionEvidenceRefs = input.evidences.map((evidence) => evidence.evidence_ref);
  const lowQuality = input.materialState === "low_quality" || input.pages.some((page) => page.image_quality_confidence < 0.65 || page.quality_flags.includes("low_image_quality"));
  const segmentationUnstable = input.questions.some(
    (question) =>
      question.confidence < 0.65 ||
      !question.regions.length ||
      question.risk_flags.length > 0 ||
      question.regions.some((region) => region.confidence < 0.65 || !region.crop_ref || (!region.bbox && !region.polygon))
  );

  return [
    gate("image_quality", lowQuality ? "degrade" : "pass", lowQuality ? "图像质量不足，后续结论需要降级或复核。" : "页面图像质量达到结构化解析阈值。", []),
    gate(
      "student_trace",
      studentTraceRefs.length ? "pass" : "block",
      studentTraceRefs.length ? "识别到学生作答、订正、笔记或老师批改痕迹。" : "未识别到学生作答、订正、批改或笔记痕迹，不能推断学生能力。",
      studentTraceRefs
    ),
    gate(
      "question_segmentation",
      segmentationUnstable ? "degrade" : "pass",
      segmentationUnstable ? "题目边界、crop_ref 或区域置信度不足，确定性正误判断必须进入老师复核。" : "题目区域、几何坐标和 crop_ref 可用于逐题证据归属。",
      questionEvidenceRefs
    ),
    gate("answer_key", answerBasisRefs.length ? "pass" : "degrade", answerBasisRefs.length ? "识别到同题标准答案或评分点。" : "未识别到同题标准答案或评分点，正误判断需要降级。", answerBasisRefs)
  ];
}

function buildPipelineTrace(input: {
  input: ExternalVisionAdapterInput;
  pages: VisionEvidencePacket["pages"];
  questions: VisionEvidenceQuestion[];
  evidences: VisionEvidence[];
  gates: MaterialGate[];
}): VisionEvidencePacket["pipeline_trace"] {
  const provider = input.input.provider;
  const questionRegions = input.questions.flatMap((question) => question.regions);
  const textEvidence = input.evidences.filter((evidence) => evidence.text || evidence.raw_ocr_text || evidence.normalized_text);
  const studentTraceEvidence = input.evidences.filter((evidence) => studentTraceTypes.has(evidence.evidence_type));
  const answerBasisEvidence = input.evidences.filter((evidence) => answerBasisTypes.has(evidence.evidence_type));
  const questionSegmentationGate = input.gates.find((gate) => gate.gate_id === "question_segmentation");
  const studentTraceGate = input.gates.find((gate) => gate.gate_id === "student_trace");
  const answerKeyGate = input.gates.find((gate) => gate.gate_id === "answer_key");
  const providerCandidates = buildProviderCandidates(provider);

  return {
    selected_provider: provider,
    provider_candidates: providerCandidates,
    preprocessing: {
      source_kind: input.input.sourceKind ?? "image",
      rendered_page_count: input.pages.length,
      quality_notes: uniqueStrings(input.pages.flatMap((page) => page.quality_flags))
    },
    stages: [
      stage("page_rendering", provider, input.input.providerModelVersion, input.pages.length ? "pass" : "block", average(input.pages.map((page) => page.image_quality_confidence)), input.pages.map((page) => page.page_id), []),
      stage(
        "layout_detection",
        provider,
        input.input.providerModelVersion,
        questionRegions.length ? "pass" : "block",
        average(questionRegions.map((region) => region.confidence)),
        questionRegions.map((region) => region.region_id),
        input.questions.flatMap((question) => question.risk_flags)
      ),
      stage(
        "ocr_text_recognition",
        provider,
        input.input.providerModelVersion,
        textEvidence.length ? "pass" : "degrade",
        average(textEvidence.map((evidence) => evidence.confidence)),
        textEvidence.map((evidence) => evidence.evidence_ref),
        textEvidence.flatMap((evidence) => evidence.risk_flags)
      ),
      stage(
        "question_segmentation",
        provider,
        input.input.providerModelVersion,
        questionSegmentationGate?.status ?? "degrade",
        average(input.questions.map((question) => question.confidence)),
        input.questions.map((question) => question.question_id),
        questionSegmentationGate?.risk_flags ?? []
      ),
      stage(
        "student_trace_detection",
        provider,
        input.input.providerModelVersion,
        studentTraceGate?.status ?? "block",
        average(studentTraceEvidence.map((evidence) => evidence.confidence)),
        studentTraceEvidence.map((evidence) => evidence.evidence_ref),
        studentTraceGate?.risk_flags ?? []
      ),
      stage(
        "answer_key_alignment",
        provider,
        input.input.providerModelVersion,
        answerKeyGate?.status ?? "degrade",
        average(answerBasisEvidence.map((evidence) => evidence.confidence)),
        answerBasisEvidence.map((evidence) => evidence.evidence_ref),
        answerKeyGate?.risk_flags ?? []
      )
    ],
    question_segmentation_policy: {
      definitive_question_requires_crop_ref: true,
      uncertain_boundary_routes_to_review: true,
      question_id_namespace: `external:${sanitizeRefSegment(input.input.providerRunId)}`
    },
    evaluation_asset_policy: {
      raw_student_material_retained_outside_gold_json: true,
      human_gold_required_for_99_claim: true,
      provider_change_requires_dataset_rerun: true
    }
  };
}

function stage(
  stageId: VisionPipelineStageTrace["stage_id"],
  provider: string,
  modelVersion: string,
  status: GateStatus | VisionPipelineStageTrace["status"],
  confidence: number,
  outputRefs: string[],
  riskFlags: string[]
): VisionPipelineStageTrace {
  return {
    stage_id: stageId,
    provider,
    model_version: modelVersion,
    status,
    confidence: clampConfidence(confidence),
    output_refs: uniqueStrings(outputRefs),
    risk_flags: uniqueStrings(riskFlags)
  };
}

function gate(gateId: string, status: GateStatus, reason: string, evidenceRefs: string[]): MaterialGate {
  return {
    gate_id: gateId,
    status,
    reason,
    evidenceRefs: uniqueStrings(evidenceRefs),
    risk_flags: status === "pass" ? [] : [gateId]
  };
}

function buildProviderCandidates(selectedProvider: string): VisionProviderCandidate[] {
  const normalizedSelected = normalizeProviderName(selectedProvider);
  const candidates = openSourceVisionProviderCandidates.map(({ aliases, defaultFit, ...candidate }) => ({
    ...candidate,
    fit: aliases.map(normalizeProviderName).includes(normalizedSelected) ? "primary_candidate" : defaultFit
  }));
  if (!candidates.some((candidate) => candidate.fit === "primary_candidate")) {
    return [
      {
        name: selectedProvider,
        role: inferProviderRole(selectedProvider),
        fit: "primary_candidate",
        license_note: "Adapter records provider identity only; production use still requires model/package license review.",
        notes: ["External OCR/Layout/Vision output is normalized before any text reasoning model call."]
      },
      ...candidates
    ];
  }
  return candidates;
}

function inferProviderRole(provider: string): VisionProviderCandidate["role"] {
  const normalized = normalizeProviderName(provider);
  const known = openSourceVisionProviderCandidates.find((candidate) => candidate.aliases.map(normalizeProviderName).includes(normalized));
  if (known) return known.role;
  if (normalized.includes("ocr")) return "ocr";
  if (normalized.includes("layout")) return "layout";
  if (normalized.includes("formula") || normalized.includes("math")) return "formula";
  if (normalized.includes("table")) return "table";
  if (normalized.includes("segment")) return "question_segmentation";
  return "document_parser";
}

function normalizeProviderName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function average(values: number[]) {
  const usableValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!usableValues.length) return 0;
  return usableValues.reduce((sum, value) => sum + value, 0) / usableValues.length;
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function sanitizeRefSegment(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return normalized || "unknown";
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function hasCandidateGeometry(value: Record<string, unknown>) {
  return Boolean(value.bbox || value.polygon || readString(value.crop_ref));
}

function checkNoTemplatePlaceholder(value: unknown, fieldPath: string, errors: string[]) {
  const text = readString(value);
  if (!text) return;
  if (/<[^<>]+>/.test(text) || /^(todo|tbd|replace_me|placeholder)$/i.test(text)) {
    errors.push(`${fieldPath} contains template placeholder; replace it with real anonymized provider output`);
  }
}

function checkOptionalGeometry(value: Record<string, unknown>, fieldPath: string, errors: string[]) {
  if (value.bbox !== undefined) checkBoundingBox(value.bbox, `${fieldPath}.bbox`, errors);
  if (value.polygon !== undefined) checkPolygon(value.polygon, `${fieldPath}.polygon`, errors);
}

function checkBoundingBox(value: unknown, fieldPath: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${fieldPath} must be an object when present`);
    return;
  }
  const x1 = readFiniteNumber(value.x1);
  const y1 = readFiniteNumber(value.y1);
  const x2 = readFiniteNumber(value.x2);
  const y2 = readFiniteNumber(value.y2);
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    errors.push(`${fieldPath} must include finite x1, y1, x2, and y2`);
    return;
  }
  if (x2 <= x1 || y2 <= y1) {
    errors.push(`${fieldPath} must have x2 > x1 and y2 > y1`);
  }
  const coordSpace = readString(value.coord_space);
  if (coordSpace && coordSpace !== "normalized" && coordSpace !== "pixel") {
    errors.push(`${fieldPath}.coord_space must be normalized or pixel when present`);
  }
  if (coordSpace === "normalized" && ![x1, y1, x2, y2].every((number) => number >= 0 && number <= 1)) {
    errors.push(`${fieldPath} normalized coordinates must be between 0 and 1`);
  }
  if (coordSpace === "pixel" && ![x1, y1, x2, y2].every((number) => number >= 0)) {
    errors.push(`${fieldPath} pixel coordinates must be non-negative`);
  }
}

function checkPolygon(value: unknown, fieldPath: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${fieldPath} must be an object when present`);
    return;
  }
  const points = Array.isArray(value.points) ? value.points : undefined;
  if (!points || points.length < 3) {
    errors.push(`${fieldPath}.points must include at least 3 points`);
    return;
  }
  const coordSpace = readString(value.coord_space);
  if (coordSpace && coordSpace !== "normalized" && coordSpace !== "pixel") {
    errors.push(`${fieldPath}.coord_space must be normalized or pixel when present`);
  }
  points.forEach((point, index) => {
    if (!isRecord(point)) {
      errors.push(`${fieldPath}.points[${index}] must be an object`);
      return;
    }
    const x = readFiniteNumber(point.x);
    const y = readFiniteNumber(point.y);
    if (x === undefined || y === undefined) {
      errors.push(`${fieldPath}.points[${index}] must include finite x and y`);
      return;
    }
    if (coordSpace === "normalized" && (x < 0 || x > 1 || y < 0 || y > 1)) {
      errors.push(`${fieldPath}.points[${index}] normalized coordinates must be between 0 and 1`);
    }
    if (coordSpace === "pixel" && (x < 0 || y < 0)) {
      errors.push(`${fieldPath}.points[${index}] pixel coordinates must be non-negative`);
    }
  });
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function checkOptionalConfidence(value: unknown, fieldPath: string, errors: string[]) {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    errors.push(`${fieldPath} must be a number between 0 and 1 when present`);
  }
}
