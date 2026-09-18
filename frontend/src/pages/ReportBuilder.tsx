import { DraggableGrid } from '../components/common/DraggableGrid';
import { useChartStore } from '../stores/chartStore';
import { useReportStore } from '../stores/reportStore';
import { useFilterStore } from '../stores/filterStore';

export const ReportBuilder = () => {
  const charts = useChartStore((state) => state.charts);
  const reports = useReportStore((state) => state.reports);
  const activeReportId = useReportStore((state) => state.activeReportId);
  const saveReport = useReportStore((state) => state.saveReport);
  const filters = useFilterStore((state) => state.filters);
  const report = reports.find((candidate) => candidate.id === activeReportId) ?? reports[0];
  const globallyFiltered = filters.some((filter) => filter.active);

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <span className="eyebrow">Report</span>
          <h1>报告组装</h1>
        </div>
        <button className="primary-action" onClick={() => saveReport({ ...report, exportStatus: 'Ready', updatedAt: new Date().toISOString() })}>标记可导出</button>
      </section>
      {globallyFiltered ? (
        <div className="filter-status" aria-live="polite">
          报告预览与全局筛选联动：所有图表仅呈现当前筛选命中的行；停用条件后对应数据自动恢复，原始数据不会被改写。
        </div>
      ) : (
        <div className="filter-status" aria-live="polite">未启用筛选，报告中各图表基于完整数据集。</div>
      )}
      <DraggableGrid
        report={report}
        charts={charts}
        onAddChart={(chartId) => {
          if (report.chartIds.includes(chartId)) return;
          void saveReport({ ...report, chartIds: [...report.chartIds, chartId], updatedAt: new Date().toISOString() });
        }}
      />
    </main>
  );
};
