export function formatApiError(message: string): string {
  if (message.includes("2049")) {
    return `${message} — 请在「API 连接设置」中核对：国内 Key 选国内，国际 Key 选国际`;
  }
  if (message.includes("1008") || /insufficient balance/i.test(message)) {
    return `${message} — 账户余额不足，请在 MiniMax 控制台充值或开通套餐后再试（国内：https://platform.minimaxi.com）`;
  }
  if (message.includes("2053") || /insufficient credit/i.test(message)) {
    return `${message} — 额度不足，请充值或调整计费方式后重试`;
  }
  return message;
}
