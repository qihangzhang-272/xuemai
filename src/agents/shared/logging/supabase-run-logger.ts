import { getSupabaseServerClient } from "../tools/supabase-server-client";
import type { RunLogger } from "./run-logger";

export function createSupabaseRunLogger(): RunLogger {
  return {
    startRun: async (input) => {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("agent_runs")
        .insert({
          agent_name: input.agent_name,
          agent_version: input.agent_version,
          teacher_id: input.teacher_id,
          student_id: input.student_id,
          class_id: input.class_id,
          task_id: input.task_id,
          input: input.input,
          context_summary: input.context_summary,
          context_record_ids: input.context_record_ids,
          status: input.status,
          warnings: input.warnings ?? []
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to create agent run: ${error.message}`);
      }

      return { id: data?.id as string | undefined };
    },
    completeRun: async (input) => {
      if (!input.id) return;

      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from("agent_runs")
        .update({
          status: input.status,
          raw_model_output: input.raw_model_output,
          final_output: input.final_output,
          context_summary: input.context_summary,
          context_record_ids: input.context_record_ids,
          quality_score: input.quality_score,
          warnings: input.warnings ?? [],
          latency_ms: input.latency_ms,
          token_usage: input.token_usage
        })
        .eq("id", input.id);

      if (error) {
        throw new Error(`Failed to complete agent run: ${error.message}`);
      }
    },
    failRun: async (input) => {
      if (!input.id) return;

      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from("agent_runs")
        .update({
          status: input.status,
          error_code: input.error_code,
          error_message: input.error_message,
          warnings: input.warnings ?? [],
          latency_ms: input.latency_ms
        })
        .eq("id", input.id);

      if (error) {
        throw new Error(`Failed to fail agent run: ${error.message}`);
      }
    },
    recordOutput: async (input) => {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("agent_outputs")
        .insert({
          agent_run_id: input.agent_run_id,
          agent_name: input.agent_name,
          teacher_id: input.teacher_id,
          student_id: input.student_id,
          class_id: input.class_id,
          output_type: input.output_type,
          output_text: input.output_text,
          output_json: input.output_json,
          quality_score: input.quality_score,
          status: input.status,
          is_final: input.is_final
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to record agent output: ${error.message}`);
      }

      return { id: data?.id as string | undefined };
    }
  };
}
