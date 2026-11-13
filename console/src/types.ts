export const MODELS = ["MiniMax-H3-Image", "MiniMax-H3-Image-Highspeed"] as const;
export const AREAS = ["1K", "2K", "4K"] as const;
export const OUTPUT_FORMATS = ["jpeg", "jpg", "png", "webp"] as const;
export const RESPONSE_FORMATS = ["url", "b64_json"] as const;
export const ASPECT_RATIOS = [
  "auto",
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "21:9",
  "3:1",
] as const;

export type GenerationParams = {
  model: (typeof MODELS)[number];
  prompt: string;
  disable_prompt_enhanced: boolean;
  n: number;
  size: string;
  aspect_ratio: string;
  area: (typeof AREAS)[number];
  output_format: (typeof OUTPUT_FORMATS)[number];
  response_format: (typeof RESPONSE_FORMATS)[number];
  stream: boolean;
  output_compression: number;
};

export type EditParams = Omit<GenerationParams, "disable_prompt_enhanced"> & {
  imageUrls: string[];
  useMultipart: boolean;
};

export type ImageResult = {
  url?: string;
  b64_json?: string;
  size?: string;
  revised_prompt?: string;
};

export type ApiResponse = {
  type?: string;
  created?: number;
  data?: ImageResult[];
  usage?: Record<string, unknown>;
  request_id?: string;
  error?: { message?: string; type?: string };
};
