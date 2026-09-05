# 学脉项目文档

这里存放需要团队长期共同维护的正式文档。

## 当前权威文档

| 文档 | 用途 | 当前版本 |
|---|---|---|
| [产品需求文档](product/product-requirements.md) | 产品范围、页面、流程、功能、状态与验收基线 | V5.4.1 |
| [代码验收标准](development/code-acceptance-criteria.md) | 开发自检、测试、PR 审核和合入判定标准 | V1.0 |

## 目录约定

| 目录 | 内容 |
|---|---|
| `product/` | 产品定位、PRD 和正式产品决策 |
| `design/` | 已确认的交互和视觉规范 |
| `architecture/` | 长期有效的系统与数据设计 |
| `development/` | 开发、测试、发布和协作规范 |
| `archive/` | 已失效但仍需保留的历史文档 |
| `assets/` | 正式文档引用的图片和附件 |

当前只提交已经确认的正式文档。目录在出现第一份正式内容时创建，不放空目录。

## 文档命名规则

- 文件名统一使用小写英文和连字符，例如 `product-requirements.md`。
- 版本号写在文档内部，不写进文件名，避免每次升级都改变链接。
- 当前有效文档不使用 `final`、`latest`、`最新版`、`最终版`等难以持续维护的名称。
- 历史快照需要保留时，移动到 `archive/`，并使用 `YYYY-MM-DD-topic.md`。
- 图片和附件放入对应的 `assets/` 目录，不散落在仓库根目录。

## 权威性规则

- 当前产品决策以 `product/product-requirements.md` 为准。
- 所有代码改动以 `development/code-acceptance-criteria.md` 作为统一验收门槛。
- 代码行为与 PRD 不一致时，应在 Pull Request 中明确说明差异。
- 新文档必须从本导航添加入口，避免形成不可发现的孤立文件。
