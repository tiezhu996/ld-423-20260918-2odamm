import { useEffect } from 'react';
import { Navigate, NavLink, Outlet, createBrowserRouter } from 'react-router-dom';
import { ChartEditor } from '../pages/ChartEditor';
import { ChartGallery } from '../pages/ChartGallery';
import { ReportBuilder } from '../pages/ReportBuilder';
import { Statistics } from '../pages/Statistics';
import { Workspace } from '../pages/Workspace';
import { useChartStore } from '../stores/chartStore';
import { useDatasetStore } from '../stores/datasetStore';
import { useFilterStore } from '../stores/filterStore';
import { useReportStore } from '../stores/reportStore';
import { useThemeStore } from '../stores/themeStore';

const AppShell = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const filters = useFilterStore((state) => state.filters);
  const activeFilterCount = filters.filter((filter) => filter.active).length;

  const loadFilters = useFilterStore((state) => state.loadFilters);
  const loadDatasets = useDatasetStore((state) => state.loadDatasets);
  const loadCharts = useChartStore((state) => state.loadCharts);
  const loadReports = useReportStore((state) => state.loadReports);

  // 全局 hydrate：任何页面刷新后筛选条件都从 IndexedDB 恢复，且对所有页面生效。
  useEffect(() => {
    void loadFilters();
    void loadDatasets();
    void loadCharts();
    void loadReports();
  }, [loadFilters, loadDatasets, loadCharts, loadReports]);

  return (
    <div className="app-shell" data-theme={mode}>
      <nav className="main-nav">
        <strong>LabVista</strong>
        <NavLink to="/workspace">工作台</NavLink>
        <NavLink to="/chart-editor">编辑器</NavLink>
        <NavLink to="/report-builder">报告</NavLink>
        <NavLink to="/statistics">统计</NavLink>
        <NavLink to="/charts">图表库</NavLink>
        {activeFilterCount > 0 ? (
          <span className="filter-badge" title="全局筛选生效中，所有页面使用同一批筛选结果">
            筛选 {activeFilterCount}
          </span>
        ) : null}
        <button type="button" onClick={toggleTheme}>{mode === 'dark' ? '浅色' : '深色'}</button>
      </nav>
      <Outlet />
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/workspace" replace /> },
      { path: 'workspace', element: <Workspace /> },
      { path: 'chart-editor', element: <ChartEditor /> },
      { path: 'report-builder', element: <ReportBuilder /> },
      { path: 'statistics', element: <Statistics /> },
      { path: 'charts', element: <ChartGallery /> },
    ],
  },
]);
