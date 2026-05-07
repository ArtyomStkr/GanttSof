import { Injectable, signal, computed } from '@angular/core';
import { Participant, GanttTask, GanttConfig, TimeScale } from '../models/gantt.models';

@Injectable({
  providedIn: 'root'
})
export class GanttService {
  participants = signal<Participant[]>([]);
  tasks = signal<GanttTask[]>([]);

  config = signal<GanttConfig>({
    title: 'Diagrama de Gantt',
    showWeekends: true,
    showToday: true,
    barHeight: 30,
    barRadius: 4,
    fontSize: 12,
    gridColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    headerColor: '#f8f9fa',
    textColor: '#333333',
    showGrid: true,
    timeScale: 'days',
    autoScale: true
  });

  projectStartDate = computed(() => {
    const allDates = this.tasks().map(t => t.startDate);
    if (allDates.length === 0) return new Date();
    return new Date(Math.min(...allDates.map(d => d.getTime())));
  });

  projectEndDate = computed(() => {
    const allDates = this.tasks().map(t => t.endDate);
    if (allDates.length === 0) return new Date();
    return new Date(Math.max(...allDates.map(d => d.getTime())));
  });

  totalDays = computed(() => {
    const start = this.projectStartDate();
    const end = this.projectEndDate();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  });

  effectiveTimeScale = computed(() => {
    const cfg = this.config();
    if (!cfg.autoScale) return cfg.timeScale;

    const days = this.totalDays();
    if (days <= 31) return 'days';
    if (days <= 120) return 'weeks';
    return 'months';
  });

  timeColumns = computed(() => {
    const scale = this.effectiveTimeScale();
    const start = this.projectStartDate();
    const end = this.projectEndDate();
    const columns: any[] = [];

    if (scale === 'days') {
      const totalDays = this.totalDays();
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        columns.push({
          label: d.getDate().toString(),
          sublabel: d.toLocaleString('es', { month: 'short' }),
          date: d,
          width: 30
        });
      }
      return columns;
    }

    if (scale === 'weeks') {
      const current = new Date(start);
      current.setDate(current.getDate() - current.getDay());

      while (current <= end) {
        const weekStart = new Date(current);
        const label = `${weekStart.getDate()} ${weekStart.toLocaleString('es', { month: 'short' })}`;
        columns.push({
          label,
          sublabel: `Semana ${columns.length + 1}`,
          date: new Date(current),
          width: 150
        });
        current.setDate(current.getDate() + 7);
      }
      return columns;
    }

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const label = current.toLocaleString('es', { month: 'long', year: 'numeric' });
      columns.push({
        label,
        sublabel: `${daysInMonth} días`,
        date: new Date(current),
        width: daysInMonth * 30
      });
      current.setMonth(current.getMonth() + 1);
    }
    return columns;
  });

  addParticipant(name: string, color: string) {
    const participant: Participant = {
      id: crypto.randomUUID(),
      name,
      color
    };
    this.participants.update(p => [...p, participant]);
    this.saveToLocalStorage();
    return participant;
  }

  removeParticipant(id: string) {
    this.participants.update(p => p.filter(x => x.id !== id));
    this.tasks.update(t => t.filter(x => x.participantId !== id));
    this.saveToLocalStorage();
  }

  addTask(task: Omit<GanttTask, 'id'>) {
    const newTask: GanttTask = {
      ...task,
      id: crypto.randomUUID(),
      progress: task.progress || 0,
      priority: task.priority || 'medium'
    };
    this.tasks.update(t => [...t, newTask]);
    this.saveToLocalStorage();
    return newTask;
  }

  updateTask(id: string, updates: Partial<GanttTask>) {
    this.tasks.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    );
    this.saveToLocalStorage();
  }

  removeTask(id: string) {
    this.tasks.update(t => t.filter(x => x.id !== id));
    this.saveToLocalStorage();
  }

  getTasksForParticipant(participantId: string) {
    return computed(() =>
      this.tasks().filter(t => t.participantId === participantId)
    );
  }

  updateConfig(updates: Partial<GanttConfig>) {
    this.config.update(c => ({ ...c, ...updates }));
    this.saveToLocalStorage();
  }

  getTaskLeft(task: GanttTask): number {
    const start = this.projectStartDate();
    const scale = this.effectiveTimeScale();

    if (scale === 'days') {
      const offset = Math.ceil((task.startDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return offset * 30;
    }

    if (scale === 'weeks') {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weeksDiff = Math.floor((task.startDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff * 150;
    }

    const monthsDiff = (task.startDate.getFullYear() - start.getFullYear()) * 12 +
                       (task.startDate.getMonth() - start.getMonth());
    const daysFromMonthStart = task.startDate.getDate() - 1;
    const daysInMonth = new Date(task.startDate.getFullYear(), task.startDate.getMonth() + 1, 0).getDate();
    return monthsDiff * daysInMonth * 30 + daysFromMonthStart * 30;
  }

  getTaskWidth(task: GanttTask): number {
    const scale = this.effectiveTimeScale();
    const durationDays = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (scale === 'days') {
      return durationDays * 30;
    }

    if (scale === 'weeks') {
      return (durationDays / 7) * 150;
    }

    return durationDays * 30;
  }

  exportToJSON(): string {
    const data = {
      participants: this.participants(),
      tasks: this.tasks().map(t => ({
        ...t,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString()
      })),
      config: this.config(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importFromJSON(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);

      if (!data.participants || !data.tasks) {
        throw new Error('Formato inválido');
      }

      const tasks = data.tasks.map((t: any) => ({
        ...t,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate)
      }));

      this.participants.set(data.participants);
      this.tasks.set(tasks);
      if (data.config) {
        this.config.set(data.config);
      }

      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Error importing JSON:', error);
      return false;
    }
  }

  saveToLocalStorage() {
    try {
      const json = this.exportToJSON();
      localStorage.setItem('gantt-app-data', json);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  loadFromLocalStorage() {
    try {
      const json = localStorage.getItem('gantt-app-data');
      if (json) {
        return this.importFromJSON(json);
      }
      return false;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return false;
    }
  }

  clearAllData() {
    this.participants.set([]);
    this.tasks.set([]);
    localStorage.removeItem('gantt-app-data');
  }

  generatePrintView() {
    const cfg = this.config();
    const participants = this.participants();
    const tasks = this.tasks();
    const timeColumns = this.timeColumns();
    let totalWidth = 200 + timeColumns.reduce((sum, col) => sum + col.width, 0);

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${cfg.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { text-align: center; color: ${cfg.textColor}; margin-bottom: 5px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
    .gantt-container { overflow-x: auto; }
    .gantt-header { display: flex; background: ${cfg.headerColor}; border-bottom: 2px solid ${cfg.gridColor}; font-size: 11px; }
    .gantt-row { display: flex; border-bottom: 1px solid ${cfg.gridColor}; align-items: center; min-height: ${cfg.barHeight + 10}px; }
    .participant-col { width: 200px; min-width: 200px; padding: 5px; font-weight: bold; font-size: 12px; border-right: 1px solid ${cfg.gridColor}; }
    .timeline { position: relative; flex: 1; height: 100%; border-left: 1px solid ${cfg.gridColor}; min-width: ${totalWidth - 200}px; }
    .task-bar { position: absolute; height: ${cfg.barHeight}px; border-radius: ${cfg.barRadius}px; display: flex; align-items: center; justify-content: center; color: white; font-size: ${cfg.fontSize}px; overflow: hidden; white-space: nowrap; }
    .time-column { display: inline-block; text-align: center; font-size: 10px; border-right: 1px solid ${cfg.gridColor}; padding: 5px 2px; }
    @media print {
      body { margin: 0; }
      .gantt-container { overflow: visible; }
      @page { size: landscape; }
    }
  </style>
</head>
<body>
  <h1>${cfg.title}</h1>
  <div class="subtitle">Corporación del Seguro Social Militar - COSSMIL</div>
  <div class="gantt-container">
    <div class="gantt-header">
      <div class="participant-col">Participante / Tarea</div>
      <div style="flex:1; display:flex;">`;

    for (const col of timeColumns) {
      html += `<div class="time-column" style="width:${col.width}px;">${col.label}<br><span style="font-size:9px;color:#666;">${col.sublabel}</span></div>`;
    }

    html += `</div></div>`;

    for (const task of tasks) {
      const participant = participants.find(p => p.id === task.participantId);
      const left = this.getTaskLeft(task);
      const width = this.getTaskWidth(task);
      const color = task.color || participant?.color || '#3b82f6';

      html += `<div class="gantt-row">
        <div class="participant-col" style="color: ${participant?.color || '#333'};">
          <div style="font-size:10px;opacity:0.7;">${participant?.name || 'Unknown'}</div>
          <div>${task.name}</div>
        </div>
        <div class="timeline">
          <div class="task-bar" style="left:${left}px; width:${width}px; background:${color}; top:5px;">
            ${task.name} (${task.progress}%)
          </div>
        </div>
      </div>`;
    }

    html += `</div></body></html>`;
    return html;
  }
}
