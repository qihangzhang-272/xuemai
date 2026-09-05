# 学脉投资人原型预览

## 预览入口

- 本地：`http://127.0.0.1:3000/`
- 线上部署后：打开 Vercel 返回的 Production URL。

首页和 `/dashboard` 都指向同一个微信式 AI 教学工作台原型。

## 当前展示范围

- 学生/班级/老师工作台三栏结构。
- Skill 胶囊入口。
- SkillCard 审核、编辑、复制、标记已发、确认入档 mock 闭环。
- 右侧学生/班级上下文与卡片审核面板。
- 所有演示数据均为 mock，不依赖真实 AI 或 Supabase。

## 安全边界

- 不上传 `.env.local`。
- 不上传真实 DeepSeek key、Supabase service role key。
- 投资人演示仅展示 mock 原型，不演示真实学生数据。
- 真实写入 API 已要求 Supabase Auth session；线上未配置环境变量时，不应作为真实后端演示。

## Vercel 部署命令

在确认允许上传代码到 Vercel 后执行：

```bash
npx vercel@latest --yes --prod
```

部署完成后，Vercel CLI 会输出一个 `https://...vercel.app` 链接，可直接发给投资人。

## 本地验收命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

当前 `npm audit` 已知存在 Next 内置 PostCSS moderate 风险，不要执行 `npm audit fix --force`。
