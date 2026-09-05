# 贡献与命名规范

## 基本流程

1. 从 `main` 创建目的明确的分支。
2. 一次 Pull Request 只处理一个主题。
3. 按[代码验收标准](docs/development/code-acceptance-criteria.md)完成自检和验收证据。
4. 通过 Pull Request 审核后合入 `main`，不要直接向 `main` 强制推送。

## 分支和提交

- 功能分支：`feature/short-description`
- 修复分支：`fix/short-description`
- 文档分支：`docs/short-description`
- 整理分支：`chore/short-description`
- 提交信息使用简短动词短语，例如 `docs: organize product documentation`。

自动化协作者可以使用其工具要求的分支前缀，但仍应保持一个分支只处理一个主题。

## 文件命名

| 文件类型 | 规则 | 示例 |
|---|---|---|
| React 组件 | PascalCase | `StudentProfilePanel.tsx` |
| TypeScript 模块 | 小写英文加连字符 | `student-profile.ts` |
| 测试文件 | 与被测主题一致，以 `.test.ts` 或 `.test.tsx` 结尾 | `student-profile.test.ts` |
| Next.js 路由目录 | 小写英文加连字符 | `parent-feedback/` |
| Markdown 文档 | 小写英文加连字符 | `product-requirements.md` |
| 静态资源 | 小写英文加连字符 | `xuemai-logo.png` |

现有业务代码不为统一命名而批量改名。只有在修改对应模块时，才连同引用和测试一起逐步收敛。

## 文档规则

- 当前 PRD 固定路径为 `docs/product/product-requirements.md`。
- 版本号保留在文档内容中，不修改文件名。
- 正式文档必须加入 `docs/README.md`。
- 临时截图、个人日志、审计过程和生成产物不要提交到正式文档目录。

## 提交前检查

所有代码改动必须满足[代码验收标准](docs/development/code-acceptance-criteria.md)。以下是 Web、服务端和 AI 工作流的基础检查：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

纯文档改动至少检查链接、Markdown 格式和 `git diff --check`。
