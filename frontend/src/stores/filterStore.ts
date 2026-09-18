import { create } from 'zustand';
import { Filter, FilterOperator } from '../types';
import { sampleFilter } from '../api/mockData';
import { db } from '../utils/db';

interface FilterState {
  filters: Filter[];
  loadFilters: () => Promise<void>;
  addFilter: (datasetId: string, fieldName: string) => void;
  updateFilter: (filter: Filter) => void;
  removeFilter: (filterId: string) => void;
  toggleFilter: (filterId: string) => void;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: [sampleFilter],
  loadFilters: async () => {
    const persisted = await db.filters.toArray();
    if (persisted.length === 0) {
      await db.filters.put(sampleFilter);
      set({ filters: [sampleFilter] });
      return;
    }
    set({ filters: persisted });
  },
  addFilter: (datasetId, fieldName) => {
    const filter: Filter = { id: crypto.randomUUID(), datasetId, fieldName, operator: FilterOperator.Equals, value: '', active: true };
    set({ filters: [...get().filters, filter] });
    void db.filters.put(filter);
  },
  updateFilter: (filter) => {
    set({ filters: get().filters.map((candidate) => (candidate.id === filter.id ? filter : candidate)) });
    void db.filters.put(filter);
  },
  removeFilter: (filterId) => {
    set({ filters: get().filters.filter((filter) => filter.id !== filterId) });
    void db.filters.delete(filterId);
  },
  toggleFilter: (filterId) => {
    const filters = get().filters.map((filter) => (filter.id === filterId ? { ...filter, active: !filter.active } : filter));
    set({ filters });
    const toggled = filters.find((filter) => filter.id === filterId);
    if (toggled) void db.filters.put(toggled);
  },
}));
