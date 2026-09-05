# 学脉 Teaching Agent Operating System 开发指导书 v1.2（审校修正版 / Codex 长时间开发专用）

> 项目代号：学脉  
> 文档版本：v1.2  
> 文档定位：长期系统架构指导书，而不是短视 MVP 任务书  
> 当前第一交付链路：Parent Feedback Agent（家长微信反馈 Agent）  
> 长期目标：构建面向教培老师的 Teaching Agent Operating System  
> 使用对象：Codex / Cursor / 人类开发者 / 项目负责人  
> 核心原则：**阶段性交付，不等于架构短视；先做一个稳定场景，不等于只服务一个场景。**

---

# 0. 版本升级说明

## 0.1 为什么从 v1.0 升级到 v1.2

v1.0 的核心价值是把“家长微信反馈 Agent”拆成一个可开发的 Agent Harness 工作流：

```txt
学生档案 → 课堂表现/错题 → 生成家长反馈 → 自动校验 → 老师编辑 → 复制微信 → 保存记录
```

但 v1.0 里“第一阶段 MVP”的表达容易让 Codex 误解为：

> 只需要做一个小功能 Demo。

这不符合本项目的真实目标。

本项目真正要做的不是一个“能生成反馈的小工具”，而是：

> **一个从学生数据出发，持续完成教学后续服务的 Teaching Agent Operating System。**

所以 v1.2 的核心升级是：

- 保留 Parent Feedback Agent 作为第一落地链路
- 但底层架构必须按长期多 Agent 系统设计
- 所有关键模块必须可复用、可扩展、可观察、可评估、可恢复
- 不允许为了快速跑通一个功能，把系统写死成一次性 Demo

---

## 0.2 v1.2 的最高优先级原则

Codex 必须理解：

> Parent Feedback Agent 是第一条验证链路，不是系统边界。

当前阶段可以只交付一个 Agent，但架构必须能承接：

- Wrong Question Analysis Agent
- Student Profile Agent
- Monthly Report Agent
- Batch Feedback Agent
- Lesson Planning Agent
- Teacher Workspace Orchestrator Agent
- Class Risk Monitor Agent
- Parent Communication Style Agent
- Knowledge Mastery Tracking Agent

也就是说：

```txt
第一阶段：单 Agent 可运行
长期目标：多 Agent 可编排
第一阶段：单流程可交付
长期目标：教学后续服务全流程自动化
第一阶段：反馈文本生成
长期目标：学生学习数据资产持续沉淀
```

---

## 0.3 本文档对 Codex 的根本要求

Codex 在开发时必须坚持：

```txt
允许阶段性简化功能，
不允许架构短视。

允许暂时只实现一个 Agent，
不允许写死成只能服务一个 Agent。

允许暂时不做 MCP、不做多 Agent、不做复杂记忆，
但必须预留清晰接口和目录边界。


允许第一阶段只解决家长反馈，
但数据、日志、上下文、工具、评估体系必须能支撑后续错题、月报、学生画像和批量任务。
```

---

## 0.4 v1.2 审校修正说明

本版本在 v1.1 基础上做了理论和流程审校，重点修正以下问题：

### 修正 1：避免把“Teaching Agent Operating System”误解成行业标准术语

“Teaching Agent Operating System”是本项目内部产品架构命名，不是外部官方标准。它的含义是：

> 用 Agent Harness 的方式，把老师课后服务流程组织成一个可扩展、可观测、可校验、可恢复的教学工作系统。

Codex 不应把它理解成需要开发真正的操作系统，也不应过度工程化成底层平台。

正确理解：

```txt
它是产品架构名，不是系统内核。
它是业务工作台，不是通用操作系统。
它是教学 Agent 编排系统，不是大而全自动化平台。
```

### 修正 2：区分 Workflow Agent 和 Autonomous Agent

第一阶段 Parent Feedback Agent 应该是 **Workflow Agent**，不是完全自主 Agent。

正确做法：

```txt
固定流程 + 有限工具 + 结构化输出 + 人类确认
```

错误做法：

```txt
让模型自己决定所有步骤、自己写库、自己更新档案、自己联系家长
```

后续 Orchestrator Agent 可以逐步增强自主性，但所有外部发送、档案覆盖、批量写入等动作必须有人类确认。

### 修正 3：数据库从“单班级字段”升级为“学生-班级关系表”

v1.1 中 students 表直接放 class_id，这对第一阶段能用，但长期不够稳。现实里一个学生可能：

- 同时在多个班级
- 同时学多个科目
- 从一个班转到另一个班
- 一对一和班课并存

因此 v1.2 增加 `class_students` 关系表，`students.primary_class_id` 只作为默认班级，不作为唯一班级关系。

### 修正 4：区分 AI 原始输出、老师确认输出、学习记录

不是所有 AI 生成内容都应该直接进入学生档案。

正确生命周期：

```txt
agent_runs：记录运行过程
agent_outputs：记录 AI 生成产物
teacher_edit_events：记录老师修改
feedback_history：记录老师确认后的家长反馈
student_learning_records：只记录确认后可进入学生长期档案的内容
```

也就是说：

> AI 生成 ≠ 已确认事实  
> 老师确认后，才进入学生长期学习记录。

### 修正 5：日志不能无脑保存完整隐私上下文

学生数据、家长沟通、错题记录都可能包含隐私信息。

因此 `agent_runs.assembled_context` 不应默认保存完整原文，建议保存：

- context 摘要
- context source 列表
- record ids
- token usage
- debug 模式下才保存完整上下文
- 生产环境默认脱敏

### 修正 6：wrong_questions 默认状态修正

v1.1 中 `wrong_questions.status default 'analyzed'` 不合理。

新错题刚创建时不一定已经分析，v1.2 改为：

```sql
status text default 'pending'
```

可选状态：

```txt
pending
analyzing
analyzed
confirmed
archived
```

### 修正 7：Codex 的开发边界更清晰

v1.2 明确：

- 允许创建长期目录和类型
- 第一阶段只实现 Parent Feedback Agent
- Orchestrator 只建 skeleton，不跑复杂逻辑
- planned agents 只建空目录或说明文档，不实现业务
- 不要为了“长期架构”提前做复杂多 Agent 执行

---

# 1. 项目总定位

## 1.1 项目名称

学脉

## 1.2 产品定位

学脉是一个面向个体老师、小型教培机构和教学服务团队的 AI 教学后续服务系统。

它不是：

- 普通聊天机器人
- AI 工具集合站
- 题库工具
- 单纯月报生成器
- 普通 CRM
- 普通学生档案系统

它应该是：

> **以学生长期学习数据为核心，以 Agent Harness 为执行系统，帮助老师完成课后反馈、错题分析、学生画像、月度报告和教学跟进的 Teaching Agent Operating System。**

---

## 1.3 长期产品形态

长期形态应该类似：

```txt
老师工作台
  ↓
自然语言任务入口
  ↓
Orchestrator Agent 判断任务类型
  ↓
调用不同专业 Agent
  ↓
读取学生/班级/老师/历史上下文
  ↓
执行教学后续流程
  ↓
生成可编辑结果
  ↓
老师确认
  ↓
沉淀为学生长期数据资产
```

---

## 1.4 核心商业价值

学脉的商业价值不是“AI 生成一段话”。

真正商业价值是：

1. 帮老师节省课后重复沟通时间
2. 让反馈更具体、更专业、更稳定
3. 把每次教学记录沉淀成学生长期画像
4. 让月报、续费沟通、个性化教学建议有数据基础
5. 降低教培机构老师服务质量不稳定的问题
6. 把老师脑子里的经验变成可复用的工作流
7. 形成教学服务环节的自动化生产资料

---

# 2. 总体战略：长期架构优先，阶段性交付

## 2.1 正确理解 MVP

本项目不是不要 MVP，而是不能被“MVP 思维”限制。

正确 MVP：

> 用最小可交付链路验证真实需求，同时底层架构不堵死未来扩展。

错误 MVP：

> 为了快，把所有逻辑写进一个页面、一个 API、一个 Prompt，后面全部推倒重来。

所以本项目采用：

```txt
长期架构优先
  +
阶段性交付
  +
单链路先验证
  +
多 Agent 可扩展
```

---

## 2.2 第一阶段为什么仍然从 Parent Feedback Agent 开始

因为家长反馈是最适合作为第一条链路的场景：

| 维度 | 判断 |
|---|---|
| 高频 | 老师经常课后反馈 |
| 明确输入 | 学生表现、错题、知识点、老师要求 |
| 明确输出 | 微信反馈 |
| 价值可感知 | 老师一眼知道有没有用 |
| 风险较低 | 只生成，不自动发送 |
| 可沉淀数据 | 反馈可进入学生历史记录 |
| 后续可扩展 | 能为月报、画像、续费沟通提供素材 |

但必须明确：

> Parent Feedback Agent 只是第一个样板间，不是整栋楼。

---

# 3. Teaching Agent Operating System 总架构

## 3.1 总体架构图

```txt
┌──────────────────────────────────────────┐
│              Teacher Workspace            │
│        老师自然语言入口 / 页面按钮入口       │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│          Orchestrator Agent Layer         │
│     任务识别 / Agent 路由 / 流程编排         │
└────────────────────┬─────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│反馈 Agent   │ │错题 Agent   │ │月报 Agent   │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘
      │              │              │
      └──────────────┼──────────────┘
                     ▼
┌──────────────────────────────────────────┐
│             Shared Harness Core           │
│ Context / Tools / Memory / Eval / Logs    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│              Data Asset Layer             │
│ 学生档案 / 学习记录 / 错题 / 反馈 / 月报       │
└──────────────────────────────────────────┘
```

---

## 3.2 分层设计

系统应分为 9 层：

| 层级 | 名称 | 作用 |
|---|---|---|
| L1 | UI Interaction Layer | 页面、按钮、输入框、结果卡片 |
| L2 | Orchestration Layer | 任务路由、Agent 编排 |
| L3 | Agent Layer | 各专业 Agent |
| L4 | Workflow Layer | 每个 Agent 的流程控制 |
| L5 | Context Layer | 上下文组装与裁剪 |
| L6 | Tool Layer | 数据库、文件、模型、外部工具 |
| L7 | Memory Layer | 老师偏好、学生长期画像 |
| L8 | Evaluation & Guardrails Layer | 质量评分、安全约束 |
| L9 | Observability Layer | 日志、运行记录、错误追踪 |

---

# 4. 多 Agent 长期规划

## 4.1 第一阶段 Agent

### Parent Feedback Agent

目标：

> 根据学生档案、课堂表现、错题情况和老师偏好，生成可复制到微信的家长反馈。

输入：

- studentId
- teacherId
- classNote
- wrongQuestionSummary
- teacherInstruction

输出：

- feedbackText
- studentStatus
- coreIssue
- nextAction
- qualityScore
- warnings

---

## 4.2 第二阶段 Agent

### Wrong Question Analysis Agent

目标：

> 分析错题背后的知识点、错误原因、举一反三方向。

输入：

- wrongQuestionText
- studentAnswer
- correctAnswer
- subject
- grade
- studentContext

输出：

- knowledgePoints
- mistakeType
- mistakeReason
- explanation
- similarQuestionSuggestions
- feedbackSuggestion

---

### Student Profile Agent

目标：

> 根据学生长期学习记录，更新学生画像。

输入：

- studentId
- recentRecords
- feedbackHistory
- wrongQuestionAnalysis
- classNotes

输出：

- profileSummary
- strengths
- weaknesses
- learningHabits
- riskSignals
- nextFocus

---

## 4.3 第三阶段 Agent

### Monthly Report Agent

目标：

> 汇总一个月学习记录、错题、反馈和学生画像，生成月度学习报告。

输入：

- studentId
- monthRange
- learningRecords
- feedbackHistory
- wrongQuestionStats
- teacherNotes

输出：

- monthlySummary
- progressHighlights
- keyProblems
- knowledgeMastery
- nextMonthPlan
- parentVersionReport

---

### Batch Feedback Agent

目标：

> 对一个班级多个学生批量生成课后反馈。

输入：

- classId
- students
- sharedClassNote
- individualNotes

输出：

- feedbackList
- riskStudents
- missingInfoWarnings
- batchQualityReport

---

## 4.4 第四阶段 Agent

### Teacher Workspace Orchestrator Agent

目标：

> 老师用自然语言发出任务，由总控 Agent 判断并调用具体专业 Agent。

示例：

```txt
帮我看一下王一路最近的问题，顺便生成一段给家长的话。
```

内部流程：

```txt
识别任务：学生分析 + 家长反馈
  ↓
调用 Student Profile Agent
  ↓
调用 Parent Feedback Agent
  ↓
整合结果
  ↓
返回可编辑反馈
```

---

# 5. 统一 Agent Registry 设计

## 5.1 为什么需要 Agent Registry

如果只写一个 Parent Feedback Agent，可以不用 Registry。

但本项目后面一定会有多个 Agent。

所以第一阶段就应该预留统一 Agent Registry，避免后面重构。

---

## 5.2 目录结构

```txt
src/agents/
  registry.ts
  types.ts
  shared/
    openai-client.ts
    model-config.ts
    context/
    tools/
    memory/
    evaluation/
    guardrails/
    logging/
    recovery/
  parent-feedback/
  wrong-question-analysis/
  student-profile/
  monthly-report/
  batch-feedback/
  orchestrator/
```

---

## 5.3 Agent Metadata 类型

```ts
export type AgentName =
  | 'parent-feedback'
  | 'wrong-question-analysis'
  | 'student-profile'
  | 'monthly-report'
  | 'batch-feedback'
  | 'teacher-orchestrator';

export type AgentCapability =
  | 'generate_parent_feedback'
  | 'analyze_wrong_question'
  | 'update_student_profile'
  | 'generate_monthly_report'
  | 'batch_generate_feedback'
  | 'route_teacher_task';

export type AgentMetadata = {
  name: AgentName;
  displayName: string;
  description: string;
  capabilities: AgentCapability[];
  inputSchemaName: string;
  outputSchemaName: string;
  version: string;
  status: 'planned' | 'experimental' | 'stable' | 'deprecated';
};
```

---

## 5.4 Agent Registry 示例

```ts
export const AGENT_REGISTRY: Record<AgentName, AgentMetadata> = {
  'parent-feedback': {
    name: 'parent-feedback',
    displayName: '家长反馈 Agent',
    description: '根据学生上下文生成微信家长反馈',
    capabilities: ['generate_parent_feedback'],
    inputSchemaName: 'ParentFeedbackInput',
    outputSchemaName: 'ParentFeedbackOutput',
    version: '1.1.0',
    status: 'stable',
  },

  'wrong-question-analysis': {
    name: 'wrong-question-analysis',
    displayName: '错题分析 Agent',
    description: '分析错题知识点、错误原因和举一反三方向',
    capabilities: ['analyze_wrong_question'],
    inputSchemaName: 'WrongQuestionAnalysisInput',
    outputSchemaName: 'WrongQuestionAnalysisOutput',
    version: '0.1.0',
    status: 'planned',
  },

  'student-profile': {
    name: 'student-profile',
    displayName: '学生画像 Agent',
    description: '根据长期学习记录更新学生画像',
    capabilities: ['update_student_profile'],
    inputSchemaName: 'StudentProfileInput',
    outputSchemaName: 'StudentProfileOutput',
    version: '0.1.0',
    status: 'planned',
  },

  'monthly-report': {
    name: 'monthly-report',
    displayName: '月报 Agent',
    description: '生成学生月度学习报告',
    capabilities: ['generate_monthly_report'],
    inputSchemaName: 'MonthlyReportInput',
    outputSchemaName: 'MonthlyReportOutput',
    version: '0.1.0',
    status: 'planned',
  },

  'batch-feedback': {
    name: 'batch-feedback',
    displayName: '批量反馈 Agent',
    description: '批量生成班级学生反馈',
    capabilities: ['batch_generate_feedback'],
    inputSchemaName: 'BatchFeedbackInput',
    outputSchemaName: 'BatchFeedbackOutput',
    version: '0.1.0',
    status: 'planned',
  },

  'teacher-orchestrator': {
    name: 'teacher-orchestrator',
    displayName: '老师工作台总控 Agent',
    description: '识别老师自然语言任务并路由到专业 Agent',
    capabilities: ['route_teacher_task'],
    inputSchemaName: 'TeacherTaskInput',
    outputSchemaName: 'TeacherTaskOutput',
    version: '0.1.0',
    status: 'planned',
  },
};
```

---

# 6. 统一 Harness Core 设计

## 6.1 为什么要有 Shared Harness Core

如果每个 Agent 都自己写：

- context.ts
- tools.ts
- evaluator.ts
- logger.ts
- recovery.ts

后面会出现大量重复代码，难以维护。

所以第一阶段必须抽象出 Shared Harness Core。

---

## 6.2 Shared Harness Core 模块

```txt
src/agents/shared/
  model/
    openai-client.ts
    model-config.ts
    call-model.ts
    structured-output.ts

  context/
    context-builder.ts
    context-compressor.ts
    context-priority.ts
    context-types.ts

  tools/
    tool-registry.ts
    student-tools.ts
    learning-record-tools.ts
    feedback-tools.ts
    report-tools.ts

  memory/
    teacher-memory.ts
    student-memory.ts
    preference-memory.ts
    memory-types.ts

  evaluation/
    evaluator.ts
    scoring.ts
    quality-rubrics.ts

  guardrails/
    guardrail-engine.ts
    parent-communication-rules.ts
    privacy-rules.ts

  logging/
    run-logger.ts
    trace-types.ts

  recovery/
    fallback.ts
    retry.ts
    error-map.ts
```

---

## 6.3 第一阶段实现要求

第一阶段不需要全部复杂实现，但必须做到：

| 模块 | 第一阶段要求 |
|---|---|
| model | 必须封装 |
| context | 必须有统一类型和 builder 思路 |
| tools | 必须不写死在 API route |
| memory | 先做 teacher_preferences，但结构预留 |
| evaluation | Parent Feedback 先实现，接口通用 |
| guardrails | Parent Communication 先实现，接口通用 |
| logging | agent_runs 必须统一 |
| recovery | fallback 和 error mapping 必须统一 |

---

# 7. 数据资产层长期设计

## 7.1 数据不是附属品，是产品核心

本项目后续能不能做月报、画像、批量反馈、学习路径建议，取决于数据结构是否提前设计好。

AI 输出不是一次性文本，而应该沉淀为长期资产。

---

## 7.2 核心数据流

```txt
课堂记录
  ↓
错题记录
  ↓
错题分析
  ↓
家长反馈
  ↓
学生画像更新
  ↓
月度报告
  ↓
下阶段教学建议
```

每一步都应该留下结构化记录。

---

## 7.3 数据表长期规划

第一阶段至少需要：

- students
- classes
- student_learning_records
- wrong_questions
- teacher_preferences
- agent_runs
- agent_outputs
- feedback_history

后续扩展：

- knowledge_points
- student_knowledge_mastery
- monthly_reports
- teacher_tasks
- agent_workflow_steps
- output_versions
- teacher_edit_events
- class_risk_snapshots

---

# 8. 数据库设计 v1.2（审校修正版）

## 8.0 数据库设计原则

数据库不是为了单个反馈功能服务，而是为了支撑长期教学数据资产。

必须遵守：

1. AI 原始输出和老师确认内容分开。
2. 学生和班级不要强绑定成一对一。
3. 学习记录必须能承接课堂、错题、反馈、月报、画像更新等多种事件。
4. Agent 运行日志必须可追踪，但生产环境要注意隐私脱敏。
5. 未来所有表都要能按 teacher_id / student_id / class_id 查询。
6. 如果项目已有表，不要直接 `create table if not exists` 后以为完成升级；已有表需要 `alter table` 增量迁移。
7. 第一阶段可以不做复杂 RLS，但必须预留权限边界，不能让一个老师读到另一个老师的数据。

---

## 8.1 推荐迁移顺序

为了避免外键顺序错误，推荐顺序：

```txt
1. classes
2. students
3. class_students
4. agent_runs
5. agent_outputs
6. student_learning_records
7. wrong_questions
8. teacher_preferences
9. feedback_history
10. teacher_edit_events
11. indexes
12. RLS policies
```

---

## 8.2 classes 表

```sql
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  name text not null,
  grade text,
  subject text,
  class_type text,
  schedule_note text,
  default_feedback_rule text,
  default_report_rule text,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

class_type 建议：

```txt
one_on_one
small_group
large_class
online
offline
hybrid
```

---

## 8.3 students 表

```sql
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  primary_class_id uuid references classes(id) on delete set null,
  name text not null,
  grade text,
  default_subject text,
  status text default 'stable',
  profile_summary text,
  strengths text[],
  weaknesses text[],
  learning_habits text[],
  risk_signals text[],
  next_focus text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

说明：

- `primary_class_id` 只是默认班级，不代表学生只能属于一个班级。
- `default_subject` 只是默认科目，具体科目仍应以 learning_records / wrong_questions / classes 为准。
- 学生画像字段只应由老师确认后更新，第一阶段 Parent Feedback Agent 只提供 suggestedProfileUpdate。

---

## 8.4 class_students 表

```sql
create table if not exists class_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  status text default 'active',
  joined_at timestamp with time zone default now(),
  left_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(class_id, student_id)
);
```

为什么需要它：

- 一个学生可以加入多个班
- 一个班可以有多个学生
- 后续批量反馈 Agent 必须基于班级查学生
- 后续月报可以按班级维度筛选

---

## 8.5 agent_runs 表

```sql
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  agent_version text,
  teacher_id uuid not null,
  student_id uuid,
  class_id uuid,
  task_id uuid,
  input jsonb,
  context_summary jsonb,
  context_record_ids jsonb,
  raw_model_output jsonb,
  final_output jsonb,
  status text not null,
  error_code text,
  error_message text,
  quality_score numeric,
  warnings text[],
  latency_ms integer,
  token_usage jsonb,
  debug_context jsonb,
  created_at timestamp with time zone default now()
);
```

重要说明：

- `context_summary`：默认保存脱敏摘要。
- `context_record_ids`：保存读取了哪些记录，方便追踪。
- `debug_context`：仅开发环境或 debug 模式使用，不建议生产环境默认保存完整学生隐私内容。
- `raw_model_output`：可以保存模型原始输出，但要注意不要包含过量隐私信息。
- `final_output`：保存最终结构化结果。

status 建议：

```txt
running
success
failed
fallback
cancelled
```

---

## 8.6 agent_outputs 表

```sql
create table if not exists agent_outputs (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references agent_runs(id) on delete set null,
  agent_name text not null,
  teacher_id uuid not null,
  student_id uuid,
  class_id uuid,
  output_type text not null,
  output_text text,
  output_json jsonb,
  quality_score numeric,
  status text default 'draft',
  is_final boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

output_type 建议：

```txt
parent_feedback
wrong_question_analysis
student_profile_update_suggestion
monthly_report
batch_feedback_item
lesson_plan
```

status 建议：

```txt
draft
edited
confirmed
discarded
archived
```

关键原则：

> agent_outputs 记录 AI 产物，不能等同于老师确认后的事实。

---

## 8.7 student_learning_records 表

```sql
create table if not exists student_learning_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  record_type text not null,
  title text,
  content text,
  source text,
  subject text,
  knowledge_points text[],
  mistake_reason text,
  teacher_note text,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  confirmed_by_teacher boolean default false,
  occurred_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);
```

record_type 建议：

```txt
class_note
wrong_question
homework
quiz
exam
parent_feedback
monthly_report
teacher_observation
profile_update
lesson_plan
```

重要原则：

- 只有老师确认后的 Agent 输出才应该成为长期学习记录。
- AI draft 不应直接写成长期事实。
- 如果是系统自动保存，`confirmed_by_teacher` 必须是 false。
- 如果老师点击保存，`confirmed_by_teacher` 可以是 true。

---

## 8.8 wrong_questions 表

```sql
create table if not exists wrong_questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  subject text,
  grade text,
  question_text text,
  student_answer text,
  correct_answer text,
  image_url text,
  knowledge_points text[],
  mistake_type text,
  mistake_reason text,
  analysis_text text,
  similar_question_suggestion text,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

status 建议：

```txt
pending
analyzing
analyzed
confirmed
archived
```

---

## 8.9 teacher_preferences 表

```sql
create table if not exists teacher_preferences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique,
  feedback_tone text default 'warm_professional',
  feedback_length text default 'medium',
  banned_phrases text[],
  preferred_structure text,
  custom_style_note text,
  report_style text,
  correction_style text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

---

## 8.10 feedback_history 表

```sql
create table if not exists feedback_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  agent_run_id uuid references agent_runs(id) on delete set null,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  feedback_text text not null,
  feedback_type text default 'wechat_parent_feedback',
  core_issue text,
  next_action text,
  quality_score numeric,
  teacher_edited boolean default false,
  copied_at timestamp with time zone,
  saved_at timestamp with time zone default now()
);
```

说明：

- feedback_history 只保存老师确认后的可用反馈。
- AI 生成但老师未确认的反馈，只存在 agent_outputs。
- 如果老师编辑过，则 teacher_edited = true。

---

## 8.11 teacher_edit_events 表

```sql
create table if not exists teacher_edit_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid references students(id) on delete cascade,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  before_text text,
  after_text text,
  edit_summary text,
  created_at timestamp with time zone default now()
);
```

说明：

第一阶段可以不自动分析 edit_summary，但要记录 before/after，后续用于学习老师偏好。

---

## 8.12 推荐索引

```sql
create index if not exists idx_classes_teacher_id on classes(teacher_id);
create index if not exists idx_students_teacher_id on students(teacher_id);
create index if not exists idx_students_primary_class_id on students(primary_class_id);
create index if not exists idx_class_students_class_id on class_students(class_id);
create index if not exists idx_class_students_student_id on class_students(student_id);
create index if not exists idx_learning_records_student_id on student_learning_records(student_id);
create index if not exists idx_learning_records_teacher_id on student_learning_records(teacher_id);
create index if not exists idx_learning_records_occurred_at on student_learning_records(occurred_at);
create index if not exists idx_wrong_questions_student_id on wrong_questions(student_id);
create index if not exists idx_agent_runs_teacher_id on agent_runs(teacher_id);
create index if not exists idx_agent_runs_student_id on agent_runs(student_id);
create index if not exists idx_agent_outputs_agent_run_id on agent_outputs(agent_run_id);
create index if not exists idx_feedback_history_student_id on feedback_history(student_id);
```

---

## 8.13 RLS / 权限原则

如果使用 Supabase Auth，后续必须启用 Row Level Security。

原则：

```txt
老师只能读取自己的 students/classes/records。
老师只能写入自己的 agent_runs/agent_outputs/feedback_history。
不允许通过前端传 teacherId 绕过权限。
teacherId 应从 session/auth user 派生。
```

第一阶段如果还没有 Auth，可以临时 mock teacherId，但必须标注 TODO，不能把 mock 写死进 Agent Core。

---

## 8.14 迁移注意事项

Codex 不能只执行 `create table if not exists` 就认为升级完成。

如果已有旧表，必须：

1. 检查已有字段
2. 使用 `alter table add column if not exists`
3. 补充索引
4. 保留旧数据
5. 不做破坏性删除
6. 必要时写兼容 adapter

---
# 9. 统一类型系统

## 9.1 Agent Base Types

```ts
export type AgentStatus = 'planned' | 'experimental' | 'stable' | 'deprecated';

export type AgentRunStatus =
  | 'running'
  | 'success'
  | 'failed'
  | 'fallback'
  | 'cancelled';

export type AgentRunBaseInput = {
  teacherId: string;
  studentId?: string;
  classId?: string;
  taskId?: string;
};

export type AgentRunResult<TOutput> = {
  success: boolean;
  data?: TOutput;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  meta?: {
    agentRunId?: string;
    qualityScore?: number;
    warnings?: string[];
    latencyMs?: number;
  };
};
```

---

## 9.2 Context Types

```ts
export type ContextSource =
  | 'student_profile'
  | 'learning_records'
  | 'wrong_questions'
  | 'teacher_preferences'
  | 'class_profile'
  | 'current_input'
  | 'agent_memory'
  | 'system_rules';

export type ContextBlock = {
  source: ContextSource;
  priority: number;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type AssembledContext = {
  blocks: ContextBlock[];
  summary?: string;
  warnings?: string[];
};
```

---

## 9.3 Tool Types

```ts
export type ToolName =
  | 'get_student_profile'
  | 'get_learning_records'
  | 'get_teacher_preferences'
  | 'save_feedback_history'
  | 'save_agent_output'
  | 'log_agent_run'
  | 'get_wrong_questions'
  | 'save_wrong_question_analysis'
  | 'update_student_profile';

export type ToolDefinition<TInput, TOutput> = {
  name: ToolName;
  description: string;
  inputSchemaName: string;
  outputSchemaName: string;
  execute: (input: TInput) => Promise<TOutput>;
};
```

---

## 9.4 Evaluation Types

```ts
export type EvaluationDimension = {
  name: string;
  score: number;
  maxScore: number;
  reason?: string;
};

export type EvaluationResult = {
  passed: boolean;
  totalScore: number;
  maxScore: number;
  normalizedScore: number;
  dimensions: EvaluationDimension[];
  warnings: string[];
  revisionRequired: boolean;
};
```

---

# 10. Parent Feedback Agent v1.2 设计

## 10.1 定位

Parent Feedback Agent 是第一条生产级链路。

它的任务不是“写文案”，而是：

> 根据学生长期上下文和本次课堂信息，生成一段老师愿意复制给家长的反馈，并将最终结果沉淀为学生学习记录。

---

## 10.2 输入类型

```ts
export type ParentFeedbackInput = {
  teacherId: string;
  studentId: string;
  classId?: string;
  classNote?: string;
  wrongQuestionSummary?: string;
  knowledgePoints?: string[];
  teacherInstruction?: string;
  outputPreference?: {
    length?: 'short' | 'medium' | 'long';
    tone?: 'warm_professional' | 'concise_direct' | 'encouraging' | 'calm_objective';
  };
};
```

---

## 10.3 输出类型

```ts
export type ParentFeedbackOutput = {
  feedbackText: string;
  studentStatus: 'excellent' | 'stable' | 'needs_attention';
  coreIssue: string;
  nextAction: string;
  relatedKnowledgePoints: string[];
  shouldUpdateStudentProfile: boolean;
  suggestedProfileUpdate?: {
    weaknesses?: string[];
    learningHabits?: string[];
    nextFocus?: string;
    riskSignals?: string[];
  };
  qualityScore: number;
  warnings: string[];
  revised: boolean;
  agentRunId?: string;
  agentOutputId?: string;
};
```

注意 v1.2 增加：

- relatedKnowledgePoints
- shouldUpdateStudentProfile
- suggestedProfileUpdate

因为家长反馈不应该只是文本，它也应该反哺学生画像。

---

## 10.4 Workflow

```txt
1. validateInput
2. createAgentRun
3. loadStudentProfile
4. loadClassContext if classId exists
5. loadRecentLearningRecords
6. loadRecentWrongQuestions
7. loadTeacherPreferences
8. assembleContext
9. generateFeedback
10. evaluateFeedback
11. reviseFeedback if score < 80
12. saveAgentOutput
13. optionallySuggestProfileUpdate
14. updateAgentRun
15. return result
```

---

## 10.5 Prompt 要求

### System Prompt

```ts
export const PARENT_FEEDBACK_SYSTEM_PROMPT = `
你是“学脉 Teaching Agent Operating System”中的家长反馈 Agent。

你不是普通聊天机器人，也不是作文助手。
你是一个面向教培老师的教学服务执行 Agent。

你的任务：
根据学生档案、近期学习记录、错题情况、本次课堂表现和老师偏好，生成一段适合老师复制到微信发给家长的课后反馈。

你必须同时完成两件事：
1. 生成自然、具体、温和、可执行的家长反馈。
2. 提取本次反馈中对学生长期画像有价值的信息。

你必须遵守：
- 不编造没有提供的信息。
- 不制造家长焦虑。
- 不给学生贴负面标签。
- 不承诺成绩一定提升。
- 不输出标题。
- 不输出 Markdown。
- 不输出推理过程。
- 不泄露其他学生信息。
- 反馈要像老师自然发微信，而不是正式报告。
- 必须包含一个具体核心问题。
- 必须包含下一步训练方向。
- 如果资料不足，要保守表达，并在 warnings 中说明。
`;
```

---

## 10.6 输出 JSON 格式

```json
{
  "feedbackText": "微信反馈正文",
  "studentStatus": "excellent | stable | needs_attention",
  "coreIssue": "本次最核心的问题",
  "nextAction": "下一步训练建议",
  "relatedKnowledgePoints": ["知识点1", "知识点2"],
  "shouldUpdateStudentProfile": true,
  "suggestedProfileUpdate": {
    "weaknesses": ["薄弱点"],
    "learningHabits": ["学习习惯表现"],
    "nextFocus": "下一步关注重点",
    "riskSignals": []
  },
  "warnings": []
}
```

---

# 11. Orchestrator Agent 预留设计

## 11.1 第一阶段不实现完整 Orchestrator

但必须预留目录：

```txt
src/agents/orchestrator/
  types.ts
  router.ts
  planner.ts
  orchestrator.ts
```

---

## 11.2 未来 Orchestrator 的任务

Orchestrator 不负责直接生成内容。

它负责：

1. 理解老师自然语言任务
2. 判断需要哪些 Agent
3. 拆解任务步骤
4. 调用具体 Agent
5. 汇总结果
6. 返回可编辑输出

---

## 11.3 示例

老师输入：

```txt
帮我看一下王一路最近的问题，顺便生成一段给家长的话。
```

Orchestrator 计划：

```json
{
  "taskType": "student_analysis_and_parent_feedback",
  "steps": [
    {
      "agent": "student-profile",
      "action": "summarize_recent_issues"
    },
    {
      "agent": "parent-feedback",
      "action": "generate_feedback"
    }
  ]
}
```

---

# 12. Context Engineering 长期策略

## 12.1 Context 不是越多越好

Context 的目标不是把所有资料塞给模型，而是：

> 在正确时间，把正确信息，以正确结构提供给正确 Agent。

---

## 12.2 Context 优先级

| 优先级 | 信息 | 说明 |
|---|---|---|
| P0 | 当前老师输入 | 本次任务最重要 |
| P1 | 当前学生档案 | 必须有 |
| P2 | 最近学习记录 | 高价值 |
| P3 | 最近错题分析 | 高价值 |
| P4 | 老师偏好 | 控制风格 |
| P5 | 班级上下文 | 批量任务需要 |
| P6 | 历史反馈 | 月报和画像需要 |
| P7 | 系统规则 | 稳定约束 |

---

## 12.3 Context Block 结构

```ts
export type ContextBlock = {
  source: ContextSource;
  priority: number;
  title: string;
  content: string;
  tokensEstimate?: number;
  metadata?: Record<string, unknown>;
};
```

---

## 12.4 Context 裁剪策略

第一阶段：

- 最近学习记录最多 8 条
- 最近错题最多 5 条
- 历史反馈最多 3 条
- 学生画像摘要必须包含
- 老师偏好必须包含

未来阶段：

- 长期记录做摘要
- 高价值记录优先保留
- 已过期信息降权
- 冲突信息标记
- 用 profile_summary 代替长历史

---

# 13. Memory Layer 长期设计

## 13.1 Memory 分三类

不要把所有“记忆”混在一起。

```txt
Teacher Memory：老师偏好
Student Memory：学生长期画像
Workflow Memory：某类任务的执行规则
```

---

## 13.2 Teacher Memory

记录：

- 反馈语气偏好
- 反馈长度偏好
- 禁用表达
- 常用结构
- 是否喜欢专业术语
- 是否喜欢更温和
- 是否喜欢短句

---

## 13.3 Student Memory

记录：

- 长期薄弱知识点
- 常见错误类型
- 学习习惯
- 进步点
- 风险信号
- 下阶段重点

---

## 13.4 Workflow Memory

记录：

- 家长反馈 SOP
- 月报 SOP
- 错题分析 SOP
- 班级批量反馈 SOP

未来可以做成 Skills。

---

# 14. Tool Registry 长期设计

## 14.1 为什么需要 Tool Registry

不同 Agent 会共用很多工具。

例如：

- Parent Feedback Agent 需要读学生档案
- Monthly Report Agent 也需要读学生档案
- Student Profile Agent 也需要读学生档案

如果每个 Agent 各写一套，会失控。

---

## 14.2 Tool Registry 示例

```ts
export const TOOL_REGISTRY = {
  getStudentProfile,
  getRecentLearningRecords,
  getWrongQuestions,
  getTeacherPreferences,
  saveAgentRun,
  saveAgentOutput,
  saveFeedbackHistory,
  updateStudentProfile,
};
```

---

## 14.3 工具权限原则

第一阶段所有工具都是内部数据库工具。

未来接 MCP 或外部工具时，必须分权限：

| 权限 | 说明 |
|---|---|
| read | 只读 |
| write | 写入 |
| risky_write | 高风险写入 |
| external_send | 外部发送 |
| destructive | 删除/覆盖 |

本项目长期原则：

> 外部发送类工具必须人类确认。

比如：

- 自动发微信：不做
- 自动发邮件：必须确认
- 自动删除数据：禁止
- 自动修改学生档案：第一阶段只建议，不自动改

---

## 14.4 MCP 未来接入原则

第一阶段不接 MCP。

未来如果接 MCP，必须把 MCP 理解为：

> 连接外部工具、数据源和能力的一种协议层，而不是 Agent 本身。

未来接入 MCP 时必须满足：

1. 明确区分 read / write / external_send / destructive 权限。
2. 所有 external_send 必须有人类确认。
3. 所有 destructive 操作默认禁止。
4. 不允许让模型看到不必要的工具。
5. 工具说明要防 prompt injection。
6. 外部 token 和 credential 不得进入模型上下文。
7. HTTP 类外部服务要有授权和最小权限设计。
8. 每次工具调用要写入 tool_call_logs 或 agent_run steps。

第一阶段只保留目录和权限模型，不实现 MCP server/client。

---

# 15. Evaluation & Guardrails 长期设计

## 15.1 Evaluation 不只是给分

Evaluation 的作用：

1. 判断输出能不能给老师看
2. 判断是否需要重写
3. 判断是否适合保存
4. 为后续优化提供数据
5. 为模型对比提供依据
6. 为商业化质量承诺提供基础

---

## 15.2 通用评分结构

```ts
export type QualityRubric = {
  agentName: AgentName;
  dimensions: {
    key: string;
    label: string;
    maxScore: number;
    description: string;
  }[];
};
```

---

## 15.3 Parent Feedback 评分维度

| 维度 | 分值 |
|---|---|
| 具体性 | 20 |
| 微信自然度 | 15 |
| 温和程度 | 15 |
| 核心问题明确 | 20 |
| 下一步动作明确 | 20 |
| 长度合适 | 10 |

---

## 15.4 Wrong Question Analysis 评分维度

| 维度 | 分值 |
|---|---|
| 知识点识别准确 | 25 |
| 错误原因清晰 | 25 |
| 讲解易懂 | 20 |
| 举一反三合理 | 20 |
| 表达简洁 | 10 |

---

## 15.5 Monthly Report 评分维度

| 维度 | 分值 |
|---|---|
| 数据覆盖完整 | 20 |
| 进步点明确 | 20 |
| 问题归因清晰 | 20 |
| 下月计划具体 | 20 |
| 家长可读性 | 20 |

---

# 16. Observability 长期设计

## 16.1 每次 Agent 运行必须可追踪

必须知道：

- 谁调用的
- 调用哪个 Agent
- 输入是什么
- 读取了哪些上下文
- 模型原始输出是什么
- 最终输出是什么
- 是否重写
- 质量分多少
- 是否保存
- 老师是否编辑
- 是否复制
- 是否失败

---

## 16.2 为什么这很重要

没有 Observability，后面会出现：

- 不知道为什么生成差
- 不知道哪个 Agent 有问题
- 不知道用户真实使用频率
- 不知道哪些功能有商业价值
- 不知道模型成本
- 不知道是否值得优化

---

# 16.3 输出生命周期审校版

本项目必须严格区分 4 种状态：

```txt
AI 生成草稿
  ↓
老师编辑
  ↓
老师确认
  ↓
进入学生长期学习记录
```

对应数据表：

| 生命周期 | 表 | 是否代表事实 |
|---|---|---|
| Agent 运行过程 | agent_runs | 否 |
| AI 生成结果 | agent_outputs | 否，只是候选产物 |
| 老师修改痕迹 | teacher_edit_events | 否，但可用于偏好学习 |
| 老师确认后的反馈 | feedback_history | 是，代表可使用反馈 |
| 老师确认后的学习事件 | student_learning_records | 是，可进入画像/月报 |

Codex 必须避免：

```txt
模型一生成 → 直接更新学生画像
模型一生成 → 直接写入长期事实
模型一生成 → 直接批量发送
```

正确做法：

```txt
模型生成 → 老师确认 → 保存 → 后续 Agent 读取
```

---

# 17. API 长期设计

## 17.1 当前第一阶段 API

```txt
POST /api/agents/parent-feedback
POST /api/agents/parent-feedback/save
```

---

## 17.2 长期 API 规划

```txt
POST /api/agents/run
POST /api/agents/parent-feedback
POST /api/agents/wrong-question-analysis
POST /api/agents/monthly-report
POST /api/agents/batch-feedback
POST /api/agents/orchestrator
GET  /api/agents/runs/:id
GET  /api/agents/outputs/:id
```

---

## 17.3 通用响应结构

```ts
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  meta?: {
    requestId?: string;
    agentRunId?: string;
    latencyMs?: number;
    warnings?: string[];
  };
};
```

---

# 18. 前端长期设计

## 18.1 不只是按钮，而是 Agent 工作区

学生详情页里不应该只是一个“生成反馈”按钮。

长期应该有：

```txt
AI 建议下一步
  - 当前状态
  - 核心问题
  - 建议动作
  - 生成反馈
  - 分析错题
  - 生成月报
```

---

## 18.2 Teacher Workspace 未来形态

```txt
今日
  ↓
老师自然语言输入框
  ↓
“帮我处理今天 6 个待反馈学生”
  ↓
系统识别批量反馈任务
  ↓
生成待确认列表
  ↓
老师逐个确认/编辑/复制
```

---

## 18.3 UI 原则

必须坚持：

- Apple 极简
- 清晰卡片
- 不做重型后台
- 老师一眼知道下一步做什么
- AI 输出必须可编辑
- AI 行动必须可确认
- 不让老师感觉系统替他失控操作

---

# 19. Codex 根目录 AGENTS.md v1.2

请将根目录 `AGENTS.md` 升级为以下内容：

```md
# 学脉 Codex Project Instructions v1.2

## Project Identity

This project is called 学脉.

学脉 is a Teaching Agent Operating System for individual tutors and small education institutions.

Important clarification:

Teaching Agent Operating System is the internal product architecture name of this project. It does not mean building a real operating system. It means building an extensible AI teaching workflow system based on Agent Harness principles.

It is not a generic chatbot.
It is not a random AI tool collection.
It is not a short-lived MVP demo.

It is a structured Agent Harness system that helps teachers complete post-class teaching workflows such as:

- student tracking
- parent feedback
- wrong-question analysis
- student profile updates
- monthly learning reports
- batch feedback
- teaching follow-up planning

## Highest Priority Principle

The first deliverable is Parent Feedback Agent, but the architecture must support future multi-agent expansion.

Do not build a short-sighted MVP.

Phase delivery is allowed.
Architecture short-sightedness is not allowed.

A small first workflow is acceptable.
A dead-end architecture is not acceptable.

## Current Development Priority

Build the Parent Feedback Agent as the first stable production workflow.

But all shared modules must be designed as reusable Harness Core:

- Agent Registry
- Tool Registry
- Context Builder
- Memory Layer
- Evaluation Layer
- Guardrails Layer
- Run Logger
- Recovery System
- Shared Model Client

## Product Principles

1. Teacher workflow first.
2. Student long-term data asset first.
3. Parent feedback is the first entry point, not the final product.
4. Stable workflow beats flashy autonomy.
5. Human-in-the-loop is mandatory.
6. AI output must be inspectable, editable, copyable, and savable.
7. Every AI output should become reusable learning data when confirmed by the teacher.
8. Do not auto-send messages to parents.
9. Do not overbuild UI gimmicks.
10. Do not write code that blocks future agents.

## AGENTS.md Usage Principles

AGENTS.md is living documentation for coding agents.

If nested AGENTS.md files are later added inside subdirectories, the nearest file should provide more specific instructions for that submodule.

Explicit user instructions in the current chat override AGENTS.md when there is conflict.

## Engineering Principles

1. Use TypeScript.
2. Keep agent logic modular.
3. Separate agent-specific logic from shared Harness Core.
4. Separate prompt, context, tools, workflow, guardrails, evaluator, recovery, and UI.
5. Do not put all logic inside one API route.
6. Do not hardcode student data.
7. Use Supabase for persistent data.
8. Every agent run must be logged.
9. Every agent output must be saveable.
10. Every confirmed output should be linkable to student learning records.
11. All risky writes require explicit teacher confirmation.
12. Future multi-agent support must be considered in naming and folder structure.

## Current Agent

Parent Feedback Agent:

Input:
- student profile
- classroom notes
- wrong-question summary
- teacher preference

Output:
- WeChat-ready parent feedback
- core issue
- next action
- student status
- quality score
- suggested profile update

## Future Agents

Architecture must support:

- Wrong Question Analysis Agent
- Student Profile Agent
- Monthly Report Agent
- Batch Feedback Agent
- Lesson Planning Agent
- Teacher Workspace Orchestrator Agent

## Do Not Do

Do not implement in the first phase:

- full autonomous agent
- auto-send WeChat
- MCP integration
- complex multi-agent execution
- payment system
- unrelated marketing pages
- unrelated social features

But do not block these future directions in architecture.
```

---

# 20. Codex 开发 Phase v1.2

## Phase 1：长期架构文档与 AGENTS.md

目标：

- 把项目定位从单 Agent MVP 升级成 Teaching Agent Operating System
- 创建 Agent Registry 和 Shared Harness Core 目录
- 更新 AGENTS.md

验收：

- 文档明确“第一阶段做 Parent Feedback，但架构支持多 Agent”
- 目录有 shared harness core
- Codex 不会误解成一次性 Demo

---

## Phase 2：数据模型升级

目标：

- 数据结构支持长期学生画像、错题、月报、Agent 输出资产
- 不只服务反馈文本

任务：

- 创建/升级 students
- 创建 classes
- 创建 class_students
- 创建 student_learning_records
- 创建 wrong_questions
- 创建 teacher_preferences
- 创建 agent_runs
- 创建 agent_outputs
- 创建 teacher_edit_events
- 创建 feedback_history
- 预留 teacher_edit_events

验收：

- AI 草稿进入 agent_outputs
- 老师确认后的家长反馈结果能保存
- 老师确认后的反馈能变成学习记录
- Agent 输出能被后续月报读取
- 学生画像字段可更新

---

## Phase 3：Shared Harness Core

目标：

- 先搭通用底座，再做具体 Agent

任务：

- shared/model
- shared/context
- shared/tools
- shared/memory
- shared/evaluation
- shared/guardrails
- shared/logging
- shared/recovery

验收：

- Parent Feedback Agent 能复用 shared 模块
- 后续 Wrong Question Agent 不需要重写基础设施

---

## Phase 4：Parent Feedback Agent

目标：

- 实现第一条生产链路

任务：

- types
- prompt
- context
- workflow
- evaluator
- recovery
- API
- UI

验收：

- 老师能从学生详情页完整生成、编辑、复制、保存反馈
- 每次运行写 agent_runs
- 每个输出写 agent_outputs
- 保存后写 feedback_history 和 student_learning_records

---

## Phase 5：Profile Update Suggestion

目标：

- 让反馈结果反哺学生画像

任务：

- Parent Feedback Agent 输出 suggestedProfileUpdate
- UI 可暂时不展示复杂画像更新
- 后端保存 output_json
- 不自动覆盖学生画像，只保存建议

验收：

- Agent 输出中包含画像更新建议
- 后续 Student Profile Agent 可读取

---

## Phase 6：测试与长期扩展检查

目标：

- 验证功能可用，也验证架构没有写死

检查：

- 是否能新增一个 planned agent 目录而不影响现有结构
- Tool Registry 是否可扩展
- Agent Registry 是否可扩展
- Context Builder 是否可复用
- Logger 是否支持不同 agent_name
- agent_outputs 是否支持不同 output_type

---

# 21. 给 Codex 的 v1.2 总执行提示词

可以直接复制给 Codex：

```md
请根据《学脉 Teaching Agent Operating System 开发指导书 v1.2》升级当前项目。

注意：本项目不是短视 MVP，不是只做一个家长反馈小功能。Parent Feedback Agent 只是第一条落地链路，底层必须按长期多 Agent Harness 系统搭建。

请优先完成：

1. 更新 AGENTS.md，明确长期架构原则。
2. 创建 shared Harness Core 目录。
3. 创建 Agent Registry。
4. 升级数据库设计，使其支持学生长期画像、Agent 输出资产、错题分析、月报扩展。
5. 实现 Parent Feedback Agent，但不要把逻辑写死。
6. 每次 Agent 运行都必须写 agent_runs。
7. 每个可复用输出都必须写 agent_outputs。
8. 老师确认后的反馈必须写 feedback_history 和 student_learning_records。
9. Parent Feedback Agent 输出中必须包含 suggestedProfileUpdate，但第一阶段不要自动覆盖学生画像。
10. 保持 UI 简洁，AI 输出必须可编辑、可复制、可保存。

不要做：
- 自动发微信
- 完整多 Agent 自主执行
- MCP
- 支付系统
- 无关页面重构

但架构上不能阻塞这些未来能力。
```

---

# 22. 最终验收标准 v1.2

## 22.1 功能验收

- [ ] 学生详情页能生成家长反馈
- [ ] 反馈可编辑
- [ ] 反馈可复制
- [ ] 反馈可保存
- [ ] 保存后进入 feedback_history
- [ ] 保存后进入 student_learning_records
- [ ] 每次生成有 agent_runs
- [ ] 每次输出有 agent_outputs
- [ ] 输出包含质量分
- [ ] 输出包含 suggestedProfileUpdate

---

## 22.2 架构验收

- [ ] 存在 Agent Registry
- [ ] 存在 Shared Harness Core
- [ ] Parent Feedback Agent 没有把所有逻辑写在 API route
- [ ] Tool 层可复用
- [ ] Context 层可复用
- [ ] Evaluation 层可复用
- [ ] Guardrails 层可复用
- [ ] Logging 层支持多个 Agent
- [ ] Recovery 层可复用
- [ ] 数据模型支持后续错题、月报、学生画像

---

## 22.3 长期扩展验收

- [ ] 可以新增 wrong-question-analysis agent 目录
- [ ] 可以新增 monthly-report agent 目录
- [ ] 可以新增 student-profile agent 目录
- [ ] agent_outputs 可存不同类型输出
- [ ] student_learning_records 可记录不同教学事件
- [ ] students 表支持画像更新
- [ ] teacher_preferences 可影响不同 Agent 风格

---

# 23. 审校后的关键风险提醒

## 23.1 最大理论风险

不要把“多 Agent 架构”误解为第一阶段就要上复杂多 Agent。

正确路线：

```txt
先做单 Agent 的完整 Harness
再抽象共享能力
再接入第二个 Agent
最后才做 Orchestrator
```

## 23.2 最大流程风险

不要让模型直接改学生画像。

正确路线：

```txt
模型提出 suggestedProfileUpdate
  ↓
老师确认或后续 Student Profile Agent 审核
  ↓
再写入 students profile fields
```

## 23.3 最大工程风险

不要为了长期架构，把第一阶段做成空架子。

第一阶段必须真实跑通：

```txt
生成反馈 → 编辑 → 复制 → 保存 → 记录日志 → 进入学习记录
```

如果这个闭环跑不通，再漂亮的 Agent OS 架构都没有商业价值。

---

# 24. 最后一条总原则

学脉不是一个“AI 帮老师写一句话”的工具。

学脉应该是：

> 一个以学生长期数据资产为核心，以 Agent Harness 为执行引擎，以老师确认和编辑为安全边界的 Teaching Agent Operating System。

第一阶段的 Parent Feedback Agent 是入口。

真正的长期闭环是：

```txt
学生档案
  ↓
课堂记录
  ↓
错题分析
  ↓
家长反馈
  ↓
学生画像更新
  ↓
月度报告
  ↓
教学建议
  ↓
批量跟进
  ↓
老师工作台总控
```

Codex 必须围绕这个长期闭环开发。

**阶段性交付，不等于架构短视。  
第一条链路要小，但底层系统要能长大。**
