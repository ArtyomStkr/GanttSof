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

  // Get the correct logo URL for the current environment
  private getLogoUrl(): string {
    // Get the base URL from the document base URI or window location
    const baseUri = document.baseURI || window.location.href;
    // Extract the base path (everything up to the last segment)
    const baseUrl = baseUri.endsWith('/') ? baseUri : baseUri.substring(0, baseUri.lastIndexOf('/') + 1);
    return baseUrl + 'logo/LOGO_COSSMIL.png';
  }

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
      const offset = Math.floor((task.startDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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
    const totalTimelineWidth = timeColumns.reduce((sum, col) => sum + col.width, 0);

    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + cfg.title + '</title><style>';
    html += 'body { font-family: Arial, sans-serif; margin:0; padding:20px; }';
    html += '* { box-sizing: border-box; }';
    html += '.header { display: flex; align-items: center; margin-bottom: 10px; }';
    html += '.header-left { flex: 1; text-align: left; }';
    html += '.header-left h3 { margin: 0 0 5px 0; font-size: 16px; color: #333; text-transform: uppercase; font-weight: bold; }';
    html += '.header-left h4 { margin: 0 0 5px 0; font-size: 16px; color: #666; font-weight: bold; }';
    html += '.header-left h5 { margin: 0; font-size: 16px; color: #333; font-weight: bold; }';
    html += '.header-center { flex: 1; text-align: center; }';
    html += '.header-center h1 { margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; color: ' + cfg.textColor + '; }';
    html += '.header-right { flex: 1; text-align: right; }';
    html += '.header-right img { height: 80px; width: auto; }';
    html += '.gantt-container { width: ' + (200 + totalTimelineWidth) + 'px; }';
    html += '.gantt-header { display: flex; background: ' + cfg.headerColor + '; border: 1px solid ' + cfg.gridColor + '; font-size: 11px; }';
    html += '.gantt-row { display: flex; border-bottom: 1px solid ' + cfg.gridColor + '; border-left: 1px solid ' + cfg.gridColor + '; border-right: 1px solid ' + cfg.gridColor + '; min-height: ' + (cfg.barHeight + 20) + 'px; }';
    html += '.participant-col { width: 200px; min-width: 200px; padding: 8px 5px; border-right: 1px solid ' + cfg.gridColor + '; display: flex; flex-direction: column; justify-content: center; font-size: 12px; font-weight: bold; }';
    html += '.participant-name { font-size: 10px; opacity: 0.7; font-weight: normal; }';
    html += '.timeline-header { display: flex; width: ' + totalTimelineWidth + 'px; }';
    html += '.timeline { position: relative; width: ' + totalTimelineWidth + 'px; height: ' + (cfg.barHeight + 20) + 'px; }';
    html += '.task-bar { position: absolute; height: ' + cfg.barHeight + 'px; border-radius: ' + cfg.barRadius + 'px; display: flex; align-items: center; justify-content: center; color: white; font-size: ' + cfg.fontSize + 'px; overflow: hidden; white-space: nowrap; top: 50%; transform: translateY(-50%); }';
    html += '.time-col { display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid ' + cfg.gridColor + '; font-size: 10px; padding: 5px 2px; flex-shrink: 0; }';
    html += '@media print { @page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .task-bar { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }';
    html += '</style></head><body>';

    // Header with 3 sections
    html += '<div class="header">';
    // Left: Organization info
    html += '<div class="header-left">';
    html += '<h3>Corporación del Seguro Social Militar</h3>';
    html += '<h4>Dirección Nacional de Tecnologías de la Información y Comunicación</h4>';
    html += '<h5>BOLIVIA</h5>';
    html += '</div>';
    // Center: Title
    html += '<div class="header-center">';
    html += '<h1>' + cfg.title + '</h1>';
    html += '</div>';
    // Right: Large logo (use absolute URL for print view)
    html += '<div class="header-right">';
    html += '<img src="' + this.getLogoUrl() + '" alt="COSSMIL Logo">';
    html += '</div></div>';

    // Gantt chart
    html += '<div class="gantt-container">';

    // Header row
    html += '<div class="gantt-header">';
    html += '<div class="participant-col" style="display: flex; align-items: center; justify-content: center;">TAREAS</div>';
    html += '<div class="timeline-header">';
    for (const col of timeColumns) {
      html += '<div class="time-col" style="width:' + col.width + 'px;">' + col.label + '<br><span style="font-size:9px;color:#666;">' + col.sublabel + '</span></div>';
    }
    html += '</div></div>';

    // Task rows
    for (const task of tasks) {
      const participant = participants.find(p => p.id === task.participantId);
      const left = this.getTaskLeft(task);
      const width = this.getTaskWidth(task);
      const color = task.color || participant?.color || '#3b82f6';

      html += '<div class="gantt-row">';
      html += '<div class="participant-col" style="color: ' + (participant?.color || '#333') + ';">';
      html += '<div class="participant-name">' + (participant?.name || 'Unknown') + '</div>';
      html += '<div>' + task.name + '</div>';
      html += '</div>';
      html += '<div class="timeline">';
      html += '<div class="task-bar" style="left:' + left + 'px; width:' + width + 'px; background:' + color + ';">';
      html += '<span style="padding: 0 5px;">' + task.name + ' (' + task.progress + '%)</span>';
      html += '</div></div></div>';
    }

    html += '</div></body></html>';
    return html;
  }
}
