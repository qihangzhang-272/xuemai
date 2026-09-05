# LessonLedger v2 Completion Audit

日期：2026-06-21

## 审计来源

- 用户提供的竞品视频逐字稿。
- `docs/product/competitor-lessonledger-prd.md`。
- 当前 `/workbench-v2` 前端页面、`/api/workbench-v2` API、`src/lessonledger/` 后端 service/repository。
- 本轮从视频抽取的临时参考帧：`/private/tmp/lessonledger-video-frames/contact-sheet.jpg`。
- 本轮当前页面临时截图：`/private/tmp/lessonledger-current-contact-sheet.jpg`。

临时截图不进入仓库，只用于本地视觉 QA。

## 完成度矩阵

| 视频/PRD 要求 | 当前状态 | 当前证据 | 备注 |
|---|---|---|---|
| 教师登录、家长登录、账号密码错误、未授权提示 | 已实现并本轮补强 | `/workbench-v2/login` 状态机 + Chrome 登录错误/未授权/成功/移动截图 + build | 当前仍是 mock 登录，不是真实 Auth |
| 教师端工作台展示本周课程、每月收入、今日课程、待办 | 已实现并本轮补强 | `renderDashboard`、Chrome dashboard density QA、前端点击 smoke、动态统计来自当前 state | 首屏统计块、今日日程、右侧待办和本周概览已再次压缩；可点击 smoke 覆盖工作台按钮和移动端健康 |
| 今日课程标记已上课、学生缺席、取消 | 已实现并本轮补强 | `markLessonStatus` service + 状态确认弹窗 + 测试覆盖扣课/重复扣课/取消清草稿 + Chrome 状态确认截图 | 确认前展示课程、课时流水和反馈入口影响；余额不足时后端会拒绝完成 |
| 班课开始点名、逐个学生改考勤并保存 | 已实现并本轮补强 | `saveAttendance` service + 测试覆盖 6 人点名和重复保存 + Chrome attendance modal 截图 | 点名弹窗已改为行内状态按钮与顶部人数汇总 |
| AI 课后反馈：内容、状态、作业、附件、预览、复制/发送家长 | 已实现并本轮补强 | `generateFeedback/saveFeedbackDraft/publishFeedback` + `src/lessonledger/ai-provider.ts` + provider/fallback tests + Chrome feedback flow | 已补 DeepSeek/OpenAI-compatible 文本 provider 边界；未配置 key 或输出不安全时回落到本地生成器 |
| 家长端收到最新反馈 | 已实现 | parent home/feedback 从已发布 feedbackDrafts 读取 | 已验证家长端可见 |
| 家长首页展示绑定老师与最近 5 条课程 | 已实现并本轮补强 | `renderParentHome` + Chrome parent home 截图 | 首页已压缩为家长门户工作台，老师资料来自后端 teacher snapshot |
| 家长围绕反馈发起沟通，老师回复后状态已确认 | 已实现并本轮补强 | `createMessageThread/replyMessageThread` + route/service tests + Chrome CDP 点击反馈详情到发起沟通 + 教师三栏沟通中心截图 | 教师端已补成列表/对话/反馈辅助三栏，状态按钮可切换为已确认 |
| 学生成绩记录与排名 | 已实现并本轮补强 | `addScore/updateScore` + 校验测试 + Chrome 学生页表格/学生切换截图 | 学生页顶部已从大列表压成横向学生切换栏，成绩记录以考试/日期/成绩/排名/情况流水表呈现 |
| 薄弱点记录 | 已实现并本轮补强 | `addWeakness/updateWeakness` + 校验测试 + Chrome 学生页表格截图 | 薄弱点已从行卡改为薄弱点/级别/来源/后续加强表格明细 |
| 课程和收款流水：充值、扣课、撤销、余额 | 已实现并本轮补强 | `addFinanceEvent` + 课时余额同步测试 + Chrome parent billing 截图 + 学生课程/收款/财务时间线表格截图 | 教师端学生档案已补成课程流水、收款流水和财务时间线三张明细表 |
| 家庭邀请：生成待激活账号链接、家长激活 | 已实现并本轮补强 | `createFamilyInvite/activateFamilyInvite` + 48h 过期测试 + 家庭账号表格 + 当前邀请链路面板 + Chrome invite modal / mobile activation 截图 | 链接为 `/portal/invite?token=...`；教师端已补齐待激活账号表格和门户同步记录 |
| 学习报告：综合反馈、成绩、薄弱点生成并保存，家长端可见 | 已实现并本轮补强 | `generateStudyReport/saveStudyReport` + `src/lessonledger/ai-provider.ts` + 教师端报告表格/详情 + 家长端可读报告详情 + Chrome report modal / desktop / mobile 截图 | 家长端默认 demo 报告已设为已保存且可见；报告生成已支持 provider 覆盖摘要/章节/建议并保留后端结构化来源 |
| 老师开放预约时段，蓝色开放、黄色课程 | 已实现 | schedule/parent booking UI + `createOpenSlots` | 视觉接近视频 |
| 家长提交预约，老师审核冲突并调整通过 | 已实现并本轮补强 | `createBooking/updateBooking` + 冲突测试 + Chrome booking flow + teacher/parent booking 截图 | 家长预约页显示自动排除冲突数量与无冲突推荐时段；教师审核列表、排课侧栏和冲突详情弹窗显示推荐调整时段 |
| 排课总表拖动课程到未来并确认重置/保留 | 已实现并本轮补强 | `moveLesson` + pointer drag fallback + 确认弹窗 + 测试覆盖重置清理点名/反馈 + Chrome/CDP 拖拽确认截图 | 当前构建已验证弹窗含原时间、新时间、重置/保留、冲突检查和确认动作 |
| 授权码检查、版本更新、保留数据 | 已实现 | `checkUpdate/applyUpdate` + update UI + 测试 | 当前为本地模拟更新 |
| 家长端手机浏览器适配 | 部分已验证并本轮补强 | 390px Chrome parent home 截图 | 家长端顶部操作区已修复移动端按钮截断 |
| 像素级一比一视觉 | 未完成 | 视频帧与当前 contact sheet 对照 | 需要继续按关键帧逐页压缩间距、表格密度和侧栏宽度 |

## 当前最高优先级缺口

1. 视觉 fidelity：教师端工作台和排课页已完成第一轮紧凑后台化，但还不是逐帧像素级复刻。
2. AI fidelity：反馈和报告已有可配置文本模型 provider 边界，但本地未配置真实 key 时仍回落到 deterministic 生成器；真实模型联调和提示词评测还未完成。
3. 移动端 fidelity：家长端首页 390px 已修复按钮截断，但还没有逐页对照视频/PRD 做完整手机截图 QA。
4. 生产化真实性：当前仍是本地 mock 与文件后端的竞品前端还原，真实 Auth、真实 AI 和生产迁移审计未接入。

## 本轮修正

- 家长首页“授课老师”卡片不再显示“老师暂未填写简介”占位。
- 老师别名、学科、城市、简介、家长端说明改为读取后端 `teacher` snapshot。
- 家长课程页同步去掉部分 `Qrane/数学` 硬编码，改为当前老师资料派生显示。

## 2026-06-21 视觉密度推进

- 教师端全局按钮、标签、`Section` 容器压缩一档，减少默认高度、圆角和内边距。
- 左侧导航从 200px 压到 184px，导航行高、图标和账号卡同步收紧，更接近视频里的窄后台侧栏。
- 工作台统计卡、今日日程行、待处理卡片压缩，1440px 首屏可显示更多课程和右侧待办。
- 排课总表和预约排课网格降低行高，课程块、开放预约块、冲突申请块更接近视频里的紧凑日历/表格。

## 2026-06-21 工作台表格化推进

- 工作台“今日日程”从独立卡片列表改为带表头、分隔线和固定列的表格行，更接近竞品视频的后台列表结构。
- 日程行分为“时间 / 课程 / 状态 / 操作”四列，进行中课程保留左侧蓝色状态条。
- 排课/预约右侧审核栏从 340px 收窄到 300px，冲突卡去掉冗余禁用按钮，只保留“处理冲突 / 查看”。
- 全局按钮增加 `whitespace-nowrap`，避免紧凑宽度下中文按钮断行。

## 2026-06-21 统计卡与排课块压缩

- 工作台三张统计卡去掉阴影、降低圆角和内边距，数值与辅助标签压缩为更接近竞品的薄信息块。
- 排课总表行高从 108px 继续压到 94px，课程块、已通过预约块、冲突/待审核申请块统一改成更扁的表格内状态块。
- 空时段占位降低高度，蓝色开放预约条、黄色课程块和红色冲突块在同一格内更紧凑。
- Chrome 1440px 截图验证路径：`/workbench-v2` 与 `/workbench-v2?role=teacher&view=schedule&scheduleSection=booking`。

仍未完成：像素级一比一还需要继续按视频关键帧逐页校准家长端、弹窗、移动端和拖拽状态。

## 2026-06-21 家长端门户与沟通链路压缩

- 家长端顶部栏收窄，桌面端主宽度压到 1120px；移动端操作按钮改为独占一行换行，修复 390px 下“查看账务/教师端”按钮被截断。
- 家长首页从大卡片门户改成紧凑门户工作台：绑定学生、授课老师、剩余课次、已发反馈四个薄统计块；最近课程改为“日期 / 课程 / 状态 / 操作”表格列表。
- 最新反馈卡增加“查看全文 / 沟通”并列入口，家长能从首页直接走到反馈详情和关联沟通。
- 反馈详情弹窗改为左侧反馈正文、右侧关联课程和沟通入口，减少大卡片嵌套。
- 发起沟通弹窗顶部展示已关联反馈，默认填入视频里的“想让老师讲讲取值范围的问题”和取值范围沟通正文；Chrome CDP 验证发送按钮可用。
- Chrome 临时截图验证路径：`/workbench-v2?role=parent`，以及点击“查看全文 -> 发起沟通”的反馈沟通链路。

仍未完成：家长端课程、账务、预约、通知、报告详情还需要继续按视频关键帧做视觉统一；教师端课程编辑、预约详情、更新授权弹窗还需要继续压缩。

## 2026-06-21 教师端点名、邀请、学习报告弹窗压缩

- 班课点名弹窗从下拉框改为行内“签到 / 迟到 / 请假 / 缺席”状态按钮，顶部新增实时人数汇总，更贴近视频里逐个学生改考勤并保存的操作感。
- 家庭邀请弹窗改为三列薄信息块加单一邀请链接区域，保留“待激活 / 48小时有效 / 复制邀请链接”主流程。
- 学习报告弹窗压缩左右栏高度与内边距，左侧集中展示输入来源、成绩/薄弱点/课程数量和生成要求，右侧展示生成前空状态与生成后报告预览。
- Chrome CDP 临时验证了：`?modal=attendance`、`?modal=invite`、学生页点击“生成学习报告 -> AI 生成草稿”的弹窗链路，未发现运行时异常。

仍未完成：学习报告详情文本仍是 deterministic 生成模板，不是真实大模型；报告弹窗保存后家长端详情仍需继续按视频视觉统一。

## 2026-06-21 家长端账务、报告、预约压缩

- 家长端账务页改成三块薄统计卡、课时流水表和右侧付款方式摘要，展示剩余课次、已收金额、扣课记录、充值/扣课/撤销明细。
- 家长端学习报告页从教师长报告复用改为家长门户摘要：顶部阶段总结、近期成绩、近期反馈摘要、当前薄弱点、后续安排和报告来源。
- Demo 初始报告改为“已保存 / 家长端可见”，避免家长端报告入口首次打开只显示空状态；老师生成草稿再保存的真实流程仍保留。
- 家长端预约页压缩网格行高和右侧提交预约栏，保留蓝色开放时段、黄色已有课程、冲突提示、已选预约和最近预约状态。
- 家长端通知页从空卡片改为表格式提醒流，覆盖反馈、预约、学习报告和课时流水状态；我的资料页补齐家长账号、绑定学生、老师信息和可见内容摘要。
- Chrome CDP 临时验证了家长端报告 hydrate 后正文可见，并保存账务、报告、预约、选时弹窗、通知、资料页截图。
- 390px 移动视口验证家长首页、通知、资料、预约、报告无横向溢出。

仍未完成：这轮完成的是可演示前端主线，不是逐帧像素级复刻；更新授权弹窗、教师端少数详情弹窗和拖拽细节还需要继续精修。

## 2026-06-21 预约审核、授权更新与拖拽确认态压缩

- 教师端预约申请弹窗从大卡片列表改为“时间 / 申请 / 状态 / 操作”审核表格，冲突申请优先显示“处理冲突”。
- 预约冲突详情弹窗改为两栏审核面板：左侧展示申请信息、冲突检测和推荐无冲突时段，右侧展示调整结果、审核备注和“修改并通过”。
- 冲突详情打开时会默认套用第一个无冲突推荐时段，避免演示时按钮因仍冲突而不可点。
- 管理授权弹窗改为“授权状态 / 授权码 / 当前版本 / 更新说明 / 数据保留”两栏结构，强化视频里“授权码更新且保留数据”的卖点。
- 拖拽课程确认弹窗压缩为首屏可完成：原时间、新时间、重置/保留状态、冲突检查和确认按钮都在 1366x768 视口内可见。
- Chrome CDP 临时验证了：预约申请列表点击“处理冲突”、冲突详情推荐时段可通过、授权弹窗包含更新说明与数据保留、排课总表拖拽后出现重置/保留确认。

仍未完成：还不是逐帧像素级复刻；登录页、少数新增/编辑表单弹窗和更细移动端状态仍可继续打磨。

## 2026-06-21 登录入口与高频表单弹窗压缩

- `/workbench-v2/login` 从偏营销的功能卡片改为试用授权入口：登录表单旁展示今日课程、本周课程、本月实收、当前版本、演示账号和授权状态。
- 新增学生弹窗改为左侧录入、右侧“建档后同步”摘要，保存前即可看到学生列表、家长账号、课时余额和后续档案入口。
- 新增课时流水弹窗改为左侧录入、右侧“流水预览”摘要，突出学生、家长、类型、课时变化、收款金额和余额。
- Chrome CDP 临时验证桌面登录页、学生弹窗、财务弹窗渲染正常；390px 移动视口验证三者无横向溢出。

仍未完成：完整逐帧还原仍需继续覆盖登录态错误、更多编辑弹窗和极端空数据状态。

## 2026-06-21 成绩、薄弱点与开放预约弹窗压缩

- 新增成绩弹窗改为两栏操作面板：左侧录入考试名称、日期、成绩、排名和考试情况，右侧实时展示学生、家长、考试、成绩、排名和进入学习报告的同步说明。
- 新增薄弱点弹窗改为两栏操作面板：左侧录入薄弱点、严重程度、来源和后续加强动作，右侧实时展示薄弱点预览、严重程度标签、归档位置和后续加强动作摘要。
- 新增预约时段弹窗改为批量开放面板：左侧选择多日和开放时间，右侧展示已选日期、开放时间、家长端可选两小时起始选项、覆盖已有黄色课程数量和逐日开放状态。
- Chrome/CDP 临时验证了桌面端成绩、薄弱点、开放预约三个弹窗，以及 390px 移动视口下同三种弹窗，均可打开且无横向溢出。

仍未完成：这轮补齐了视频中会频繁点击的高频表单面板，但课程新增/编辑、空状态、错误态和更极端移动高度还需要继续逐页抠。

## 2026-06-21 课程编辑与 AI 反馈弹窗压缩

- 新增/编辑课程弹窗从字段堆叠改为排课操作面板：左侧维护学生/班级、课程、时间、状态、应收和课时变化，右侧展示排课预览、冲突检测、保存后同步位置和学生余额提示。
- 课后反馈弹窗副标题改为读取当前课程，不再写死日期和学科；左侧集中展示反馈生成依据、课程内容、上课状态、课后作业和附件，右侧展示 AI 状态、附件分析、反馈正文和家长端预览。
- 移动端反馈弹窗底部按钮改为五列短按钮，并将内部高度从 `86vh-76px` 收紧到 `86vh-116px`，避免标题区较高时底部操作被圆角容器裁切。
- Chrome/CDP 临时验证了桌面端新增课程、桌面端课后反馈、桌面端生成反馈状态、390px 新增课程和 390px 课后反馈；最终复验移动端反馈底部按钮无裁切且无横向溢出。

仍未完成：课程编辑与反馈弹窗已进入可演示精修状态，但完整逐帧还原仍需继续覆盖登录错误态、极端空数据和更多视频关键帧。

## 2026-06-21 今日课程状态操作条修正

- 工作台今日课程表移除旧的演示 preset 行，改为完全读取真实 `Lesson` 数据，避免展示姓名、班课类型和按钮动作串行。
- 一对一待上课课程现在在行内直接展示“已上课 / 学生缺席 / 取消 / 编辑”，对应视频中老师可直接记录课程状态的流程。
- 已完成且待反馈课程展示“去反馈 / 编辑”，班课待点名课程只在真实班课行展示“开始点名 / 编辑”。
- Chrome/CDP 临时验证桌面和 390px 移动端均可见状态按钮，无横向溢出；额外校验不再出现“一对一展示行绑定班课点名”的错位。

仍未完成：状态动作目前是直接执行并 toast 提示，后续若视频关键帧证明竞品有二次确认弹窗，再继续补确认态视觉。

## 2026-06-21 今日课程状态确认弹窗补齐

- 工作台今日课程表的 `已上课 / 学生缺席 / 取消` 操作接入 PRD 中的“状态确认弹窗”，避免误点后直接写入课程状态。
- 弹窗展示本节课程、目标状态和确认后影响：今日课程状态、课时流水、反馈入口三块信息在确认前可见。
- 已上课确认说明会同步扣课并进入待反馈；缺席/取消确认说明不会新增正常扣课流水，并清理未发送反馈草稿。
- Chrome/CDP 临时验证桌面状态确认弹窗 `/private/tmp/lessonledger-status-confirm-modal-20260621.png` 与 390px 移动弹窗 `/private/tmp/lessonledger-mobile-status-confirm-modal-20260621.png`，未发现运行时异常或框架错误。

仍未完成：这补齐了课程状态确认态，但整体视觉仍需继续按视频关键帧做逐页审计和密度校准。

## 2026-06-21 登录态错误与授权状态补齐

- `/workbench-v2/login` 接入 PRD 中的登录状态机：空态、登录中、登录成功、账号密码错误、未授权和网络异常均有明确文案。
- 教师端授权码增加格式和值校验；未填、格式错误或非试用授权码时禁止进入系统，并保留当前输入。
- 登录页增加教师/家长演示账号快捷填入，试用授权入口仍展示今日课程、本周课程、本月实收、版本和账号绑定状态。
- Chrome/CDP 临时验证截图：`/private/tmp/lessonledger-login-error-state-20260621.png`、`/private/tmp/lessonledger-login-unauthorized-state-20260621.png`、`/private/tmp/lessonledger-login-success-route-20260621.png`、`/private/tmp/lessonledger-mobile-login-state-machine-20260621.png`。

仍未完成：真实 Auth、登录态过期 API 401 跳转、服务端授权校验仍未接入；当前是竞品前端还原与本地 mock。

## 2026-06-21 排课拖拽确认态回归补强

- 排课总表课程块增加 pointer 事件拖拽链路，避免原生 drag/drop 在自动化或浏览器环境中触发不稳定时丢失确认态。
- 课程拖到其他日期/时间格后继续打开“确认调整课程时间”弹窗，保留原时间、新时间、重置/保留状态、冲突检查和确认调整动作。
- Chrome/CDP 当前构建验证路径：`/workbench-v2?role=teacher&view=schedule&scheduleSection=table`。
- 验证结果包含：页面标题 `LessonLedger 课时管理系统`、无框架错误、确认弹窗字段齐全、`pointerFallback.ok=true`、截图 `/private/tmp/lessonledger-schedule-drag-confirm-current-20260621.png`。

仍未完成：这条交互已经完成当前构建回归；剩余主要是逐帧像素级视觉、真实 AI 和真实账号/授权系统。

## 2026-06-21 学生档案表格化收口

- 教师端学生列表从三张大卡改为紧凑后台表格行，列出学生、服务类型、账务状态、下次排课、学习关注和操作。
- 学生档案摘要从卡片组改成同一张信息表，保留年级科目、剩余课时、最近成绩、家庭账号和学习状态。
- 成绩记录改为流水表，列出考试、日期、成绩、排名、考试情况和编辑入口。
- 薄弱点记录改为表格明细，列出薄弱点、级别、来源、后续加强和编辑入口。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=scores`。
- 验证截图：`/private/tmp/lessonledger-students-table-desktop-20260621.png`、`/private/tmp/lessonledger-students-table-mobile-20260621.png`；桌面和 390px 移动端均无页面级横向溢出。

仍未完成：学生页已经完成一轮传统教务后台化；完整一比一还需要继续按视频关键帧校准其余页面密度、真实 AI 和真实账号/授权系统。

## 2026-06-21 沟通中心三栏还原

- 教师端沟通中心补成左侧沟通列表、中间关联反馈/对话、右侧反馈辅助的三栏结构，对齐视频 155s 关键帧。
- 对话顶部增加“待处理 / 已确认 / 关闭”状态区，其中待处理和已确认会真实更新当前沟通状态。
- 右侧反馈辅助展示待确认草稿、最近已发布反馈和当前处理记录。
- 家长端留言页保留门户端阅读结构，并验证 390px 移动端消息气泡和关联反馈不溢出。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=messages`、`/workbench-v2?role=parent&view=parentMessages`。
- 验证截图：`/private/tmp/lessonledger-teacher-messages-three-column-20260621.png`、`/private/tmp/lessonledger-parent-messages-mobile-20260621.png`。

仍未完成：关闭状态、已读状态和真实消息通知仍是前端 mock/本地状态，生产化后需要接入后端持久化。

## 2026-06-21 课程与收款流水表格化

- 学生档案“课程”页改为课程流水表，列出日期、时间、课程、类型、状态和操作，并在表头区域展示总课次、已完成、待上课。
- 学生档案“收款”页改为收款与课时流水表，列出日期、类型、课时变化、收款金额、余额、备注和明细入口。
- 学生档案“财务时间线”页改为明细表，列出日期、事件、课时变化、余额、说明和现金。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=lessons`、`studentTab=payments`、`studentTab=timeline`。
- 验证截图：`/private/tmp/lessonledger-student-lessons-desktop-20260621.png`、`/private/tmp/lessonledger-student-payments-desktop-20260621.png`、`/private/tmp/lessonledger-student-timeline-desktop-20260621.png`、`/private/tmp/lessonledger-student-payments-mobile-20260621.png`；桌面和 390px 移动端均无页面级横向溢出。

仍未完成：这些页面已完成视频 185s 方向的表格化；删除课程、正式凭证、关闭流水和操作审计仍是生产化阶段要补的后端能力。

## 2026-06-21 家庭账号邀请表格化

- 学生档案“家庭账号”页改为家庭账号与邀请表格，列出家庭账号、手机号、备注、绑定学生、状态、有效期和操作，替换原来的大卡片式账号状态。
- 右侧“当前邀请链路”集中展示绑定学生、家长账号、待激活状态、48 小时有效邀请链接、复制邀请和预览入口。
- 底部新增“家长门户同步记录”表，覆盖最近沟通、课后反馈和通知记录，用来对齐家长端可见内容。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=family`、`/workbench-v2/invite/b3a5f55cc8da67a1020b0e88d1126ce5716c88f4e4cf3cf69dafd4000624a047`。
- 验证截图：`/private/tmp/lessonledger-family-table-desktop-20260621.png`、`/private/tmp/lessonledger-family-invite-modal-after-table-20260621.png`、`/private/tmp/lessonledger-family-table-mobile-20260621.png`、`/private/tmp/lessonledger-portal-invite-mobile-20260621.png`；桌面表格、邀请弹窗、390px 移动表格和家长激活页均无页面级横向溢出。

仍未完成：家庭邀请已完成前端主流程还原；真实 Auth、短信/微信触达、账号启停审计和正式家长账号生命周期仍未生产化。

## 2026-06-21 学习报告详情收口

- 教师端学生档案“学习报告”页改为报告表格，按报告、周期、生成依据、状态和操作展示，并支持切换当前报告详情。
- 教师端报告详情改为来源侧栏 + 完整报告正文，覆盖阶段摘要、成绩波动、薄弱点与后续加强、近期反馈综合、报告结论和后续巩固方向。
- 家长端“学习报告”页改为家长可读报告详情，覆盖阶段总结、近期成绩、当前薄弱点、近期课程反馈、后续巩固方向、报告概览、报告来源和关联课程反馈。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=reports`、`/workbench-v2?role=parent&view=reports`。
- 验证截图：`/private/tmp/lessonledger-reports-teacher-desktop-20260621.png`、`/private/tmp/lessonledger-reports-teacher-modal-20260621.png`、`/private/tmp/lessonledger-reports-teacher-mobile-20260621.png`、`/private/tmp/lessonledger-reports-parent-desktop-20260621.png`、`/private/tmp/lessonledger-reports-parent-mobile-20260621.png`；桌面、弹窗和 390px 移动端均无页面级横向溢出或控制台错误。

仍未完成：学习报告仍是本地 deterministic 生成器；真实 AI 生成、报告编辑版本和生产级家长可见审计还未接入。

## 2026-06-21 预约冲突排除收口

- 家长端预约页补齐“冲突排除”面板，按黄色课程和待审核预约计算可选时间、冲突时间，并提供无冲突快捷选择。
- 家长端选时段弹窗显示候选时间总数、无冲突数量和需老师调整数量，帮助复刻视频里“系统自动排除冲突时段”的预约体验。
- 教师端预约审核列表、排课侧栏和冲突详情弹窗都显示推荐调整时段，冲突详情默认套用首个无冲突推荐，便于直接“修改并通过”。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=schedule&scheduleSection=booking`、`/workbench-v2?role=parent&view=booking`。
- 验证截图：`/private/tmp/lessonledger-booking-teacher-desktop-20260621.png`、`/private/tmp/lessonledger-booking-conflict-modal-20260621.png`、`/private/tmp/lessonledger-booking-parent-desktop-20260621.png`、`/private/tmp/lessonledger-booking-picker-modal-20260621.png`、`/private/tmp/lessonledger-booking-parent-mobile-20260621.png`；桌面、弹窗和 390px 移动端均无页面级横向溢出或控制台错误。

仍未完成：预约链路仍是本地 mock/文件后端演示；真实生产化需要处理并发抢占、真实家长通知、正式账号权限和审核操作审计。

## 2026-06-21 学生档案首屏压缩

- 教师端学生管理页顶部从大表格“学生列表”改为横向“学生切换”档案栏，减少学生选择区对首屏的占用。
- 选中学生使用黑底卡片，非选中学生使用白底薄边框，每张卡集中展示家长、年级科目、账务、下次排课和学习关注。
- 学生档案摘要、横向标签和成绩流水表在首屏更早出现，对齐竞品视频 185s 的“横向标签 + 明细表”视觉节奏。
- Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=scores`。
- 验证截图：`/private/tmp/lessonledger-students-switch-desktop-20260621.png`、`/private/tmp/lessonledger-students-switch-mobile-20260621.png`；桌面和 390px 移动端均无页面级横向溢出、无框架错误、无控制台错误。

仍未完成：这次只压缩学生档案首屏；像素级一比一仍需要继续逐页对照视频关键帧处理其它子页和极端移动状态。

## 2026-06-21 工作台首屏压缩与前端点击 smoke

- 教师工作台统计块继续压缩为薄信息块，今日日程表格行、状态标签和操作按钮同步缩短，右侧“今日待处理”改为紧凑任务行。
- 工作台主栅格增加顶部对齐，消除左侧日程表被右侧栏高度撑出的空白；本周概览条形图高度同步收紧。
- 新增临时 Chrome 点击 smoke：`/private/tmp/lessonledger-frontend-click-smoke.mjs`。
- smoke 覆盖 12 个前端 action 流程：教师端工作台按钮、教师端主要导航、学生标签和高频弹窗、预约排课弹窗、反馈生成、班课点名、财务/账号/更新/资料动作、排课空格新增课程、假期开放预约、家长端反馈详情到发起沟通、家长端导航、预约选时弹窗、通知/资料二级动作和 390px 移动端工作台健康。
- smoke 已改为每次先调用 `resetDemo`，避免本地点击状态污染后导致已点名课程、重复财务流水或重复 key warning 影响复验。
- 验证截图：`/private/tmp/lessonledger-frontend-click-smoke-dashboard-20260621.png`、`/private/tmp/lessonledger-frontend-click-smoke-parent-20260621.png`、`/private/tmp/lessonledger-dashboard-density-desktop-20260621.png`、`/private/tmp/lessonledger-dashboard-density-mobile-20260621.png`。
- 本轮 `typecheck`、`lint`、LessonLedger 关键测试、生产 `build`、点击 smoke、工作台密度 QA 均通过；AI Provider 接入后又复跑 12-flow 点击 smoke，结果为 12 passed / 0 failed，浏览器 console 无重复 key 警告。

仍未完成：前端主链路已经可点击可跳转；后端生产化、真实 Auth、真实 AI、真实通知和像素级逐帧复刻不在本轮前端收敛范围内。
