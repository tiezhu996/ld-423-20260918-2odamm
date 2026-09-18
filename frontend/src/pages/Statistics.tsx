import { useMemo, useState } from 'react';
import { DataGrid } from '../components/common/DataGrid';
import { EmptyState } from '../components/common/EmptyState';
import { FieldSelector } from '../components/common/FieldSelector';
import { StatCard } from '../components/common/StatCard';
import { useFilteredRows } from '../hooks/useFilteredRows';
import { useDatasetStore } from '../stores/datasetStore';
import { calculateStatSummary, correlation } from '../utils/statistics';
import { DataType } from '../types';

export const Statistics = () => {
  const datasets = useDatasetStore((state) => state.datasets);
  const selectedDatasetId = useDatasetStore((state) => state.selectedDatasetId);
  const dataset = datasets.find((candidate) => candidate.id === selectedDatasetId) ?? datasets[0];
  const { rows, totalRows, isFiltered } = useFilteredRows(dataset);
  const numericColumns = useMemo(() => (dataset ? dataset.columns.filter((column) => column.type === DataType.Number) : []), [dataset]);
  const [field, setField] = useState('');
  const activeField = numericColumns.some((column) => column.name === field) ? field : numericColumns[0]?.name ?? '';
  const summary = useMemo(
    () => (dataset && activeField ? calculateStatSummary(dataset.id, rows, activeField) : undefined),
    [dataset, rows, activeField],
  );
  const matrixRows = numericColumns.map((column) => ({
    field: column.name,
    ...Object.fromEntries(numericColumns.map((other) => [other.name, Number(correlation(rows, column.name, other.name).toFixed(3))])),
  }));

  if (!dataset) {
    return (
      <main className="page">
        <EmptyState title="还没有数据集" description="先到工作台导入 CSV 或 JSON，再回来做统计分析。" />
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <span className="eyebrow">Statistics</span>
          <h1>统计分析</h1>
        </div>
        <FieldSelector label="分析字段" columns={dataset.columns} value={activeField} numericOnly onChange={setField} />
      </section>
      <p className="filter-status">
        {isFiltered ? `筛选生效中：统计基于 ${rows.length} / ${totalRows} 行（${dataset.name}）` : `基于 ${dataset.name} 全部 ${totalRows} 行`}
      </p>
      {summary ? (
        <section className="stats-grid">
          <StatCard label="均值" value={summary.mean} />
          <StatCard label="中位数" value={summary.median} />
          <StatCard label="标准差" value={summary.standardDeviation} />
          <StatCard label="最小值" value={summary.min} />
          <StatCard label="最大值" value={summary.max} />
          <StatCard label="空值数" value={summary.nullCount} />
        </section>
      ) : (
        <EmptyState title="没有可分析的数值字段" description="该数据集缺少 Number 类型列，可在工作台修正列类型。" />
      )}
      <section className="analysis-block">
        <h2>相关性矩阵</h2>
        <DataGrid rows={matrixRows} columns={[{ name: 'field', type: DataType.String }, ...numericColumns]} maxHeight={320} />
      </section>
    </main>
  );
};
