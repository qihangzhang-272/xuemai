# LessonLedger v2 Backend Implementation

## 选择结论

LessonLedger v2 当前后端采用 **Next.js Route Handlers + TypeScript service + 本地 JSON 文件仓库**，暂不引入 Go 服务。

原因：

- 当前 `/workbench-v2` 已经是 Next.js 单体原型，前后端共享 TypeScript 类型成本最低。
- 竞品还原阶段重点是业务闭环和交互 fidelity，不需要单独部署第二个服务进程。
- 后端动作主要是教务状态机、课时流水、预约冲突、反馈草稿、家庭邀请和报告保存，TypeScript 足够承载。
- 未来如果要做多人并发、正式租户隔离、队列任务或独立部署，再把当前 service/repository 边界迁移到 Go 或 Postgres API。

## 运行边界

| 层级 | 文件 | 职责 |
|---|---|---|
| API Route | `app/api/workbench-v2/route.ts` | 暴露 GET snapshot 和 POST action |
| Service | `src/lessonledger/service.ts` | 校验输入、执行业务状态机、抛出稳定错误码 |
| AI Provider | `src/lessonledger/ai-provider.ts` | 为课后反馈和学习报告提供可配置文本模型边界；未配置时安全回落到本地生成器 |
| Repository | `src/lessonledger/repository.ts` | 读写本地 JSON store，归一化旧快照 |
| Types | `src/lessonledger/types.ts` | 维护前后端共享数据结构和 action union |
| Seed | `src/lessonledger/seed.ts` | 提供竞品演示初始数据 |

默认数据文件：

```text
.lessonledger-data/demo-store.json
```

该目录已在 `.gitignore` 中忽略，避免把本地演示数据提交进仓库。

## API 契约

### `GET /api/workbench-v2`

返回当前完整快照：

- `teacher`
- `students`
- `classes`
- `lessons`
- `attendanceRecords`
- `openSlots`
- `bookings`
- `scores`
- `weaknesses`
- `financeEvents`
- `messageThreads`
- `familyInvites`
- `reports`
- `feedbackDrafts`
- `featureRequests`

同时返回：

- `mode = local_file_backend`
- `stack = Next.js Route Handlers + TypeScript service + file-backed repository`
- `supportedActions`

### `POST /api/workbench-v2`

统一请求格式：

```json
{
  "action": "createBooking",
  "payload": {}
}
```

成功时返回更新后的完整 snapshot。失败时返回稳定结构：

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_SLOT_NOT_OPEN",
    "message": "该时段暂未开放预约，请选择蓝色开放时段"
  }
}
```

## 已覆盖动作

- 学生：`createStudent`
- 课程：`createLesson`、`updateLesson`、`markLessonStatus`、`moveLesson`
- 班课考勤：`saveAttendance`
- AI 反馈：`generateFeedback`、`saveFeedbackDraft`、`publishFeedback`
- 家庭账号：`createFamilyInvite`、`activateFamilyInvite`
- 学习报告：`generateStudyReport`、`saveStudyReport`
- 预约：`createOpenSlots`、`createBooking`、`updateBooking`
- 学生档案：`addScore`、`updateScore`、`addWeakness`、`updateWeakness`
- 财务流水：`addFinanceEvent`
- 家校沟通：`createMessageThread`、`replyMessageThread`
- 设置更新：`checkUpdate`、`applyUpdate`、`submitFeatureRequest`、`saveStudioProfile`

## 关键业务规则

- 完成一对一课程会扣除对应学生课时，并生成一条扣课流水。
- 班课点名会保存每个学生的考勤记录，并按出勤/迟到扣课。
- 重复确认同一节课不会重复生成扣课流水。
- 缺席/取消课程会清理待反馈状态和反馈草稿。
- 家长预约只能提交到老师开放的蓝色时段。
- 家长预约会检测课程冲突和其他待处理预约冲突。
- 老师通过预约前会再次检测冲突，通过后写入排课总表。
- 拖动已完成课程到未来时段时，选择重置会清理旧点名和反馈草稿。
- 家庭邀请链接带 48 小时有效期，激活时校验手机号。
- 学习报告只读取所选学生自己的成绩、薄弱点、课程和反馈。
- 发布给家长的反馈会阻止“保证提分、基础很差”等不安全表达。
- `generateFeedback` 和 `generateStudyReport` 通过 `runLessonLedgerActionAsync` 优先尝试 AI Provider；Provider 未配置、请求失败、输出过短/过长或含不安全表达时，回落到本地 deterministic 生成器。
- AI Provider 当前支持 DeepSeek/OpenAI-compatible 文本接口配置：`LESSONLEDGER_AI_PROVIDER=deepseek`，可选 `DEEPSEEK_API_KEY` / `LESSONLEDGER_AI_API_KEY`、`DEEPSEEK_BASE_URL` / `LESSONLEDGER_AI_BASE_URL`、`DEEPSEEK_MODEL` / `LESSONLEDGER_AI_MODEL`。

## 验证

当前后端验证重点在：

```bash
npm run test -- tests/lessonledger-service.test.ts tests/lessonledger-route.test.ts tests/workbench-v2-page-state.test.ts
npm run typecheck
npm run lint
npm run build
```

其中 `tests/lessonledger-service.test.ts` 已覆盖模块重载后的文件持久化，证明后端动作不是前端内存态。
