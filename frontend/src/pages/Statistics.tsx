import { useEffect, useMemo, useState } from 'react';
import { DataGrid } from '../components/common/DataGrid';
import { EmptyState } from '../components/common/EmptyState';
import { FieldSelector } from '../components/common/FieldSelector';
import { StatCard } from '../components/common/StatCard';
import { useFilteredDataset } from '../hooks/useFilteredDataset';
import { useDatasetStore } from '../stores/datasetStore';
import { calculateStatSummary, correlation } from '../utils/statistics';
import { DataType } from '../types';

export const Statistics = () => {
  const datasets = useDatasetStore((state) => state.datasets);
  const selectedDatasetId = useDatasetStore((state) => state.selectedDatasetId);
  const selectDataset = useDatasetStore((state) => state.selectDataset);
  const dataset = datasets.find((candidate) => candidate.id === selectedDatasetId) ?? datasets[0];
  const filtered = useFilteredDataset(dataset);
  const numericColumns = (filtered?.dataset.columns ?? []).filter((column) => column.type === DataType.Number);
  const [field, setField] = useState(numericColumns[0]?.name ?? '');

  // 切换数据集或字段结构变化后，分析字段回退到第一个数值列，避免读到旧数据集的列名。
  useEffect(() => {
    if (!numericColumns.some((column) => column.name === field)) {
      setField(numericColumns[0]?.name ?? '');
    }
  }, [numericColumns, field]);

  const summary = useMemo(
    () => (filtered && field ? calculateStatSummary(filtered.dataset.id, filtered.rows, field) : undefined),
    [filtered, field],
  );
  const rows = filtered?.rows ?? [];
  const matrixRows = numericColumns.map((column) => ({
    field: column.name,
    ...Object.fromEntries(numericColumns.map((other) => [other.name, Number(correlation(rows, column.name, other.name).toFixed(3))])),
  }));

  if (!dataset || !filtered) return <EmptyState title="还没有数据集" description="先到工作台导入数据。" />;

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <span className="eyebrow">Statistics</span>
          <h1>统计分析</h1>
        </div>
        <div className="statistics-controls">
          <label className="field-control">
            <span>数据集</span>
            <select value={dataset.id} onChange={(event) => selectDataset(event.target.value)}>
              {datasets.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </select>
          </label>
          <FieldSelector label="分析字段" columns={dataset.columns} value={field} numericOnly onChange={setField} />
        </div>
      </section>
      <div className="filter-status" aria-live="polite">
        {filtered.isFiltered
          ? `全局筛选生效中：${filtered.activeFilterCount} 条条件，统计基于 ${filtered.filteredRows}/${filtered.totalRows} 行`
          : `未启用筛选，统计基于全部 ${filtered.totalRows} 行`}
      </div>
      {rows.length === 0 || !summary ? (
        <EmptyState title="当前筛选条件下没有可统计的行" description="停用或放宽工作台的筛选条件后，相关行会自动恢复。" />
      ) : (
        <>
          <section className="stats-grid">
            <StatCard label="均值" value={summary.mean} />
            <StatCard label="中位数" value={summary.median} />
            <StatCard label="标准差" value={summary.standardDeviation} />
            <StatCard label="最小值" value={summary.min} />
            <StatCard label="最大值" value={summary.max} />
            <StatCard label="空值数" value={summary.nullCount} />
          </section>
          <section className="analysis-block">
            <h2>相关性矩阵</h2>
            <DataGrid rows={matrixRows} columns={[{ name: 'field', type: DataType.String }, ...numericColumns]} maxHeight={320} />
          </section>
        </>
      )}
    </main>
  );
};
