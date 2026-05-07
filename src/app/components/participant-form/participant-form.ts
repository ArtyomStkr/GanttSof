import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GanttService } from '../../services/gantt.service';
import { Participant } from '../../models/gantt.models';

@Component({
  selector: 'app-participant-form',
  imports: [FormsModule],
  templateUrl: './participant-form.html',
  styleUrl: './participant-form.css',
})
export class ParticipantForm {
  private ganttService = inject(GanttService);

  participants = this.ganttService.participants;

  name = signal('');
  selectedColor = signal('#3b82f6');

  predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  addParticipant() {
    if (!this.name()) return;
    this.ganttService.addParticipant(this.name(), this.selectedColor());
    this.name.set('');
  }

  removeParticipant(id: string) {
    this.ganttService.removeParticipant(id);
  }

  trackById(_: number, p: Participant) {
    return p.id;
  }
}
