import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { GanttService } from '../../services/gantt.service';
import { Participant, GanttTask } from '../../models/gantt.models';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule, DatePipe],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm {
  private ganttService = inject(GanttService);

  participants = this.ganttService.participants;
  tasks = this.ganttService.tasks;
  ganttServicePublic = this.ganttService;

  taskName = signal('');
  selectedParticipantId = signal('');
  startDate = signal(this.formatDate(new Date()));
  endDate = signal(this.formatDate(new Date()));
  progress = signal(0);
  priority = signal<'high' | 'medium' | 'low'>('medium');

  editingTask = signal<GanttTask | null>(null);

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  addTask() {
    if (!this.taskName() || !this.selectedParticipantId()) return;

    const task = {
      name: this.taskName(),
      participantId: this.selectedParticipantId(),
      startDate: new Date(this.startDate()),
      endDate: new Date(this.endDate()),
      progress: this.progress(),
      priority: this.priority()
    };

    if (this.editingTask()) {
      this.ganttService.updateTask(this.editingTask()!.id, task);
      this.cancelEdit();
    } else {
      this.ganttService.addTask(task);
    }

    this.resetForm();
  }

  editTask(task: GanttTask) {
    this.editingTask.set(task);
    this.taskName.set(task.name);
    this.selectedParticipantId.set(task.participantId);
    this.startDate.set(this.formatDate(task.startDate));
    this.endDate.set(this.formatDate(task.endDate));
    this.progress.set(task.progress);
    this.priority.set(task.priority);
  }

  cancelEdit() {
    this.editingTask.set(null);
    this.resetForm();
  }

  resetForm() {
    this.taskName.set('');
    this.selectedParticipantId.set('');
    this.startDate.set(this.formatDate(new Date()));
    this.endDate.set(this.formatDate(new Date()));
    this.progress.set(0);
    this.priority.set('medium');
  }

  deleteTask(id: string) {
    this.ganttService.removeTask(id);
    if (this.editingTask()?.id === id) {
      this.cancelEdit();
    }
  }

  onParticipantChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedParticipantId.set(value);
  }

  onPriorityChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as 'high' | 'medium' | 'low';
    this.priority.set(value);
  }

  trackByTaskId(_: number, task: GanttTask) {
    return task.id;
  }
}
