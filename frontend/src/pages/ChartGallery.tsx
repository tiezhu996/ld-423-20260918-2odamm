import { useMemo, useState } from 'react';
import { FilteredChartPreview } from '../components/common/FilteredChartPreview';
import { EmptyState } from '../components/common/EmptyState';
import { useChartStore } from '../stores/chartStore';
import { useDatasetStore } from '../stores/datasetStore';
import { useFilterStore } from '../stores/filterStore';
import { countActiveFilters } from '../utils/filterEngine';

export const ChartGallery = () => {
  const [query, setQuery] = useState('');
  const charts = useChartStore((state) => state.charts);
  const datasets = useDatasetStore((state) => state.datasets);
  const filters = useFilterStore((state) => state.filters);
  const visible = useMemo(() => charts.filter((chart) => chart.name.toLowerCase().includes(query.toLowerCase()) || chart.tags.some((tag) => tag.includes(query))), [charts, query]);
  const scopedCount = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, countActiveFilters(dataset.id, filters)])),
    [datasets, filters],
  );
  const globallyFiltered = filters.some((filter) => filter.active);

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <span className="eyebrow">Gallery</span>
          <h1>图表库</h1>
        </div>
        <input className="search-input" placeholder="搜索名称或标签" value={query} onChange={(event) => setQuery(event.target.value)} />
      </section>
      {globallyFiltered ? (
        <div className="filter-status" aria-live="polite">全局筛选生效中：缩略图均按工作台启用的筛选条件绘制。</div>
      ) : null}
      {visible.length === 0 ? (
        <EmptyState title="没有匹配图表" description="调整关键词，或回到编辑器保存新的图表。" />
      ) : (
        <section className="gallery-grid">
          {visible.map((chart) => {
            const dataset = datasets.find((candidate) => candidate.id === chart.datasetId);
            return (
              <article className="gallery-item" key={chart.id}>
                <FilteredChartPreview config={chart} dataset={dataset} compact />
                <strong>{chart.name}</strong>
                <span>
                  {chart.type} · {chart.colorScheme}
                  {scopedCount.get(chart.datasetId) ? ` · ${scopedCount.get(chart.datasetId)} 条筛选` : ''}
                </span>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};
