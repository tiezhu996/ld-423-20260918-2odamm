import { useMemo } from 'react';
import { Dataset } from '../types';
import { useFilterStore } from '../stores/filterStore';
import { applyFilters, countActiveFilters } from '../utils/filterEngine';

export interface FilteredDataset {
  /** 原始数据集（schema 始终来自原始数据，筛选不改写它）。 */
  dataset: Dataset;
  /** 当前全局筛选生效后的行；无激活条件时与 dataset.data 为同一引用。 */
  rows: Dataset['data'];
  totalRows: number;
  filteredRows: number;
  activeFilterCount: number;
  isFiltered: boolean;
}

/**
 * 全局联动筛选的唯一取数入口。
 *
 * 工作台、图表编辑器、图表库、统计摘要和报告预览都通过本 hook（或
 * FilteredChartPreview 包装组件）取数，因此看到的永远是同一批结果；
 * 数据始终从 dataset.data 重新求值，原始数据不会被改写，停用某条件时
 * 只恢复该条件影响的行。
 */
export const useFilteredDataset = (dataset: Dataset | undefined): FilteredDataset | undefined => {
  const filters = useFilterStore((state) => state.filters);

  return useMemo(() => {
    if (!dataset) return undefined;
    const rows = applyFilters(dataset.id, dataset.data, dataset.columns, filters);
    const activeFilterCount = countActiveFilters(dataset.id, filters);
    return {
      dataset,
      rows,
      totalRows: dataset.data.length,
      filteredRows: rows.length,
      activeFilterCount,
      isFiltered: activeFilterCount > 0,
    };
  }, [dataset, filters]);
};
