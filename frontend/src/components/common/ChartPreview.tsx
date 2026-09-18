import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartConfig, ChartType, Dataset, DatasetRow } from '../../types';
import { getPalette } from '../../utils/colorSchemes';
import { useThemeStore } from '../../stores/themeStore';

interface ChartPreviewProps {
  dataset?: Dataset;
  config?: ChartConfig;
  compact?: boolean;
  /** 显式提供的数据行（全局筛选后的结果）；缺省时回退到 dataset.data。 */
  rows?: DatasetRow[];
}

const valueOf = (row: DatasetRow, field: string) => row[field] ?? '';

export const ChartPreview = ({ dataset, config, compact, rows }: ChartPreviewProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const mode = useThemeStore((state) => state.mode);

  const option = useMemo(() => {
    if (!dataset || !config) return undefined;
    const palette = getPalette(config.colorScheme);
    const source = rows ?? dataset.data;
    const chartRows = source.slice(0, compact ? 20 : 200);
    const isPie = config.type === ChartType.Pie;
    const seriesType = config.type === ChartType.Bar ? 'bar' : config.type === ChartType.Line ? 'line' : config.type === ChartType.Pie ? 'pie' : 'scatter';
    return {
      color: palette,
      backgroundColor: 'transparent',
      title: { text: config.title, subtext: config.subtitle, textStyle: { color: mode === 'dark' ? '#eef2f5' : '#1c2b32' } },
      tooltip: { trigger: isPie ? 'item' : 'axis' },
      legend: { top: config.legendPosition === 'top' ? 0 : undefined, textStyle: { color: mode === 'dark' ? '#dbe4e8' : '#33515a' } },
      grid: isPie ? undefined : { left: 42, right: 24, top: compact ? 48 : 72, bottom: 36 },
      xAxis: isPie ? undefined : { type: 'category', data: chartRows.map((row) => valueOf(row, config.xField)) },
      yAxis: isPie ? undefined : { type: 'value' },
      series: [
        {
          type: seriesType,
          smooth: config.type === ChartType.Line,
          data: isPie
            ? chartRows.map((row) => ({ name: String(valueOf(row, config.xField)), value: Number(valueOf(row, config.yField)) || 0 }))
            : chartRows.map((row) => Number(valueOf(row, config.yField)) || 0),
        },
      ],
    };
  }, [compact, config, dataset, mode, rows]);

  useEffect(() => {
    if (!ref.current || !option) return;
    const chart = echarts.init(ref.current, mode);
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [mode, option]);

  if (!dataset || !config) {
    return <div className="chart-preview chart-preview--empty">选择数据集和图表配置后显示预览</div>;
  }

  const effectiveRows = rows ?? dataset.data;
  if (effectiveRows.length === 0) {
    return <div className="chart-preview chart-preview--empty">当前筛选条件下没有可绘制的数据</div>;
  }

  return <div ref={ref} className="chart-preview" style={{ minHeight: compact ? 220 : 420 }} />;
};
