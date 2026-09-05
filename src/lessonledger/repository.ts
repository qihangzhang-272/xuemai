import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createLessonLedgerSeed } from "./seed";
import type { LessonLedgerFinanceEvent, LessonLedgerSnapshot } from "./types";

export type LessonLedgerRepository = {
  getSnapshot(): LessonLedgerSnapshot;
  replaceSnapshot(snapshot: LessonLedgerSnapshot): LessonLedgerSnapshot;
  updateSnapshot(updater: (snapshot: LessonLedgerSnapshot) => LessonLedgerSnapshot): LessonLedgerSnapshot;
  reset(): LessonLedgerSnapshot;
};

let inMemorySnapshot: LessonLedgerSnapshot | undefined;
const defaultStorePath = join(process.cwd(), ".lessonledger-data", "demo-store.json");

function cloneSnapshot(snapshot: LessonLedgerSnapshot): LessonLedgerSnapshot {
  return structuredClone(snapshot);
}

function compareVersion(a: string, b: string) {
  const left = a.split(".").map((part) => Number(part) || 0);
  const right = b.split(".").map((part) => Number(part) || 0);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function financeEventKey(event: LessonLedgerFinanceEvent) {
  return `${event.date}|${event.action}|${event.amount}|${event.note}`;
}

function legacyInviteToken(inviteId: string) {
  return Buffer.from(inviteId).toString("hex").padEnd(64, "0").slice(0, 64);
}

function normalizeDemoFinanceEvent(event: LessonLedgerFinanceEvent) {
  if (event.studentId !== "s1") {
    return event;
  }

  if (event.note === "家长转账确认" && event.amount === "+20 课时" && event.balance === "22 课时") {
    return {
      ...event,
      amount: "+15 课时",
      balance: "15 课时"
    };
  }

  const demoBalanceMap: Record<string, string> = {
    "入门小测讲评": "14 课时",
    "圆锥曲线专题": "13 课时",
    "临时请假未扣课": "14 课时",
    "课堂完成后自动记录": "13 课时"
  };
  const migratedBalance = demoBalanceMap[event.note];

  return migratedBalance ? { ...event, balance: migratedBalance } : event;
}

function normalizeFinanceEvents(snapshotEvents: LessonLedgerFinanceEvent[] | undefined, seedEvents: LessonLedgerFinanceEvent[]) {
  const seedByKey = new Map(seedEvents.map((event) => [financeEventKey(event), event]));
  const normalizedEvents = (snapshotEvents ?? seedEvents).map((rawEvent) => {
    const event = normalizeDemoFinanceEvent(rawEvent);
    const seedEvent = seedByKey.get(financeEventKey(event));

    return {
      ...seedEvent,
      ...event,
      studentId: event.studentId ?? seedEvent?.studentId ?? "s1",
      studentName: event.studentName ?? seedEvent?.studentName ?? "李三",
      cashAmount: event.cashAmount ?? seedEvent?.cashAmount
    };
  });
  const existingKeys = new Set(normalizedEvents.map(financeEventKey));
  const missingSeedEvents = seedEvents.filter((event) => !existingKeys.has(financeEventKey(event)));

  return [...normalizedEvents, ...missingSeedEvents];
}

function normalizeDemoRemainingLessons(studentId: string, remainingLessons: number) {
  return studentId === "s1" && remainingLessons === 18 ? 13 : remainingLessons;
}

function normalizeSnapshot(snapshot: LessonLedgerSnapshot): LessonLedgerSnapshot {
  const seed = createLessonLedgerSeed();
  const snapshotLatestVersion = snapshot.updateState?.latestVersion ?? seed.updateState.latestVersion;
  const latestVersion =
    compareVersion(snapshotLatestVersion, seed.updateState.latestVersion) >= 0 ? snapshotLatestVersion : seed.updateState.latestVersion;
  const hasNewerSeedRelease = latestVersion === seed.updateState.latestVersion && snapshotLatestVersion !== seed.updateState.latestVersion;
  const teacherVersion = snapshot.teacher?.version ?? seed.teacher.version;
  const normalizedUpdateStatus =
    hasNewerSeedRelease && compareVersion(teacherVersion, latestVersion) < 0 ? "未检查" : snapshot.updateState?.status ?? seed.updateState.status;

  return {
    ...seed,
    ...snapshot,
    teacher: {
      ...seed.teacher,
      ...snapshot.teacher
    },
    students: (snapshot.students ?? seed.students).map((student) => ({
      ...student,
      remainingLessons: normalizeDemoRemainingLessons(student.id, student.remainingLessons)
    })),
    classes: (snapshot.classes ?? seed.classes).map((classItem) => ({
      ...classItem,
      members: classItem.members.map((member) => ({
        ...member,
        remainingLessons: normalizeDemoRemainingLessons(member.studentId, member.remainingLessons)
      }))
    })),
    updateState: {
      ...seed.updateState,
      ...snapshot.updateState,
      status: normalizedUpdateStatus,
      latestVersion,
      notes: hasNewerSeedRelease ? seed.updateState.notes : snapshot.updateState?.notes ?? seed.updateState.notes
    },
    reports: (snapshot.reports ?? seed.reports).map((report, index) => {
      const seedReport = seed.reports[index] ?? seed.reports[0]!;

      return {
        ...seedReport,
        ...report,
        period: report.period ?? seedReport.period,
        sources: report.sources ?? seedReport.sources,
        scoreTrend: report.scoreTrend ?? seedReport.scoreTrend,
        weaknessSummary: report.weaknessSummary ?? seedReport.weaknessSummary,
        feedbackHighlights: report.feedbackHighlights ?? seedReport.feedbackHighlights,
        sections: report.sections ?? seedReport.sections,
        suggestions: report.suggestions ?? seedReport.suggestions,
        dataQuality: report.dataQuality ?? seedReport.dataQuality,
        visibleToParent: report.visibleToParent ?? report.status === "已保存"
      };
    }),
    feedbackDrafts: (snapshot.feedbackDrafts ?? seed.feedbackDrafts).map((draft) => ({
      ...draft,
      attachments: draft.attachments ?? []
    })),
    familyInvites: (snapshot.familyInvites ?? seed.familyInvites).map((invite) => {
      const seedInvite = seed.familyInvites.find((item) => item.id === invite.id || item.studentId === invite.studentId);
      const createdAt = invite.createdAt ?? new Date().toISOString();
      const expiresAt = invite.expiresAt ?? new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString();
      const token = invite.token ?? seedInvite?.token ?? legacyInviteToken(invite.id);

      return {
        ...invite,
        token,
        inviteLink: `/portal/invite?token=${token}`,
        createdAt,
        expiresAt
      };
    }),
    financeEvents: normalizeFinanceEvents(snapshot.financeEvents, seed.financeEvents),
    attendanceRecords: snapshot.attendanceRecords ?? seed.attendanceRecords,
    featureRequests: snapshot.featureRequests ?? seed.featureRequests
  };
}

function getMutableSnapshot() {
  if (!inMemorySnapshot) {
    inMemorySnapshot = createLessonLedgerSeed();
  }

  return inMemorySnapshot;
}

export function createInMemoryLessonLedgerRepository(): LessonLedgerRepository {
  return {
    getSnapshot() {
      return cloneSnapshot(getMutableSnapshot());
    },
    replaceSnapshot(snapshot) {
      inMemorySnapshot = cloneSnapshot(snapshot);
      return cloneSnapshot(inMemorySnapshot);
    },
    updateSnapshot(updater) {
      inMemorySnapshot = updater(cloneSnapshot(getMutableSnapshot()));
      return cloneSnapshot(inMemorySnapshot);
    },
    reset() {
      inMemorySnapshot = createLessonLedgerSeed();
      return cloneSnapshot(inMemorySnapshot);
    }
  };
}

export function createFileLessonLedgerRepository(storePath = process.env.LESSONLEDGER_STORE_PATH ?? defaultStorePath): LessonLedgerRepository {
  function readSnapshot() {
    if (!existsSync(storePath)) {
      const seed = createLessonLedgerSeed();
      writeSnapshot(seed);
      return seed;
    }

    return normalizeSnapshot(JSON.parse(readFileSync(storePath, "utf8")) as LessonLedgerSnapshot);
  }

  function writeSnapshot(snapshot: LessonLedgerSnapshot) {
    mkdirSync(dirname(storePath), { recursive: true });
    const tmpPath = `${storePath}.${process.pid}.tmp`;
    writeFileSync(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    renameSync(tmpPath, storePath);
  }

  return {
    getSnapshot() {
      return cloneSnapshot(readSnapshot());
    },
    replaceSnapshot(snapshot) {
      const nextSnapshot = cloneSnapshot(snapshot);
      writeSnapshot(nextSnapshot);
      return cloneSnapshot(nextSnapshot);
    },
    updateSnapshot(updater) {
      const nextSnapshot = updater(cloneSnapshot(readSnapshot()));
      writeSnapshot(nextSnapshot);
      return cloneSnapshot(nextSnapshot);
    },
    reset() {
      const seed = createLessonLedgerSeed();
      writeSnapshot(seed);
      return cloneSnapshot(seed);
    }
  };
}

export const lessonLedgerRepository = createFileLessonLedgerRepository();
