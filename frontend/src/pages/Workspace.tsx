import { DataType } from '../types';
import { DataGrid } from '../components/common/DataGrid';
import { FilterPanel } from '../components/common/FilterPanel';
import { EmptyState } from '../components/common/EmptyState';
import { useDataImport } from '../hooks/useDataImport';
import { useFilteredRows } from '../hooks/useFilteredRows';
import { useDatasetStore } from '../stores/datasetStore';

export const Workspace = () => {
  const { importFile, error } = useDataImport();
  const datasets = useDatasetStore((state) => state.datasets);
  const selectedDatasetId = useDatasetStore((state) => state.selectedDatasetId);
  const addDataset = useDatasetStore((state) => state.addDataset);
  const selectDataset = useDatasetStore((state) => state.selectDataset);
  const updateColumnType = useDatasetStore((state) => state.updateColumnType);
  const dataset = datasets.find((candidate) => candidate.id === selectedDatasetId);
  const { rows, totalRows, activeFilterCount, isFiltered } = useFilteredRows(dataset);

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
      {dataset ? (
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
            <p className="filter-status">
              {isFiltered ? `筛选生效中：显示 ${rows.length} / ${totalRows} 行（${activeFilterCount} 个条件），全站页面同步该结果` : `未启用筛选，显示全部 ${totalRows} 行`}
            </p>
            <DataGrid rows={rows} columns={dataset.columns} />
          </section>
          <FilterPanel datasetId={dataset.id} />
        </div>
      ) : (
        <EmptyState title="还没有数据集" description="导入 CSV 或 JSON 后开始筛选和分析。" />
      )}
    </main>
  );
};
