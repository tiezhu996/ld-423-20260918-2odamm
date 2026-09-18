import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { ChartConfig, Report } from '../../types';
import { ChartPreview } from './ChartPreview';
import { useFilteredDataset } from '../../hooks/useFilteredRows';
import { useDatasetStore } from '../../stores/datasetStore';

interface DraggableGridProps {
  report: Report;
  charts: ChartConfig[];
  onAddChart: (chartId: string) => void;
}

const DraggableChart = ({ chart }: { chart: ChartConfig }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: chart.id });
  return (
    <button
      ref={setNodeRef}
      className="draggable-chart"
      style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}
      {...listeners}
      {...attributes}
    >
      {chart.name}
    </button>
  );
};

const DropCanvas = ({ children }: { children: ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'report-canvas' });
  return (
    <section ref={setNodeRef} className={isOver ? 'report-canvas is-over' : 'report-canvas'}>
      {children}
    </section>
  );
};

const ReportTile = ({ chart }: { chart: ChartConfig }) => {
  const dataset = useDatasetStore((state) => state.datasets.find((candidate) => candidate.id === chart.datasetId));
  const filteredDataset = useFilteredDataset(dataset);
  return (
    <article className="report-tile">
      <ChartPreview dataset={filteredDataset} config={chart} compact />
    </article>
  );
};

export const DraggableGrid = ({ report, charts, onAddChart }: DraggableGridProps) => {
  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id === 'report-canvas') onAddChart(String(event.active.id));
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="report-layout">
        <aside className="chart-tray">
          {charts.map((chart) => (
            <DraggableChart key={chart.id} chart={chart} />
          ))}
        </aside>
        <DropCanvas>
          {report.chartIds.map((chartId) => {
            const chart = charts.find((candidate) => candidate.id === chartId);
            return chart ? <ReportTile key={chartId} chart={chart} /> : null;
          })}
        </DropCanvas>
      </div>
    </DndContext>
  );
};
