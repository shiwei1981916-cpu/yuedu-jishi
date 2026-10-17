# 小读者的阅读基石（发布验证版 v1.1.0）

面向小学 3–6 年级儿童的「阅读基础建设」辅助工具。单文件 HTML，纯前端，无后端，数据存浏览器本地。

## 发布状态
- 当前为「小范围试用」验证版，独立网页直接分发（邀请链接 / 班级群）。
- 质量门禁：13/13 E2E 通过（Playwright）。
- 版权：62 单元「阅读要素 / 习作要素」已全部改写为原创儿童友好表述（语义等价，规避教辅演绎风险），依据 `语文要素改写规范与样例.md`。主题（theme）100% 沿用原库未改写。
- 合规：未成年人保护设计待落地（首启明示 + 适龄声明 + 单日时长提醒）。

## 本地预览
双击 `index.html` 或浏览器打开即可。

## 部署（GitHub Pages）
1. 仓库 Settings → Pages → Deploy from a branch → main / root
2. 约 1–2 分钟后访问 https://<user>.github.io/<repo>/
3. 自定义域名（可选）：放 CNAME + DNS，GitHub 自动 HTTPS

## E2E 测试（Playwright）
质量门禁：14 条用例（13 既有回归 + 1 合规首启告知），覆盖导出/导入/笔记/配额异常/可访问性/合规覆盖层。

本地运行：
```bash
npm i -D @playwright/test playwright   # 仅首次
npx playwright install chromium        # 仅首次（浏览器二进制）
npm run test:e2e                        # 自动起 http.server 并跑 e2e/reading-base.spec.js
```
CI：`push` 到 main 自动触发 `.github/workflows/e2e.yml`（GitHub Actions 安装 chromium 并跑全套）。

