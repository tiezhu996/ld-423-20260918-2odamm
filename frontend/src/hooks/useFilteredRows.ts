import { useMemo } from 'react';
import { Dataset } from '../types';
import { useFilterStore } from '../stores/filterStore';
import { applyFilters } from '../utils/filtering';

/**
 * 全局筛选联动入口：任何页面需要"当前数据集生效中的结果集"都从这里取，
 * 保证工作台表格、图表编辑器、图表库、统计摘要、报告预览看到同一批行。
 * 返回派生数据，原始 dataset.data 不被改写。
 */
export const useFilteredRows = (dataset?: Dataset) => {
  const filters = useFilterStore((state) => state.filters);

  return useMemo(() => {
    if (!dataset) {
      return { rows: [] as Dataset['data'], totalRows: 0, activeFilterCount: 0, isFiltered: false };
    }
    const datasetFilters = filters.filter((filter) => filter.datasetId === dataset.id);
    const activeFilterCount = datasetFilters.filter((filter) => filter.active).length;
    const rows = applyFilters(dataset.data, datasetFilters, dataset.columns);
    return { rows, totalRows: dataset.data.length, activeFilterCount, isFiltered: activeFilterCount > 0 };
  }, [dataset, filters]);
};

/** 供 <ChartPreview> 等只认 Dataset 的组件使用：返回 data 为筛选结果的派生数据集。 */
export const useFilteredDataset = (dataset?: Dataset): Dataset | undefined => {
  const { rows } = useFilteredRows(dataset);
  return useMemo(() => (dataset ? { ...dataset, data: rows } : undefined), [dataset, rows]);
};
