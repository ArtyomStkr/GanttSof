export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface GanttTask {
  id: string;
  name: string;
  participantId: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  progress: number;
  priority: 'high' | 'medium' | 'low';
}

export type TimeScale = 'days' | 'weeks' | 'months';

export interface GanttConfig {
  title: string;
  showWeekends: boolean;
  showToday: boolean;
  barHeight: number;
  barRadius: number;
  fontSize: number;
  gridColor: string;
  backgroundColor: string;
  headerColor: string;
  textColor: string;
  showGrid: boolean;
  timeScale: TimeScale;
  autoScale: boolean;
}
