当前项目为学脉 / Xuemai。
请按照 docs/PRD.md 和 AGENTS.md 执行开发。

本阶段目标：不要做复杂 Agent，不要做 LangGraph，不要做 Redis，不要做向量库，不要做 MCP。
先完成 Harness-first 的 MVP 骨架。

请按以下顺序执行：

1. 检查当前项目结构和技术栈。
2. 创建或更新 AGENTS.md。
3. 创建 docs/PRD.md、docs/ENGINEERING_GUIDE.md、docs/AI_SKILL_SPEC.md。
4. 实现微信式三栏 UI mock：主导航、会话列表、聊天区、右侧 ContextPanel、底部 SkillLauncher。
5. 实现统一 SkillCard 组件。
6. 实现 Skill Registry 和 mock Skill Runner。
7. 实现学生会话中的 update_learning_record mock 流程。
8. 实现 generate_feedback mock 流程。
9. 点击“确认入档”后在聊天流插入 ArchiveLog。
10. 所有实现先用 mock data，不要急着接真实 AI 和复杂后端。

验收标准：
- 可以打开学生会话。
- 可以看到学生/班级/老师工作台不同 Skill 胶囊。
- 可以点击 Skill 生成 SkillCard。
- SkillCard 显示状态、依据、结果、操作、入档目标。
- 点击确认入档后出现 ArchiveLog。
- 右侧 ContextPanel 显示当前对象档案和 AI 依据。
- 不出现普通聊天文本直接作为正式反馈的情况。
- 不引入复杂 Agent 架构。

完成后请汇报：
- 修改了哪些文件
- 实现了哪些功能
- 运行了哪些命令
- 有没有失败
- 下一步建议
