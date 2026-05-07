import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GanttService } from '../../services/gantt.service';
import { GanttTask } from '../../models/gantt.models';

@Component({
  selector: 'app-task-table',
  imports: [DatePipe],
  templateUrl: './task-table.html',
  styleUrl: './task-table.css',
})
export class TaskTable {
  private ganttService = inject(GanttService);

  tasks = this.ganttService.tasks;
  participants = this.ganttService.participants;

  getParticipantName(participantId: string): string {
    return this.participants().find(p => p.id === participantId)?.name || 'Unknown';
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'high': 'Alta',
      'medium': 'Media',
      'low': 'Baja'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    return priority;
  }
}
