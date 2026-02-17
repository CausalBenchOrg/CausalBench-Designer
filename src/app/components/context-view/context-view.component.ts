import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { TokenService } from '../../services/token.service';

@Component({
  selector: 'app-context-view',
  templateUrl: './context-view.component.html',
  styleUrls: ['./context-view.component.scss']
})
export class ContextViewComponent implements OnInit {
  availableTasks: any[] = [];
  selectedTaskId: string = '';
  selectedTaskVersion: string = '';
  taskVersions: string[] = [];
  selectedTaskType: string = ''; // task_name, used for filtering models/metrics and export
  loadingTasks: boolean = false;

  @Input() datasets: any[] = [];
  @Input() models: any[] = [];
  @Input() metrics: any[] = [];
  @Input() loadingDatasets: boolean = false;
  @Input() loadingModels: boolean = false;
  @Input() loadingMetrics: boolean = false;
  @Output() itemSelected = new EventEmitter<any>();
  @Output() addModel = new EventEmitter<void>();
  @Output() addMetric = new EventEmitter<void>();
  @Output() taskTypeChange = new EventEmitter<{ taskName: string; taskId: string; taskVersion: string }>();

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService
  ) { }

  ngOnInit() {
    this.fetchTasks();
  }

  /** Match model/metric version task to selected task by task_name or task_id (e.g. Causal Discovery uses id:1, version:1) */
  private taskMatches(task: any): boolean {
    if (!this.selectedTaskType && !this.selectedTaskId) return false;
    const byName = task.task_name && task.task_name === this.selectedTaskType;
    const byId = this.selectedTaskId && String(task.task_id ?? task.id ?? '') === String(this.selectedTaskId);
    return byName || byId;
  }

  get filteredModels(): any[] {
    if ((!this.selectedTaskType && !this.selectedTaskId) || !this.models) return [];
    return this.models.filter(model => {
      // Show new models that don't have data yet
      if (!model.data || Object.keys(model.data).length === 0) {
        return true;
      }

      const versionInfo = model.data.modl_version_info_list?.find(
        (v: any) => String(v.version.version_number) === model.data.selected_version
      );

      if (versionInfo?.version?.tasks) {
        return versionInfo.version.tasks.some((task: any) => this.taskMatches(task));
      }

      const tasks = model.data?.version?.tasks || [];
      return tasks.some((task: any) => this.taskMatches(task));
    });
  }

  get filteredMetrics(): any[] {
    if ((!this.selectedTaskType && !this.selectedTaskId) || !this.metrics) return [];
    return this.metrics.filter(metric => {
      // Show new metrics that don't have data yet
      if (!metric.data || Object.keys(metric.data).length === 0) {
        return true;
      }

      const versionInfo = metric.data.metric_version_info_list?.find(
        (v: any) => String(v.version.version_number) === metric.data.selected_version
      );

      if (versionInfo?.version?.tasks) {
        return versionInfo.version.tasks.some((task: any) => this.taskMatches(task));
      }

      const tasks = metric.data?.version?.tasks || [];
      return tasks.some((task: any) => this.taskMatches(task));
    });
  }

  fetchTasks() {
    this.tokenService.token$.subscribe(token => {
      this.loadingTasks = true;
      this.apiService.getTasks(token).subscribe({
        next: (tasks: any[]) => {
          this.availableTasks = tasks;
          this.loadingTasks = false;
        },
        error: (error) => {
          console.error('Error fetching tasks:', error);
          this.loadingTasks = false;
        }
      });
    });
  }

  onTaskIdChange(taskId: string) {
    this.selectedTaskId = taskId || '';
    this.selectedTaskVersion = '';
    this.taskVersions = [];
    const task = this.availableTasks.find((t: any) => String(t.task_id) === String(taskId));
    if (task) {
      this.selectedTaskType = task.task_name;
      const versionList = task.task_version_info_list ?? [];
      this.taskVersions = versionList.map((v: any) => String(v.version?.version_number ?? v.version_number ?? v));
      if (this.taskVersions.length > 0) {
        this.selectedTaskVersion = this.taskVersions[0];
      }
      console.debug('[Task type changed]', {
        taskId: this.selectedTaskId,
        taskVersion: this.selectedTaskVersion,
        taskName: this.selectedTaskType
      });
      this.taskTypeChange.emit({ taskName: this.selectedTaskType, taskId: this.selectedTaskId, taskVersion: this.selectedTaskVersion });
    } else {
      this.selectedTaskType = '';
      this.selectedTaskVersion = '';
      console.debug('[Task type changed]', { taskId: '', taskVersion: '', taskName: '' });
      this.taskTypeChange.emit({ taskName: '', taskId: '', taskVersion: '' });
    }
  }

  onTaskVersionChange(event: any) {
    this.selectedTaskVersion = event.target.value;
    this.taskTypeChange.emit({ taskName: this.selectedTaskType, taskId: this.selectedTaskId, taskVersion: this.selectedTaskVersion });
  }

  onAddModel() {
    this.addModel.emit();
  }

  onAddMetric() {
    this.addMetric.emit();
  }
}