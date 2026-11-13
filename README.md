# MiniMax丹炉

在浏览器里使用 [MiniMax H3 Image](https://platform.minimax.io/docs/api-reference/image-generation-h3-generations) 做文生图与图片编辑。纯前端单页应用，**Key 与历史都在本机**，不经过自有后端。

## 你能做什么

| 能力 | 说明 |
|------|------|
| 文生图 | 模型标准版 / 快速版，画面比例、清晰度、张数等可调 |
| 图片编辑 | 最多 16 张参考图，提示词中按「图 1、图 2…」说明 |
| API 配置 | 国内 [platform.minimaxi.com](https://platform.minimaxi.com) / 国际 [platform.minimax.io](https://platform.minimax.io)，Key 存 localStorage |
| 历史记录 | 生成结果写入 IndexedDB，可看详情、恢复参数与参考图 |
| 纯静态部署 | 构建产物可放 GitHub Pages 或任意静态托管 |

## 快速开始

```bash
git clone <你的仓库地址>
cd minimax-image
npm install
npm run dev
```

浏览器打开 http://localhost:5173 ，展开 **API 连接**，填入 Key 并选择 **国内 / 国际**（须与 Key 签发区域一致），保存后即可生成。

**手机浏览器**：布局单列自适应，底部固定「开始生成」；支持 iOS 安全区与弹层底部抽屉。复杂编辑、大批量历史建议在桌面端操作。

生产构建：

```bash
npm run build
# 静态资源在 console/dist
npm run preview   # 本地预览构建结果
```

## 推荐设置（少踩坑）

1. **返回方式**：默认 **Base64**。历史可完整离线保存；URL 返回的图在阿里云 OSS 上，纯前端**无法用脚本下载**。
2. **流式**：与 Base64 不能同时开；多张流式需用 URL，历史可能只留外链。
3. **负面提示词**：H3 不支持单独 negative prompt；要排除的内容写进正向描述（如「无文字、无 logo」）。
4. **计费**：URL 与 Base64 返回方式**不额外加价**，按成功出图的 token 扣费（见[官方定价](https://platform.minimax.io/docs/pricing/overview)）。

仅有 **URL** 的旧历史：在详情里 **新标签打开 → 另存为**，再用 **导入本机图片** 写入 Blob / Base64。

## 隐私与安全

- API Key 只保存在**当前浏览器**，不会上传到本项目的服务器（本项目无后端）。
- IndexedDB / localStorage 按**站点源**隔离：localhost 与 GitHub Pages 的历史不互通。
- 勿在公共电脑上保存 Key；构建产物不要提交 `.env` 或 Key。

## 技术栈

React · Vite · Tailwind CSS · Radix UI · IndexedDB

## 相关文档

- [文生图 API](https://platform.minimax.io/docs/api-reference/image-generation-h3-generations)
- [图片编辑 API](https://platform.minimax.io/docs/api-reference/image-generation-h3-edits)
- [图片生成指南](https://platform.minimax.io/docs/guides/image-generation)
