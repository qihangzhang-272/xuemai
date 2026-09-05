# Context Loaders

用于按 Skill 读取必要上下文。

原则：

- 每个 Skill 只加载必要数据。
- 长文本优先传摘要和 record id。
- 不把所有学生、所有班级、所有历史聊天塞给模型。

