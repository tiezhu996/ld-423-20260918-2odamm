import { useMemo } from 'react';
import { ColumnDefinition, DataType, Filter, FilterOperator } from '../../types';
import { useFilterStore } from '../../stores/filterStore';
import { useDatasetStore } from '../../stores/datasetStore';
import { parseFilterValues } from '../../utils/filtering';

interface FilterPanelProps {
  datasetId: string;
}

const needsRangeValue = (operator: FilterOperator) => operator === FilterOperator.Between;
const needsListValue = (operator: FilterOperator) => operator === FilterOperator.In;

/** 切换字段或操作符时给出该类型下的干净默认值，避免残留旧值造成口径漂移。 */
const defaultValueFor = (operator: FilterOperator, column?: ColumnDefinition): Filter['value'] => {
  if (needsRangeValue(operator)) return ['', ''];
  if (column?.type === DataType.Boolean) return 'true';
  return '';
};

const inputTypeFor = (column?: ColumnDefinition) => {
  if (column?.type === DataType.Number) return 'number';
  if (column?.type === DataType.Date) return 'date';
  return 'text';
};

const FilterValueEditor = ({ filter, column, onChange }: { filter: Filter; column?: ColumnDefinition; onChange: (value: Filter['value']) => void }) => {
  if (needsRangeValue(filter.operator)) {
    const [min = '', max = ''] = parseFilterValues(filter.value);
    const inputType = inputTypeFor(column);
    return (
      <div className="filter-values">
        <input
          type={inputType}
          value={String(min)}
          placeholder="最小值"
          aria-label="区间最小值"
          onChange={(event) => onChange([event.target.value, String(max)])}
        />
        <input
          type={inputType}
          value={String(max)}
          placeholder="最大值"
          aria-label="区间最大值"
          onChange={(event) => onChange([String(min), event.target.value])}
        />
      </div>
    );
  }
  if (needsListValue(filter.operator)) {
    return (
      <input
        value={parseFilterValues(filter.value).join(', ')}
        placeholder="逗号分隔多个值"
        onChange={(event) => onChange(event.target.value.split(',').map((part) => part.trim()).filter((part) => part !== ''))}
      />
    );
  }
  if (column?.type === DataType.Boolean) {
    return (
      <select value={String(filter.value)} onChange={(event) => onChange(event.target.value)}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  return <input type={inputTypeFor(column)} value={String(filter.value)} onChange={(event) => onChange(event.target.value)} />;
};

export const FilterPanel = ({ datasetId }: FilterPanelProps) => {
  const dataset = useDatasetStore((state) => state.datasets.find((candidate) => candidate.id === datasetId));
  const allFilters = useFilterStore((state) => state.filters);
  const filters = useMemo(() => allFilters.filter((filter) => filter.datasetId === datasetId), [allFilters, datasetId]);
  const activeCount = useMemo(() => filters.filter((filter) => filter.active).length, [filters]);
  const addFilter = useFilterStore((state) => state.addFilter);
  const updateFilter = useFilterStore((state) => state.updateFilter);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const removeFilter = useFilterStore((state) => state.removeFilter);

  if (!dataset) return null;

  const columnOf = (fieldName: string) => dataset.columns.find((column) => column.name === fieldName);

  return (
    <aside className="filter-panel">
      <div className="panel-heading">
        <h3>筛选器</h3>
        <button type="button" onClick={() => addFilter(datasetId, dataset.columns[0]?.name ?? '')}>
          添加
        </button>
      </div>
      {filters.map((filter) => {
        const column = columnOf(filter.fieldName);
        return (
          <div className="filter-row" key={filter.id}>
            <input type="checkbox" checked={filter.active} onChange={() => toggleFilter(filter.id)} aria-label="启用筛选" />
            <select
              value={filter.fieldName}
              onChange={(event) => {
                const nextColumn = columnOf(event.target.value);
                updateFilter({ ...filter, fieldName: event.target.value, value: defaultValueFor(filter.operator, nextColumn) });
              }}
            >
              {dataset.columns.map((candidate) => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.name}
                </option>
              ))}
            </select>
            <select
              value={filter.operator}
              onChange={(event) => {
                const operator = event.target.value as FilterOperator;
                updateFilter({ ...filter, operator, value: defaultValueFor(operator, column) });
              }}
            >
              {Object.values(FilterOperator).map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
            <FilterValueEditor filter={filter} column={column} onChange={(value) => updateFilter({ ...filter, value })} />
            <button type="button" onClick={() => removeFilter(filter.id)}>
              删除
            </button>
          </div>
        );
      })}
      <p className="filter-hint">
        {activeCount > 0 ? `${activeCount} 个条件生效，表格、图表、统计与报告同步只看筛选结果` : '暂无生效条件，各页面显示完整数据'}
      </p>
    </aside>
  );
};
