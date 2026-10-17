# 小读者的阅读基石 — 发布与合规推进总览

> 续前稿：从《语文要素梳理》docx 蒸馏出 62 单元结构化知识库，做出童趣版单文件 HTML 小程序，并完成全案评估。本阶段落实用户四项决策：**现在就推 Pages / 小范围试用 / 课本单元指引卡 / 62 单元原创改写**。

## 已交付（三版递进）

| 版本 | 内容 | 状态 |
|------|------|------|
| v1.0.0 | 首发验证版：童趣小程序 + 13/13 E2E + 建仓推 Pages | 已推、已打 tag |
| v1.1.0 | 62 单元「阅读要素/习作要素」全部改写为**原创儿童友好表述**（语义等价，规避教辅演绎风险） | 已推、已打 tag |
| v1.1.1 | 未成年人保护首启告知 + 单次/单日时长温柔提醒 + 课本单元指引卡；E2E 适配覆盖层 | 已推、已打 tag |

## 站点
- 公开地址：**https://shiwei1981916-cpu.github.io/yuedu-jishi/** （GitHub Pages，main/root；首构建约 1–2 分钟，之后每次 push 自动重建）
- 仓库：`shiwei1981916-cpu/yuedu-jishi`（public）

## 关键执行
1. **原创改写规范**：`语文要素改写规范与样例.md` — 4 原则（语义准确/儿童友好/原创表述/不抄教辅）+ 格式（每条 1 句 12–40 字）+ 6 雷区 + 三上 8 单元样例与语义核验 + 54 单元排期。
2. **改写落地**：三上 8 单元按样例回写 JSON；三下–六下 54 单元由工人改写，经 `_merge_rewrite.py` 合并校验（reading/writing 字数、raw=reading+writing、主题 100% 沿用原文、六上七主题被工人误改已回退）后重生成 HTML `DATA` 块并同步 `index.html`。
3. **合规层**：frontend-lead 实现首启告知（数据仅存本机 / 适龄 8–12 / 护眼时长，localStorage 仅首启出现，aria-dialog + Esc/Enter + prefers-reduced-motion）、会话≥20 分与单日≥40 分 toast 提醒、课本指引卡「📖 翻开《语文》（年级册）第X单元…」。`node --check` 通过，DATA 未改动。

## 质量门禁
- 内容校验：62 单元全部命中 12–40 字区间（实测 18–32 字），主题字段 100% 沿用原库。
- 代码校验：`node --check` 通过；HTML `DATA` 解析为 62 单元无误；`index.html` 与 `阅读基石.html` 字节一致。
- E2E：规格已适配新覆盖层（`beforeEach` 注入 `yljs_agreed=1`，新增「合规-首启告知」用例）。**本沙箱缺 Playwright 浏览器二进制，未实跑**；CI 命令见下。

## 待办 / 需用户点头
- **E2E 实跑**：`npm i -D @playwright/test playwright && npx playwright install chromium`；`python3 -m http.server 8123`；`npx playwright test`（BASE_URL=http://localhost:8123）。
- **真机测试矩阵**：iOS Safari / Android Chrome / 微信 webview（重点验证微信内导出落地）。
- **主题原文录入瑕疵**：六下第一单元主题「……一段美好的」截断、五单元主题缺「让」等按规范保留未改；如需轻修请点头。
- **备案**：GitHub Pages 海外托管 + 小范围试用暂不需 ICP/教育APP 备案；若转微信小程序或国内托管再补。
- **下一步可选**：给每个要素配 2–3 个适龄引导微任务，从「要素浏览」升级为「阅读能力训练」。

## 文件清单（仓库根）
- `index.html` — Pages 入口（单文件应用，已含全部改写 + 合规层）
- `阅读基石.html` — 同源副本
- `语文要素知识库.json` — 改写后结构化知识库
- `语文要素改写规范与样例.md` — 改写规范 + 样例 + 排期
- `语文要素知识库_rewrite_54.json` — 54 单元改写中间产物（溯源）
- `README.md` — 发布说明与部署步骤
- `e2e/reading-base.spec.js` — Playwright E2E（13 既有 + 1 合规新增）
