export function dateLabel(value: string) {
  // 日期字段不是 UTC 时间戳；中午解析，避免美洲时区显示为前一天。
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value)
    .toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}
