import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { TokenService } from '../../services/token.service';

@Component({
  selector: 'app-context-designer',
  templateUrl: './context-designer.component.html',
  styleUrls: ['./context-designer.component.scss']
})
export class ContextDesignerComponent implements OnInit {
  title = 'CausalBench GUI';
  showHelp = false;
  showAbout = false;
  datasets: any[] = [];
  models: any[] = [];
  metrics: any[] = [];
  currentItem: any = null;
  currentItemType: 'dataset' | 'model' | 'metric' | null = null;
  selectedTaskType: string = '';
  selectedTaskId: string = '';

  // Available items from API (for selection)
  availableDatasets: any[] = [];
  availableModels: any[] = [];
  availableMetrics: any[] = [];
  availableTasks: any[] = [];

  // Loading states
  loadingDatasets = false;
  loadingModels = false;
  loadingMetrics = false;
  loadingTasks = false;

  // Export dialog state
  showExportDialog = false;

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService
  ) { }

  ngOnInit() {
    this.loadAvailableData();
  }

  loadAvailableData() {
    this.tokenService.token$.subscribe(token => {
      // Load available datasets from API with default request body
      this.loadingDatasets = true;
      this.apiService.getDatasets(token).subscribe({
        next: (data) => {
          this.availableDatasets = data;
          console.log('Available datasets loaded:', data);
          this.loadingDatasets = false;
        },
        error: (error) => {
          console.error('Error loading datasets:', error);
          this.loadingDatasets = false;
          // Fallback to mock data or show error message
        }
      });
      
      // Load available models from API with default request body
      this.loadingModels = true;
      this.apiService.getModels(token).subscribe({
        next: (data) => {
          this.availableModels = data;
          console.log('Available models loaded:', data);
          this.loadingModels = false;
        },
        error: (error) => {
          console.error('Error loading models:', error);
          this.loadingModels = false;
          // Fallback to mock data or show error message
        }
      });
      
      // Load available metrics from API with default request body
      this.loadingMetrics = true;
      this.apiService.getMetrics(token).subscribe({
        next: (data) => {
          this.availableMetrics = data;
          console.log('Available metrics loaded:', data);
          this.loadingMetrics = false;
        },
        error: (error) => {
          console.error('Error loading metrics:', error);
          this.loadingMetrics = false;
          // Fallback to mock data or show error message
        }
      });

      // Load available tasks from API with default request body
      this.loadingTasks = true;
      this.apiService.getTasks(token).subscribe({
        next: (data) => {
          this.availableTasks = data;
          console.log('Available tasks loaded:', data);
          this.loadingTasks = false;
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
          this.loadingTasks = false;
          // Fallback to mock data or show error message
        }
      });
    });
  }

  onItemSelected(item: any) {
    // Deselect all items across all panels
    this.deselectAllItems();
    
    // Select the new item
    if (item) {
      item.isSelected = true;
      
      // Determine the type of item selected
      if (this.datasets.includes(item)) {
        this.currentItemType = 'dataset';
      } else if (this.models.includes(item)) {
        this.currentItemType = 'model';
      } else if (this.metrics.includes(item)) {
        this.currentItemType = 'metric';
      }
    }
    
    this.currentItem = item;
  }

  deselectAllItems() {
    // Deselect all datasets
    this.datasets.forEach(dataset => {
      dataset.isSelected = false;
    });
    
    // Deselect all models
    this.models.forEach(model => {
      model.isSelected = false;
    });
    
    // Deselect all metrics
    this.metrics.forEach(metric => {
      metric.isSelected = false;
    });
  }

  onAddDataset() {
    const newDataset = {
      data: {},
      isSelected: false
    };
    this.datasets.push(newDataset);
    console.log('Added new dataset:', newDataset);
    this.onItemSelected(newDataset);
  }

  onAddModel() {
    const newModel = {
      data: {},
      isSelected: false
    };
    this.models.push(newModel);
    console.log('Added new model:', newModel);
    this.onItemSelected(newModel);
  }

  onAddMetric() {
    const newMetric = {
      data: {},
      isSelected: false
    };
    this.metrics.push(newMetric);
    console.log('Added new metric:', newMetric);
    this.onItemSelected(newMetric);
  }

  onAddItemWithData(data: any) {
    const { type, item, selectedId, selectedVersion } = data;
    
    // Check if this item with the same ID and version already exists
    if (this.isDuplicateItem(type, selectedId, selectedVersion)) {
      const itemName = this.getItemName(type, selectedId);
      alert(`Cannot add duplicate: ${itemName} (ID: ${selectedId}, Version: ${selectedVersion}) already exists in the ${type} list.`);
      return;
    }
    
    let newItem: any;
    
    if (type === 'dataset') {
      newItem = {
        data: { ...item },
        isSelected: false
      };
      newItem.data.selected_version = selectedVersion;
      this.datasets.push(newItem);
    } else if (type === 'model') {
      newItem = {
        data: { ...item },
        isSelected: false
      };
      newItem.data.selected_version = selectedVersion;
      this.models.push(newItem);
    } else if (type === 'metric') {
      newItem = {
        data: { ...item },
        isSelected: false
      };
      newItem.data.selected_version = selectedVersion;
      this.metrics.push(newItem);
    }
    
    console.log('Added new item with data:', newItem);
    this.onItemSelected(newItem);
  }

  isDuplicateItem(type: string, id: string, version: string): boolean {
    let items: any[];
    
    if (type === 'dataset') {
      items = this.datasets;
    } else if (type === 'model') {
      items = this.models;
    } else if (type === 'metric') {
      items = this.metrics;
    } else {
      return false;
    }
    
    return items.some(item => {
      const itemId = this.getItemId(item, type);
      const itemVersion = item.data?.selected_version;
      return itemId === id && itemVersion === version;
    });
  }

  getItemId(item: any, type: string): string {
    if (type === 'dataset') {
      return String(item.data?.dataset_id);
    } else if (type === 'model') {
      return String(item.data?.modl_id);
    } else if (type === 'metric') {
      return String(item.data?.metric_id);
    }
    return '';
  }

  onRemoveItem() {
    if (this.currentItem) {
      // Remove from appropriate array
      if (this.datasets.includes(this.currentItem)) {
        this.datasets = this.datasets.filter(item => item !== this.currentItem);
      } else if (this.models.includes(this.currentItem)) {
        this.models = this.models.filter(item => item !== this.currentItem);
      } else if (this.metrics.includes(this.currentItem)) {
        this.metrics = this.metrics.filter(item => item !== this.currentItem);
      }
      this.currentItem = null;
      this.currentItemType = null;
    }
  }

  onApplyItem(applyData: any) {
    const { item, type, id, version, hyperparameterSets, fileMappings } = applyData;
    
    // Check if this item with the same ID and version already exists (excluding the current item)
    if (this.isDuplicateItemExcludingCurrent(type, id, version, item)) {
      const itemName = this.getItemName(type, id);
      alert(`Cannot apply configuration: ${itemName} (ID: ${id}, Version: ${version}) already exists in the ${type} list.`);
      return;
    }
    
    if (type === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === id);
      if (dataset) {
        const versionInfo = dataset.dataset_version_info_list.find(
          (v: any) => String(v.version.version_number) === version
        );
        if (versionInfo) {
          item.data = { ...dataset };
          item.data.selected_version = version;
          item.data.is_new = false;
          // Add file mappings if provided (similar to hyperparameters)
          if (fileMappings) {
            item.data.file_mappings = fileMappings;
            console.log('Stored file mappings for dataset:', fileMappings);
          }
          // Update display name
          if (item.getDisplayName) {
            item.getDisplayName = () => versionInfo.dataset.dataset_name;
          }
        }
      }
    } else if (type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === id);
      if (model) {
        const versionInfo = model.modl_version_info_list.find(
          (v: any) => String(v.version.version_number) === version
        );
        if (versionInfo) {
          item.data = { ...model };
          item.data.selected_version = version;
          item.data.is_new = false;
          // Add hyperparameter sets if provided
          if (hyperparameterSets) {
            item.data.hyperparameter_sets = hyperparameterSets;
          }
          // Update display name
          if (item.getDisplayName) {
            item.getDisplayName = () => versionInfo.modl.modl_name;
          }
        }
      }
    } else if (type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === id);
      if (metric) {
        const versionInfo = metric.metric_version_info_list.find(
          (v: any) => String(v.version.version_number) === version
        );
        if (versionInfo) {
          item.data = { ...metric };
          item.data.selected_version = version;
          item.data.is_new = false;
          // Add hyperparameter sets if provided
          if (hyperparameterSets) {
            item.data.hyperparameter_sets = hyperparameterSets;
          }
          // Update display name
          if (item.getDisplayName) {
            item.getDisplayName = () => versionInfo.metric.metric_name;
          }
        }
      }
    }
  }

  isDuplicateItemExcludingCurrent(type: string, id: string, version: string, currentItem: any): boolean {
    let items: any[];
    
    if (type === 'dataset') {
      items = this.datasets;
    } else if (type === 'model') {
      items = this.models;
    } else if (type === 'metric') {
      items = this.metrics;
    } else {
      return false;
    }
    
    return items.some(item => {
      // Skip the current item being configured
      if (item === currentItem) {
        return false;
      }
      
      const itemId = this.getItemId(item, type);
      const itemVersion = item.data?.selected_version;
      return itemId === id && itemVersion === version;
    });
  }

  onExportContext() {
    this.showExportDialog = true;
  }

  onCloseExportDialog() {
    this.showExportDialog = false;
  }

  getItemName(type: string, id: string): string {
    if (type === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === id);
      return dataset?.dataset_name || `Dataset ${id}`;
    } else if (type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === id);
      return model?.modl_name || `Model ${id}`;
    } else if (type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === id);
      return metric?.metric_name || `Metric ${id}`;
    }
    return `Item ${id}`;
  }

  onTaskTypeChange(event: { taskName: string; taskId: string } | string) {
    if (typeof event === 'string') {
      this.selectedTaskType = event;
      this.selectedTaskId = '';
    } else {
      this.selectedTaskType = event.taskName;
      this.selectedTaskId = event.taskId ?? '';
    }
  }
}

