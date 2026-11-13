export const MODEL_LABELS: Record<string, string> = {
  "MiniMax-H3-Image": "标准版",
  "MiniMax-H3-Image-Highspeed": "快速版",
};

export const MODEL_LABELS_FULL: Record<string, string> = {
  "MiniMax-H3-Image": "标准版 — 画质更好",
  "MiniMax-H3-Image-Highspeed": "快速版 — 出图更快",
};

/** 下拉框内短文案，避免被裁切 */
export const RATIO_LABELS: Record<string, string> = {
  auto: "自动",
  "1:1": "正方形 1:1",
  "16:9": "横屏 16:9",
  "9:16": "竖屏 9:16",
  "4:3": "横屏 4:3",
  "3:4": "竖屏 3:4",
  "3:2": "横屏 3:2",
  "2:3": "竖屏 2:3",
  "21:9": "超宽 21:9",
  "3:1": "超宽 3:1",
};

export const RATIO_LABELS_FULL: Record<string, string> = {
  auto: "自动（根据描述智能选择）",
  "1:1": "正方形 1:1",
  "16:9": "横屏 16:9（常用）",
  "9:16": "竖屏 9:16（手机壁纸）",
  "4:3": "横屏 4:3",
  "3:4": "竖屏 3:4",
  "3:2": "横屏 3:2",
  "2:3": "竖屏 2:3",
  "21:9": "超宽屏 21:9",
  "3:1": "超宽 3:1",
};

export const AREA_LABELS: Record<string, string> = {
  "1K": "标清 1K",
  "2K": "高清 2K",
  "4K": "超清 4K",
};

export const AREA_LABELS_FULL: Record<string, string> = {
  "1K": "标清（约 100 万像素）",
  "2K": "高清（约 400 万像素）",
  "4K": "超清（约 1600 万像素）",
};

export const OUTPUT_FORMAT_LABELS: Record<string, string> = {
  jpeg: "JPG",
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
};

export const OUTPUT_FORMAT_LABELS_FULL: Record<string, string> = {
  jpeg: "JPG — 体积小，适合分享",
  jpg: "JPG",
  png: "PNG — 无损，文件较大",
  webp: "WebP — 体积小",
};

export const RESPONSE_FORMAT_LABELS: Record<string, string> = {
  url: "图片链接",
  b64_json: "Base64",
};

export const RESPONSE_FORMAT_LABELS_FULL: Record<string, string> = {
  url: "链接（推荐，浏览器直接看图）",
  b64_json: "Base64（给程序对接用）",
};
