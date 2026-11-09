/** 后台统一使用的“未分类”名称。 */
export const UNCATEGORIZED = "不分类";

const LEGACY_UNCATEGORIZED = new Set(["", UNCATEGORIZED, "未分类", "未分类专辑"]);

/**
 * 把空值、历史数据里的“未分类 / 未分类专辑”统一成“不分类”。
 * 图片和音乐都复用各自的 album 列，所以这里做一层归一。
 */
export function normalizeCategory(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || LEGACY_UNCATEGORIZED.has(trimmed)) return UNCATEGORIZED;
  return trimmed;
}

export function compareCategories(a: string, b: string): number {
  if (a === UNCATEGORIZED) return 1;
  if (b === UNCATEGORIZED) return -1;
  return a.localeCompare(b, "zh-CN");
}

/** 公开展示时把“不分类”换成页面原本使用的未知分类文案。 */
export function categoryText(
  value: string | null | undefined,
  fallback = UNCATEGORIZED,
): string {
  const normalized = normalizeCategory(value);
  return normalized === UNCATEGORIZED ? fallback : normalized;
}

/** 生成用于下拉框的分类列表，始终包含“不分类”并排在最后。 */
export function categoryOptions(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) set.add(normalizeCategory(value));
  set.add(UNCATEGORIZED);
  return Array.from(set).sort(compareCategories);
}

export function groupByCategory<T>(
  items: T[],
  getValue: (item: T) => string | null | undefined,
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const category = normalizeCategory(getValue(item));
    const list = groups.get(category) ?? [];
    list.push(item);
    groups.set(category, list);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => compareCategories(a, b));
}