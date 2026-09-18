import { ColumnDefinition, DataType, DatasetRow, Filter, FilterOperator } from '../types';

/**
 * 全局筛选引擎（纯函数）。
 * 所有页面共用同一份判定逻辑，保证表格、图表、统计、报告口径一致。
 * 只读原始行并返回新数组，绝不改写数据集。
 */

const isEmptyValue = (value: unknown) => value === null || value === undefined || value === '';

/** Between / In 的值统一解析为数组，兼容数组与逗号分隔字符串两种存储形式。 */
export const parseFilterValues = (value: Filter['value']): Array<string | number> => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((part) => part.trim()).filter((part) => part !== '');
  return [value as string | number];
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toTimestamp = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return null;
};

/** 日期 Equals 按日历日比较，避免时分秒差异导致永远匹配不上。 */
const sameCalendarDay = (a: number, b: number) => {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
};

const matchNumber = (cell: unknown, filter: Filter): boolean => {
  const numericCell = toNumber(cell);
  if (numericCell === null) return false;
  switch (filter.operator) {
    case FilterOperator.Equals: {
      const target = toNumber(filter.value);
      return target !== null && numericCell === target;
    }
    case FilterOperator.Contains:
      return String(cell).toLowerCase().includes(String(filter.value).trim().toLowerCase());
    case FilterOperator.GreaterThan: {
      const target = toNumber(filter.value);
      return target !== null && numericCell > target;
    }
    case FilterOperator.LessThan: {
      const target = toNumber(filter.value);
      return target !== null && numericCell < target;
    }
    case FilterOperator.Between: {
      const [min, max] = parseFilterValues(filter.value).map(toNumber);
      if (min === null || max === null) return true;
      const [low, high] = min <= max ? [min, max] : [max, min];
      return numericCell >= low && numericCell <= high;
    }
    case FilterOperator.In: {
      const candidates = parseFilterValues(filter.value).map(toNumber).filter((candidate): candidate is number => candidate !== null);
      return candidates.length === 0 || candidates.includes(numericCell);
    }
    default:
      return true;
  }
};

const matchDate = (cell: unknown, filter: Filter): boolean => {
  const cellTime = toTimestamp(cell);
  if (cellTime === null) return false;
  switch (filter.operator) {
    case FilterOperator.Equals: {
      const target = toTimestamp(filter.value);
      return target !== null && sameCalendarDay(cellTime, target);
    }
    case FilterOperator.Contains:
      return String(cell).toLowerCase().includes(String(filter.value).trim().toLowerCase());
    case FilterOperator.GreaterThan: {
      const target = toTimestamp(filter.value);
      return target !== null && cellTime > target;
    }
    case FilterOperator.LessThan: {
      const target = toTimestamp(filter.value);
      return target !== null && cellTime < target;
    }
    case FilterOperator.Between: {
      const [min, max] = parseFilterValues(filter.value).map(toTimestamp);
      if (min === null || max === null) return true;
      const [low, high] = min <= max ? [min, max] : [max, min];
      return cellTime >= low && cellTime <= high;
    }
    case FilterOperator.In: {
      const candidates = parseFilterValues(filter.value).map(toTimestamp).filter((candidate): candidate is number => candidate !== null);
      return candidates.length === 0 || candidates.some((candidate) => sameCalendarDay(cellTime, candidate));
    }
    default:
      return true;
  }
};

const matchBoolean = (cell: unknown, filter: Filter): boolean => {
  const boolCell = toBoolean(cell);
  if (boolCell === null) return false;
  switch (filter.operator) {
    case FilterOperator.Equals: {
      const target = toBoolean(filter.value);
      return target !== null && boolCell === target;
    }
    case FilterOperator.In: {
      const candidates = parseFilterValues(filter.value).map(toBoolean);
      return candidates.some((candidate) => candidate !== null && candidate === boolCell);
    }
    case FilterOperator.Contains:
      return String(cell).toLowerCase().includes(String(filter.value).trim().toLowerCase());
    default:
      return true;
  }
};

const matchString = (cell: unknown, filter: Filter): boolean => {
  if (isEmptyValue(cell)) return false;
  const text = String(cell);
  const target = String(filter.value ?? '').trim();
  switch (filter.operator) {
    case FilterOperator.Equals:
      return text === target;
    case FilterOperator.Contains:
      return text.toLowerCase().includes(target.toLowerCase());
    case FilterOperator.GreaterThan:
      return text.localeCompare(target) > 0;
    case FilterOperator.LessThan:
      return text.localeCompare(target) < 0;
    case FilterOperator.Between: {
      const [min, max] = parseFilterValues(filter.value).map(String);
      if (min === undefined || max === undefined) return false;
      const [low, high] = min <= max ? [min, max] : [max, min];
      return text.localeCompare(low) >= 0 && text.localeCompare(high) <= 0;
    }
    case FilterOperator.In:
      return parseFilterValues(filter.value).some((candidate) => text === String(candidate));
    default:
      return true;
  }
};

export const matchesFilter = (row: DatasetRow, filter: Filter, columnType: DataType): boolean => {
  const cell = row[filter.fieldName];
  // 条件值尚未填写完整时视为暂不约束，避免半配置状态清空全部结果
  if (isEmptyValue(filter.value)) return true;
  if ((filter.operator === FilterOperator.Between || filter.operator === FilterOperator.In) && parseFilterValues(filter.value).length === 0) return true;
  switch (columnType) {
    case DataType.Number:
      return matchNumber(cell, filter);
    case DataType.Date:
      return matchDate(cell, filter);
    case DataType.Boolean:
      return matchBoolean(cell, filter);
    default:
      return matchString(cell, filter);
  }
};

/**
 * AND 语义：一行需通过该数据集所有激活条件。
 * 停用某条件时重新从原始数据计算，只有该条件排除的行会恢复，其余条件继续生效。
 */
export const applyFilters = (rows: DatasetRow[], filters: Filter[], columns: ColumnDefinition[]): DatasetRow[] => {
  const activeFilters = filters.filter((filter) => filter.active);
  if (activeFilters.length === 0) return [...rows];
  const columnTypes = new Map(columns.map((column) => [column.name, column.type]));
  return rows.filter((row) => activeFilters.every((filter) => matchesFilter(row, filter, columnTypes.get(filter.fieldName) ?? DataType.String)));
};
