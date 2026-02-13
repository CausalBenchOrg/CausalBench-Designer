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
  @Output() taskTypeChange = new EventEmitter<string>();

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService
  ) { }

  ngOnInit() {
    this.fetchTasks();
  }

  get filteredModels(): any[] {
    if (!this.selectedTaskType || !this.models) return [];
    return this.models.filter(model => {
      // Show new models that don't have data yet
      if (!model.data || Object.keys(model.data).length === 0) {
        return true;
      }

      // Check for tasks in different possible locations
      const versionInfo = model.data.modl_version_info_list?.find(
        (v: any) => String(v.version.version_number) === model.data.selected_version
      );

      if (versionInfo?.version?.tasks) {
        return versionInfo.version.tasks.some((task: any) => 
          task.task_name === this.selectedTaskType
        );
      }

      // Fallback to checking the direct version tasks
      const tasks = model.data?.version?.tasks || [];
      return tasks.some((task: any) => task.task_name === this.selectedTaskType);
    });
  }

  get filteredMetrics(): any[] {
    if (!this.selectedTaskType || !this.metrics) return [];
    return this.metrics.filter(metric => {
      // Show new metrics that don't have data yet
      if (!metric.data || Object.keys(metric.data).length === 0) {
        return true;
      }

      // Check for tasks in different possible locations
      const versionInfo = metric.data.metric_version_info_list?.find(
        (v: any) => String(v.version.version_number) === metric.data.selected_version
      );

      if (versionInfo?.version?.tasks) {
        return versionInfo.version.tasks.some((task: any) => 
          task.task_name === this.selectedTaskType
        );
      }

      // Fallback to checking the direct version tasks
      const tasks = metric.data?.version?.tasks || [];
      return tasks.some((task: any) => task.task_name === this.selectedTaskType);
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
      this.taskTypeChange.emit(this.selectedTaskType);
    } else {
      this.selectedTaskType = '';
    }
  }

  onTaskVersionChange(event: any) {
    this.selectedTaskVersion = event.target.value;
  }

  onAddModel() {
    this.addModel.emit();
  }

  onAddMetric() {
    this.addMetric.emit();
  }
}