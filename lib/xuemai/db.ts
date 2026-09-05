import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Attachment, Contact, LearningRecord, Preferences, Teacher } from "./types";

export const dataRoot = () => path.resolve(process.env.XUEMAI_DATA_DIR || ".xuemai-data");
let database: DatabaseSync | undefined;
export function db() {
  if (!database) {
    mkdirSync(dataRoot(), { recursive: true });
    database = new DatabaseSync(path.join(dataRoot(), "xuemai.sqlite"));
    database.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, identifier TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        password_hash TEXT NOT NULL, preferences TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        expires_at INTEGER NOT NULL, upstream_cookie TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS entities (
        owner TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, id TEXT NOT NULL,
        data TEXT NOT NULL, PRIMARY KEY(owner, kind, id)
      );
    `);
  }
  return database;
}

export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const defaults: Preferences = { subject: "数学", grade: "", tone: "温和、具体", address: "家长" };
export type UserRow = Teacher & { password_hash: string; preferences: string };

export function createUser(identifier: string, name: string, passwordHash: string): Teacher {
  const user = { id: randomUUID(), identifier, name };
  try {
    db().prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run(user.id, identifier, name, passwordHash, JSON.stringify(defaults));
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new AppError("该账号已存在，请直接登录", 409);
    throw error;
  }
  return user;
}

export function userByIdentifier(identifier: string) {
  return db().prepare("SELECT * FROM users WHERE identifier = ?").get(identifier) as UserRow | undefined;
}

type EntityMap = { contact: Contact; record: LearningRecord; attachment: Attachment };
export function list<K extends keyof EntityMap>(owner: string, kind: K): EntityMap[K][] {
  return db().prepare("SELECT data FROM entities WHERE owner = ? AND kind = ? ORDER BY rowid")
    .all(owner, kind).map(row => JSON.parse(String(row.data)) as EntityMap[K]);
}
export function get<K extends keyof EntityMap>(owner: string, kind: K, id: string): EntityMap[K] {
  const row = db().prepare("SELECT data FROM entities WHERE owner = ? AND kind = ? AND id = ?").get(owner, kind, id);
  if (!row) throw new AppError("内容不存在或不属于当前账号", 404);
  return JSON.parse(String(row.data));
}
export function put<K extends keyof EntityMap>(owner: string, kind: K, entity: EntityMap[K]) {
  db().prepare("INSERT INTO entities VALUES (?, ?, ?, ?) ON CONFLICT(owner, kind, id) DO UPDATE SET data = excluded.data")
    .run(owner, kind, entity.id, JSON.stringify(entity));
  return entity;
}
export function remove(owner: string, kind: keyof EntityMap, id: string) {
  db().prepare("DELETE FROM entities WHERE owner = ? AND kind = ? AND id = ?").run(owner, kind, id);
}

export function mutateRecord(owner: string, id: string, revision: number, change: (record: LearningRecord) => void) {
  // ponytail: SQLite 单实例同步事务；耗时 AI 调用在事务之外，版本号防止跨标签页覆盖。
  db().exec("BEGIN IMMEDIATE");
  try {
    const record = get(owner, "record", id);
    if (record.revision !== revision) throw new AppError("记录已在其他操作中更新，请刷新后继续", 409);
    change(record);
    record.revision++;
    record.updatedAt = new Date().toISOString();
    put(owner, "record", record);
    db().exec("COMMIT");
    return record;
  } catch (error) { db().exec("ROLLBACK"); throw error; }
}

export function text(value: unknown, label: string, max = 200, required = true) {
  if (typeof value !== "string" || (required && !value.trim()) || value.length > max) throw new AppError(`${label}不能为空且最多 ${max} 字`);
  return value.trim();
}
export function strings(value: unknown, label: string, max = 20): string[] {
  if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== "string" || v.length > 100)) throw new AppError(`${label}格式不正确`);
  return [...new Set(value)];
}
