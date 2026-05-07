import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GanttService } from '../../services/gantt.service';

@Component({
  selector: 'app-config-panel',
  imports: [FormsModule],
  templateUrl: './config-panel.html',
  styleUrl: './config-panel.css',
})
export class ConfigPanel {
  private ganttService = inject(GanttService);
  config = this.ganttService.config;
  effectiveScale = this.ganttService.effectiveTimeScale;

  updateTitle(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.ganttService.updateConfig({ title: value });
  }

  updateTimeScale(event: Event) {
    const value = (event.target as HTMLSelectElement).value as 'days' | 'weeks' | 'months';
    this.ganttService.updateConfig({ timeScale: value });
  }

  toggleAutoScale() {
    this.ganttService.updateConfig({ autoScale: !this.config().autoScale });
  }

  updateBarHeight(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.ganttService.updateConfig({ barHeight: value });
  }

  updateFontSize(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.ganttService.updateConfig({ fontSize: value });
  }

  updateGridColor(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.ganttService.updateConfig({ gridColor: value });
  }

  toggleGrid() {
    this.ganttService.updateConfig({ showGrid: !this.config().showGrid });
  }

  toggleWeekends() {
    this.ganttService.updateConfig({ showWeekends: !this.config().showWeekends });
  }

  toggleToday() {
    this.ganttService.updateConfig({ showToday: !this.config().showToday });
  }

  printGantt() {
    const printContent = this.ganttService.generatePrintView();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setTimeout(() => win.close(), 1000);
      }, 1000);
    } else {
      alert('Por favor, permita ventanas emergentes para imprimir el diagrama.');
    }
  }

  exportJSON() {
    const json = this.ganttService.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-diagram-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = this.ganttService.importFromJSON(content);
      if (success) {
        alert('Diagrama importado correctamente');
      } else {
        alert('Error al importar el archivo. Verifique el formato.');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  }

  clearData() {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos? Esta acción no se puede deshacer.')) {
      this.ganttService.clearAllData();
    }
  }
}
