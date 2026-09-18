import { ChartConfig, Dataset } from '../../types';
import { ChartPreview } from './ChartPreview';
import { useFilteredDataset } from '../../hooks/useFilteredDataset';

interface FilteredChartPreviewProps {
  dataset?: Dataset;
  config?: ChartConfig;
  compact?: boolean;
}

/**
 * 始终读取全局筛选结果的图表预览。
 *
 * 图表编辑器、图表库、报告预览统一使用本组件，确保报告不会把不同筛选
 * 范围的数据混在一起；数据源仍是原始 dataset.data，筛选不产生写入。
 */
export const FilteredChartPreview = ({ dataset, config, compact }: FilteredChartPreviewProps) => {
  const filtered = useFilteredDataset(dataset);
  return <ChartPreview dataset={dataset} config={config} compact={compact} rows={filtered?.rows} />;
};
