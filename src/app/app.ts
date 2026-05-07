import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GanttChart } from './components/gantt-chart/gantt-chart';
import { TaskForm } from './components/task-form/task-form';
import { ParticipantForm } from './components/participant-form/participant-form';
import { ConfigPanel } from './components/config-panel/config-panel';
import { TaskTable } from './components/task-table/task-table';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GanttChart, TaskForm, ParticipantForm, ConfigPanel, TaskTable],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  activeTab = 'participants';

  setTab(tab: string) {
    this.activeTab = tab;
  }
}
