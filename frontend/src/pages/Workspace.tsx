import { useEffect } from 'react';
import { DataType } from '../types';
import { DataGrid } from '../components/common/DataGrid';
import { FilterPanel } from '../components/common/FilterPanel';
import { EmptyState } from '../components/common/EmptyState';
import { useDataImport } from '../hooks/useDataImport';
import { useFilteredDataset } from '../hooks/useFilteredDataset';
import { useDatasetStore } from '../stores/datasetStore';

export const Workspace = () => {
  const { importFile, error } = useDataImport();
  const datasets = useDatasetStore((state) => state.datasets);
  const selectedDatasetId = useDatasetStore((state) => state.selectedDatasetId);
  const loadDatasets = useDatasetStore((state) => state.loadDatasets);
  const addDataset = useDatasetStore((state) => state.addDataset);
  const selectDataset = useDatasetStore((state) => state.selectDataset);
  const updateColumnType = useDatasetStore((state) => state.updateColumnType);
  const dataset = datasets.find((candidate) => candidate.id === selectedDatasetId);
  const filtered = useFilteredDataset(dataset);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>数据工作台</h1>
        </div>
        <label className="file-button">
          导入 CSV/JSON
          <input
            type="file"
            accept=".csv,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const imported = await importFile(file);
              if (imported) await addDataset(imported);
            }}
          />
        </label>
      </section>
      {error ? <div className="error-box">{error}</div> : null}
      {dataset && filtered ? (
        <div className="workspace-grid">
          <aside className="dataset-list">
            {datasets.map((candidate) => (
              <button key={candidate.id} className={candidate.id === dataset.id ? 'is-active' : ''} onClick={() => selectDataset(candidate.id)}>
                <strong>{candidate.name}</strong>
                <span>{candidate.rowCount} 行 · {candidate.columnCount} 列</span>
              </button>
            ))}
          </aside>
          <section className="data-panel">
            <div className="column-editor">
              {dataset.columns.map((column) => (
                <label key={column.name}>
                  <span>{column.name}</span>
                  <select value={column.type} onChange={(event) => updateColumnType(dataset.id, column.name, event.target.value as DataType)}>
                    {Object.values(DataType).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="filter-status" aria-live="polite">
              {filtered.isFiltered ? (
                <span>
                  全局筛选生效中：{filtered.activeFilterCount} 条条件，显示 {filtered.filteredRows}/{filtered.totalRows} 行
                </span>
              ) : (
                <span>未启用筛选，显示全部 {filtered.totalRows} 行</span>
              )}
            </div>
            {filtered.rows.length === 0 ? (
              <EmptyState title="没有命中的行" description="停用或调整右侧筛选条件，仅会恢复对应条件排除的行。" />
            ) : (
              <DataGrid rows={filtered.rows} columns={dataset.columns} />
            )}
          </section>
          <FilterPanel datasetId={dataset.id} />
        </div>
      ) : (
        <EmptyState title="还没有数据集" description="导入 CSV 或 JSON 后开始筛选和分析。" />
      )}
    </main>
  );
};
