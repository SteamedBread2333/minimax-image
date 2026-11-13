export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

/** 页面「更新记录」弹框内容（按时间倒序） */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2025-11-13",
    title: "纯前端落库",
    items: [
      "默认返回方式为 Base64，生成结果直接写入本地历史",
      "移除图片代理；OSS 外链改为「另存为 + 导入本机图片」",
      "历史仅存 URL 时可手动导入文件得到 Blob + Base64",
    ],
  },
  {
    date: "2025-11-13",
    title: "表单与控件",
    items: [
      "下拉改用 Radix Select（键盘与焦点一致）",
      "压缩质量改用 Radix Slider",
      "文件选择统一为按钮式 FileInput",
      "FormField 去掉占位空白，Label 与控件 id 关联",
    ],
  },
  {
    date: "2025-11-13",
    title: "参考图与历史",
    items: [
      "图片编辑：历史记录保存参考图（本地文件 / URL）",
      "历史详情分开展示「参考图」与「生成结果」",
      "参考图支持编号排序（图 1、图 2）与使用说明",
      "可从历史恢复参数与参考图到表单",
    ],
  },
  {
    date: "2025-11-13",
    title: "纯前端工作台",
    items: [
      "浏览器直连 MiniMax H3 Image API（文生图 / 编辑）",
      "API Key、国内与国际接口在本机配置",
      "生成结果与历史写入 IndexedDB",
      "简体中文参数面板与 GitHub Pages 部署",
    ],
  },
];
