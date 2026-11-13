# MiniMax 图片工作台

纯前端 SPA，浏览器直连 [MiniMax H3 Image](https://platform.minimax.io/docs/api-reference/image-generation-h3-generations) API。API Key 与历史记录均存在本机（localStorage / IndexedDB）。

## 功能

- 文生图 `POST /v1/images/generations`
- 图片编辑 `POST /v1/images/edits`（JSON 或 multipart）
- 页面配置国内 / 国际 API 地址与 Key
- 历史记录本地保存（含图片 blob）

## 使用

```bash
npm install
npm run dev
```

打开 http://localhost:5173 ，在 **API 连接** 中保存 Key 后即可使用。

生产构建：`npm run build`，静态文件在 `console/dist`，可部署到任意静态托管。

## GitHub Pages

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
2. 将代码推到 `main`（或 `master`），会自动运行 `.github/workflows/deploy-pages.yml`。
3. 访问 `https://<用户名>.github.io/<仓库名>/`（workflow 会设置 `VITE_BASE_PATH` 为 `/仓库名/`）。

若仓库名为 `username.github.io`（用户站根目录），在 workflow 的 Build 步骤把 `VITE_BASE_PATH` 改为 `/`。

## 说明

- MiniMax API 已开放 CORS，无需 Node 代理。
- Key 只存在浏览器，请勿在公共电脑保存。
- 历史存图时若图片 CDN 不允许跨域，可能只保存元数据；可选用 `b64_json` 返回格式。
