import { ColumnDefinition, DataType, DatasetRow, Filter, FilterOperator } from '../types';

/**
 * 全局筛选引擎
 *
 * 所有页面（工作台表格、图表预览、图表库、统计摘要、报告预览）都必须通过
 * {@link selectFilteredRows} 取数，保证筛选口径一致。
 *
 * 约定：
 * - 引擎只读，绝不改写 dataset.data 或任何入参；
 * - 只有 active 且字段仍存在于列定义中的筛选条件参与求值；
 * - 值为空的条件视为“尚未配置完成”，放行全部行，避免静默吞数据；
 * - 操作符按字段类型稳定生效（见 OPERATORS_BY_TYPE），
 *   求值时按列类型做一次性归一化，避免字符串/数字混比导致各页面口径不一致。
 */

/** 每种字段类型下稳定支持的操作符（筛选面板据此生成可选项）。 */
export const OPERATORS_BY_TYPE: Record<DataType, FilterOperator[]> = {
  [DataType.Number]: [
    FilterOperator.Equals,
    FilterOperator.Contains,
    FilterOperator.GreaterThan,
    FilterOperator.LessThan,
    FilterOperator.Between,
    FilterOperator.In,
  ],
  [DataType.Date]: [
    FilterOperator.Equals,
    FilterOperator.Contains,
    FilterOperator.GreaterThan,
    FilterOperator.LessThan,
    FilterOperator.Between,
    FilterOperator.In,
  ],
  [DataType.String]: [FilterOperator.Equals, FilterOperator.Contains, FilterOperator.In],
  [DataType.Boolean]: [FilterOperator.Equals],
};

export const isOperatorSupported = (type: DataType, operator: FilterOperator) =>
  OPERATORS_BY_TYPE[type]?.includes(operator) ?? false;

/** 切换字段或操作符时，按类型生成合法的空值；Between 需要上下界两项。 */
export const createEmptyValue = (
  type: DataType | undefined,
  operator: FilterOperator,
): Filter['value'] => {
  if (operator === FilterOperator.Between) return ['', ''];
  if (type === DataType.Boolean) return 'true';
  return '';
};

/** 空值（未配置完成的条件）统一放行。 */
const isEmptyValue = (value: Filter['value']): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0 || value.every((item) => String(item).trim() === '');
  return value.trim() === '';
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(numeric) ? numeric : null;
};

const toTimestamp = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Date.parse(String(value).trim());
  return Number.isFinite(numeric) ? numeric : null;
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return null;
};

/** Between 的值：统一成 [下界, 上界]，缺失的一端为 null（开区间）。 */
const toRange = (value: Filter['value']): [unknown, unknown] => {
  if (Array.isArray(value)) return [value[0] ?? '', value[1] ?? ''];
  const [lower = '', upper = ''] = String(value ?? '').split(':');
  return [lower, upper];
};

/** In 的值：数组或逗号/分号分隔文本，统一成去空白的 token 列表。 */
const toTokens = (value: Filter['value']): string[] => {
  const raw = Array.isArray(value) ? value.map(String) : String(value ?? '').split(/[,;，；]/);
  return raw.map((token) => token.trim()).filter((token) => token !== '');
};

const compareOrdered = (cell: unknown, target: unknown, type: DataType, greater: boolean): boolean => {
  if (type === DataType.Number) {
    const cellNumber = toNumber(cell);
    const targetNumber = toNumber(target);
    if (cellNumber === null || targetNumber === null) return false;
    return greater ? cellNumber > targetNumber : cellNumber < targetNumber;
  }
  if (type === DataType.Date) {
    const cellTime = toTimestamp(cell);
    const targetTime = toTimestamp(target);
    if (cellTime === null || targetTime === null) return false;
    return greater ? cellTime > targetTime : cellTime < targetTime;
  }
  // 有序操作符只对 Number/Date 暴露；其他类型兜底为字符串字典序，保证不抛错。
  return greater
    ? String(cell ?? '').localeCompare(String(target ?? '')) > 0
    : String(cell ?? '').localeCompare(String(target ?? '')) < 0;
};

/** 单条筛选条件对单行的求值；不修改任何入参。 */
export const evaluateFilter = (row: DatasetRow, filter: Filter, type: DataType): boolean => {
  if (!filter.active || isEmptyValue(filter.value)) return true;
  const cell = row[filter.fieldName];
  if (cell === null || cell === undefined) return false;

  switch (filter.operator) {
    case FilterOperator.Equals: {
      if (type === DataType.Number) return toNumber(cell) === toNumber(filter.value);
      if (type === DataType.Boolean) return toBoolean(cell) === toBoolean(filter.value);
      if (type === DataType.Date) return toTimestamp(cell) === toTimestamp(filter.value);
      return String(cell).trim() === String(filter.value).trim();
    }
    case FilterOperator.Contains: {
      // 数字/日期退化为字符串包含，便于“按年份”等检索，行为可预期。
      return String(cell).toLowerCase().includes(String(filter.value).trim().toLowerCase());
    }
    case FilterOperator.GreaterThan:
      return compareOrdered(cell, filter.value, type, true);
    case FilterOperator.LessThan:
      return compareOrdered(cell, filter.value, type, false);
    case FilterOperator.Between: {
      const [lowerRaw, upperRaw] = toRange(filter.value);
      if (type === DataType.Number) {
        const cellNumber = toNumber(cell);
        if (cellNumber === null) return false;
        const lower = toNumber(lowerRaw);
        const upper = toNumber(upperRaw);
        return (lower === null || cellNumber >= lower) && (upper === null || cellNumber <= upper);
      }
      if (type === DataType.Date) {
        const cellTime = toTimestamp(cell);
        if (cellTime === null) return false;
        const lower = toTimestamp(lowerRaw);
        const upper = toTimestamp(upperRaw);
        return (lower === null || cellTime >= lower) && (upper === null || cellTime <= upper);
      }
      return false;
    }
    case FilterOperator.In: {
      const tokens = toTokens(filter.value);
      if (tokens.length === 0) return true;
      if (type === DataType.Number) {
        const cellNumber = toNumber(cell);
        return cellNumber !== null && tokens.some((token) => toNumber(token) === cellNumber);
      }
      if (type === DataType.Date) {
        const cellTime = toTimestamp(cell);
        return cellTime !== null && tokens.some((token) => toTimestamp(token) === cellTime);
      }
      const haystack = String(cell).trim().toLowerCase();
      return tokens.some((token) => token.toLowerCase() === haystack);
    }
    default:
      return true;
  }
};

/** 找出某数据集当前生效（active、字段仍存在、操作符与字段类型匹配）的筛选条件。 */
export const selectActiveFilters = (
  datasetId: string,
  columns: ColumnDefinition[],
  filters: Filter[],
): Array<{ filter: Filter; column: ColumnDefinition }> => {
  const columnByName = new Map(columns.map((column) => [column.name, column]));
  return filters
    .filter((candidate) => candidate.datasetId === datasetId && candidate.active)
    .flatMap((filter) => {
      const column = columnByName.get(filter.fieldName);
      // 字段已删除、或列类型被手动修正后操作符不再适用时，不参与求值（放行而非静默吞数据），
      // 条件本身仍保留，由 FilterPanel 提示用户修正。
      if (!column || !isOperatorSupported(column.type, filter.operator)) return [];
      return [{ filter, column }];
    });
};

/**
 * 应用筛选，返回新数组（原始 rows 不被改写）。
 * 多个条件之间为 AND；停用某个条件后，该条件排除的行自然恢复——
 * 因为每次都从原始行重新求值，而不是做增量删除。
 */
export const applyFilters = (
  datasetId: string,
  rows: DatasetRow[],
  columns: ColumnDefinition[],
  filters: Filter[],
): DatasetRow[] => {
  const active = selectActiveFilters(datasetId, columns, filters);
  if (active.length === 0) return rows;
  return rows.filter((row) => active.every(({ filter, column }) => evaluateFilter(row, filter, column.type)));
};

/** 统计某数据集当前生效的条件数量（供各页面展示统一的筛选状态）。 */
export const countActiveFilters = (datasetId: string, filters: Filter[]): number =>
  filters.filter((filter) => filter.datasetId === datasetId && filter.active).length;
