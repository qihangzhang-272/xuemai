import type { LessonLedgerInitialState } from "@/components/lessonledger/LessonLedgerApp";

export function firstWorkbenchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.replace(/[，、\s]+$/g, "") ?? null;
}

export function resolveLessonLedgerInitialState(params: Record<string, string | string[] | undefined>): LessonLedgerInitialState {
  const role = firstWorkbenchParam(params, "role");
  const view = firstWorkbenchParam(params, "view");
  const parentViewParam = firstWorkbenchParam(params, "parentView");
  const studentTab = firstWorkbenchParam(params, "studentTab");
  const scheduleTab = firstWorkbenchParam(params, "scheduleTab") ?? firstWorkbenchParam(params, "scheduleSection");
  const modal = firstWorkbenchParam(params, "modal");
  const studentId = firstWorkbenchParam(params, "studentId") ?? undefined;

  return {
    role: role === "parent" ? "parent" : "teacher",
    teacherView:
      view === "students" ||
      view === "classes" ||
      view === "schedule" ||
      view === "messages" ||
      view === "finance" ||
      view === "settings" ||
      view === "account" ||
      view === "updates"
        ? view
        : "dashboard",
    parentView:
      parentViewParam === "courses" ||
      parentViewParam === "billing" ||
      parentViewParam === "feedback" ||
      parentViewParam === "reports" ||
      parentViewParam === "booking" ||
      parentViewParam === "notifications" ||
      parentViewParam === "parentMessages" ||
      parentViewParam === "profile"
        ? parentViewParam
        : view === "courses" ||
            view === "billing" ||
            view === "feedback" ||
            view === "reports" ||
            view === "booking" ||
            view === "notifications" ||
            view === "parentMessages" ||
            view === "profile"
          ? view
          : "home",
    studentTab:
      studentTab === "weakness" || studentTab === "reports" || studentTab === "lessons" || studentTab === "payments" || studentTab === "timeline" || studentTab === "family"
        ? studentTab
        : "scores",
    scheduleSection:
      modal === "booking"
        ? "booking"
        : scheduleTab === "holiday" || scheduleTab === "booking" || scheduleTab === "table"
          ? scheduleTab
          : "table",
    modal:
      modal === "feedback" || modal === "attendance" || modal === "invite" || modal === "booking" || modal === "parentCommunication"
        ? modal
        : null,
    studentId
  };
}
