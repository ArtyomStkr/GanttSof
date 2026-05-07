import { Component, inject, computed } from '@angular/core';
import { GanttService } from '../../services/gantt.service';
import { Participant, GanttTask } from '../../models/gantt.models';

@Component({
  selector: 'app-gantt-chart',
  imports: [],
  templateUrl: './gantt-chart.html',
  styleUrl: './gantt-chart.css',
})
export class GanttChart {
  private ganttService = inject(GanttService);
  Math = Math;

  participants = this.ganttService.participants;
  tasks = this.ganttService.tasks;
  config = this.ganttService.config;
  projectStartDate = this.ganttService.projectStartDate;
  projectEndDate = this.ganttService.projectEndDate;
  timeColumns = this.ganttService.timeColumns;
  effectiveTimeScale = this.ganttService.effectiveTimeScale;

  getTaskStyle(task: GanttTask) {
    const left = this.ganttService.getTaskLeft(task);
    const width = this.ganttService.getTaskWidth(task);
    return {
      left: left + 'px',
      width: width + 'px',
      background: task.color || this.getParticipantColor(task.participantId),
    };
  }

  getParticipantColor(participantId: string): string {
    const p = this.participants().find(x => x.id === participantId);
    return p?.color || '#3b82f6';
  }

  getTodayLeft(): number {
    const today = new Date();
    const start = this.projectStartDate();
    const scale = this.effectiveTimeScale();
    if (scale === 'days') {
      return Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) * 30 + 200;
    }
    if (scale === 'weeks') {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weeksDiff = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff * 150 + 200;
    }
    return 200;
  }

  isTodayVisible(): boolean {
    const today = new Date();
    const start = this.projectStartDate();
    const end = this.projectEndDate();
    return today >= start && today <= end;
  }

  getParticipantForTask(taskId: string): Participant | undefined {
    const task = this.tasks().find(t => t.id === taskId);
    if (!task) return undefined;
    return this.participants().find(p => p.id === task.participantId);
  }

  trackByTaskId(_: number, task: GanttTask) {
    return task.id;
  }

  trackByColumn(_: number, col: any) {
    return col.label + col.sublabel;
  }
}
