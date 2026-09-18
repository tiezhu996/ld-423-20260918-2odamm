import { useMemo } from 'react';
import { DataType, Filter, FilterOperator } from '../../types';
import { useFilterStore } from '../../stores/filterStore';
import { useDatasetStore } from '../../stores/datasetStore';
import { applyFilters, countActiveFilters, createEmptyValue, OPERATORS_BY_TYPE } from '../../utils/filterEngine';

interface FilterPanelProps {
  datasetId: string;
}

const operatorLabels: Record<FilterOperator, string> = {
  [FilterOperator.Equals]: '等于',
  [FilterOperator.Contains]: '包含',
  [FilterOperator.GreaterThan]: '大于',
  [FilterOperator.LessThan]: '小于',
  [FilterOperator.Between]: '区间',
  [FilterOperator.In]: '属于(多值)',
};

const inputTypeFor = (type: DataType): string => {
  if (type === DataType.Number) return 'number';
  if (type === DataType.Date) return 'date';
  return 'text';
};

/** 单个筛选值的编辑器，形态随字段类型 + 操作符稳定变化。 */
const FilterValueEditor = ({ filter, column, onChange }: {
  filter: Filter;
  column?: { name: string; type: DataType };
  onChange: (value: Filter['value']) => void;
}) => {
  const type = column?.type ?? DataType.String;

  if (filter.operator === FilterOperator.Between) {
    const range = Array.isArray(filter.value) ? filter.value : ['', ''];
    const [lower, upper] = range;
    const inputType = inputTypeFor(type);
    return (
      <div className="filter-between">
        <input
          aria-label="区间下限"
          type={inputType}
          value={String(lower ?? '')}
          onChange={(event) => onChange([event.target.value, upper ?? ''])}
        />
        <span aria-hidden>~</span>
        <input
          aria-label="区间上限"
          type={inputType}
          value={String(upper ?? '')}
          onChange={(event) => onChange([lower ?? '', event.target.value])}
        />
      </div>
    );
  }

  if (type === DataType.Boolean && filter.operator === FilterOperator.Equals) {
    return (
      <select aria-label="筛选值" value={String(filter.value)} onChange={(event) => onChange(event.target.value)}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (filter.operator === FilterOperator.In) {
    return (
      <input
        aria-label="多值列表，逗号分隔"
        type="text"
        list={undefined}
        placeholder="多个值用逗号分隔"
        value={Array.isArray(filter.value) ? filter.value.join(',') : String(filter.value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      aria-label="筛选值"
      type={inputTypeFor(type)}
      value={Array.isArray(filter.value) ? filter.value.join(',') : String(filter.value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export const FilterPanel = ({ datasetId }: FilterPanelProps) => {
  const dataset = useDatasetStore((state) => state.datasets.find((candidate) => candidate.id === datasetId));
  const allFilters = useFilterStore((state) => state.filters);
  const addFilter = useFilterStore((state) => state.addFilter);
  const updateFilter = useFilterStore((state) => state.updateFilter);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const removeFilter = useFilterStore((state) => state.removeFilter);
  const clearFilters = useFilterStore((state) => state.clearFilters);

  const filters = useMemo(
    () => allFilters.filter((filter) => filter.datasetId === datasetId),
    [allFilters, datasetId],
  );

  const filteredRows = useMemo(
    () => (dataset ? applyFilters(dataset.id, dataset.data, dataset.columns, allFilters) : []),
    [dataset, allFilters],
  );
  const activeCount = useMemo(() => countActiveFilters(datasetId, allFilters), [allFilters, datasetId]);

  if (!dataset) return null;

  const columnByName = new Map(dataset.columns.map((column) => [column.name, column]));

  const changeField = (filter: Filter, fieldName: string) => {
    const nextType = columnByName.get(fieldName)?.type ?? DataType.String;
    const supported = OPERATORS_BY_TYPE[nextType];
    // 切字段后若原操作符在新类型下不合法，回退到该类型的第一个操作符。
    const operator = supported.includes(filter.operator) ? filter.operator : supported[0];
    void updateFilter({ ...filter, fieldName, operator, value: createEmptyValue(nextType, operator) });
  };

  const changeOperator = (filter: Filter, operator: FilterOperator) => {
    const type = columnByName.get(filter.fieldName)?.type;
    void updateFilter({ ...filter, operator, value: createEmptyValue(type, operator) });
  };

  return (
    <aside className="filter-panel">
      <div className="panel-heading">
        <h3>筛选器</h3>
        <button type="button" onClick={() => addFilter(datasetId, dataset.columns[0]?.name ?? '')}>
          添加
        </button>
      </div>
      {filters.length === 0 ? <p className="filter-empty">暂无条件，添加后将对所有页面生效。</p> : null}
      {filters.map((filter) => {
        const column = columnByName.get(filter.fieldName);
        const type = column?.type ?? DataType.String;
        const mismatched = column ? !OPERATORS_BY_TYPE[type].includes(filter.operator) : false;
        return (
          <div className={filter.active ? 'filter-row' : 'filter-row is-off'} key={filter.id}>
            <input
              type="checkbox"
              checked={filter.active}
              onChange={() => toggleFilter(filter.id)}
              aria-label="启用筛选"
            />
            <select value={filter.fieldName} onChange={(event) => changeField(filter, event.target.value)}>
              {dataset.columns.map((candidate) => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.name}
                </option>
              ))}
            </select>
            <select
              aria-label="筛选操作符"
              className={mismatched ? 'is-invalid' : undefined}
              value={filter.operator}
              onChange={(event) => changeOperator(filter, event.target.value as FilterOperator)}
            >
              {operatorLabels[filter.operator] ? (
                <option value={filter.operator}>{operatorLabels[filter.operator]}（不适用）</option>
              ) : null}
              {OPERATORS_BY_TYPE[type].map((operator) => (
                <option key={operator} value={operator}>
                  {operatorLabels[operator]}
                </option>
              ))}
            </select>
            {mismatched ? (
              <button
                type="button"
                className="filter-fix"
                title="字段类型已改变，该操作符不再适用，点击恢复为默认操作符"
                onClick={() => changeOperator(filter, OPERATORS_BY_TYPE[type][0])}
              >
                操作符与字段类型不匹配，点此修复
              </button>
            ) : (
              <FilterValueEditor
                filter={filter}
                column={column}
                onChange={(value) => void updateFilter({ ...filter, value })}
              />
            )}
            <button type="button" className="filter-remove" onClick={() => removeFilter(filter.id)}>
              删除
            </button>
          </div>
        );
      })}
      <footer className="filter-summary">
        <span>
          生效条件 {activeCount} 条 · 命中 {filteredRows.length}/{dataset.data.length} 行
        </span>
        {filters.length > 0 ? (
          <button type="button" className="filter-clear" onClick={() => clearFilters(datasetId)}>
            清空
          </button>
        ) : null}
      </footer>
      <p className="filter-hint">筛选为全局联动，刷新页面后保留；停用条件仅恢复该条件排除的行。</p>
    </aside>
  );
};
