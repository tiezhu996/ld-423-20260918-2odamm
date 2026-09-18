import { create } from 'zustand';
import { Filter, FilterOperator } from '../types';
import { sampleFilter } from '../api/mockData';
import { db } from '../utils/db';

interface FilterState {
  filters: Filter[];
  hydrated: boolean;
  loadFilters: () => Promise<void>;
  addFilter: (datasetId: string, fieldName: string) => Promise<void>;
  updateFilter: (filter: Filter) => Promise<void>;
  removeFilter: (filterId: string) => Promise<void>;
  toggleFilter: (filterId: string) => Promise<void>;
  clearFilters: (datasetId: string) => Promise<void>;
}

/**
 * 筛选器是全局状态：工作台配置后，表格、图表编辑器、图表库、统计摘要、
 * 报告预览读取同一批条件。所有变更实时写入 IndexedDB，刷新页面后依旧保留。
 */
export const useFilterStore = create<FilterState>((set, get) => ({
  filters: [],
  hydrated: false,
  loadFilters: async () => {
    const persisted = await db.filters.toArray();
    if (persisted.length === 0) {
      await db.filters.put(sampleFilter);
      set({ filters: [sampleFilter], hydrated: true });
      return;
    }
    set({ filters: persisted, hydrated: true });
  },
  addFilter: async (datasetId, fieldName) => {
    const filter: Filter = {
      id: crypto.randomUUID(),
      datasetId,
      fieldName,
      operator: FilterOperator.Equals,
      value: '',
      active: true,
    };
    await db.filters.put(filter);
    set({ filters: [...get().filters, filter] });
  },
  updateFilter: async (filter) => {
    await db.filters.put(filter);
    set({ filters: get().filters.map((candidate) => (candidate.id === filter.id ? filter : candidate)) });
  },
  removeFilter: async (filterId) => {
    await db.filters.delete(filterId);
    set({ filters: get().filters.filter((filter) => filter.id !== filterId) });
  },
  toggleFilter: async (filterId) => {
    const next = get().filters.map((filter) =>
      filter.id === filterId ? { ...filter, active: !filter.active } : filter,
    );
    const updated = next.find((filter) => filter.id === filterId);
    if (updated) await db.filters.put(updated);
    set({ filters: next });
  },
  clearFilters: async (datasetId) => {
    const removed = get().filters.filter((filter) => filter.datasetId === datasetId);
    await db.filters.bulkDelete(removed.map((filter) => filter.id));
    set({ filters: get().filters.filter((filter) => filter.datasetId !== datasetId) });
  },
}));
