import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() availableDatasets: any[] = [];
  @Input() availableModels: any[] = [];
  @Input() availableMetrics: any[] = [];
  @Input() currentItem: any = null;
  @Input() currentItemType: 'dataset' | 'model' | 'metric' | null = null;
  @Input() loadingDatasets = false;
  @Input() loadingModels = false;
  @Input() loadingMetrics = false;
  
  // Current items for duplicate checking
  @Input() currentDatasets: any[] = [];
  @Input() currentModels: any[] = [];
  @Input() currentMetrics: any[] = [];
  
  @Output() itemSelected = new EventEmitter<any>();
  @Output() addDataset = new EventEmitter<void>();
  @Output() addModel = new EventEmitter<void>();
  @Output() addMetric = new EventEmitter<void>();
  @Output() addItemWithData = new EventEmitter<any>();
  @Output() removeItem = new EventEmitter<void>();
  @Output() exportContext = new EventEmitter<void>();
  @Output() applyItem = new EventEmitter<any>();

  // Query and Information section
  selectedType: 'dataset' | 'model' | 'metric' | null = null;
  selectedId = '';
  selectedVersion = '';
  
  // Search functionality
  searchQuery = '';
  showSearchResults = false;
  searchResults: any[] = [];
  
  // Information fields
  itemName = '';
  itemDescription = '';
  itemAuthor = '';
  itemVisibility = '';
  itemUrl = '';
  itemTimestamp = '';

  // Hyperparameter management
  availableHyperparameters: any[] = [];
  hyperparameterSets: any[] = [];
  showHyperparameterSection = false;

  // Dataset file mapping
  availableDatasetFiles: { filename: string, filetype: string }[] = [];
  selectedDataFile = '';
  selectedGroundTruthFile = '';
  showDatasetFilesSection = false;

  // Dropdown options
  datasetOptions: { id: string, name: string }[] = [];
  modelOptions: { id: string, name: string }[] = [];
  metricOptions: { id: string, name: string }[] = [];
  versions: string[] = [];

  showExportDialog = false;
  exportData = {
    taskType: 'discovery.temporal',
    name: '',
    description: ''
  };

  constructor() {}

  ngOnInit() {
    this.updateDropdownOptions();
  }

  ngOnChanges() {
    this.updateDropdownOptions();
    this.updateCurrentItemInfo();
  }

  updateDropdownOptions() {
    // Extract unique IDs and names from available data
    this.datasetOptions = this.getUniqueOptions(this.availableDatasets, 'dataset_id', 'dataset_name');
    this.modelOptions = this.getUniqueOptions(this.availableModels, 'modl_id', 'modl_name');
    this.metricOptions = this.getUniqueOptions(this.availableMetrics, 'metric_id', 'metric_name');
  }

  getUniqueOptions(items: any[], idField: string, nameField: string): { id: string, name: string }[] {
    const uniqueItems = items.reduce((acc, item) => {
      const id = String(item[idField]);
      if (!acc.find((existing: { id: string, name: string }) => existing.id === id)) {
        acc.push({
          id,
          name: item[nameField] || `Item ${id}`
        });
      }
      return acc;
    }, [] as { id: string, name: string }[]);
    
    return uniqueItems.sort((a: { id: string, name: string }, b: { id: string, name: string }) => {
      const numA = parseInt(a.id);
      const numB = parseInt(b.id);
      return isNaN(numA) || isNaN(numB) ? a.name.localeCompare(b.name) : numA - numB;
    });
  }

  updateCurrentItemInfo() {
    if (!this.currentItem) {
      this.showPlaceholder();
      return;
    }

    console.log('Updating current item info:', this.currentItem);
    console.log('Current item type:', this.currentItemType);

    // Use the currentItemType from the parent component
    this.selectedType = this.currentItemType;

    // Determine the type of current item
    if (this.currentItem.data && this.currentItem.data.dataset_id) {
      console.log('Configuring existing dataset');
      this.selectedId = String(this.currentItem.data.dataset_id);
      this.selectedVersion = this.currentItem.data.selected_version || '';
      this.populateDatasetFields(this.currentItem);
    } else if (this.currentItem.data && this.currentItem.data.modl_id) {
      console.log('Configuring existing model');
      this.selectedId = String(this.currentItem.data.modl_id);
      this.selectedVersion = this.currentItem.data.selected_version || '';
      this.populateModelFields(this.currentItem);
    } else if (this.currentItem.data && this.currentItem.data.metric_id) {
      console.log('Configuring existing metric');
      this.selectedId = String(this.currentItem.data.metric_id);
      this.selectedVersion = this.currentItem.data.selected_version || '';
      this.populateMetricFields(this.currentItem);
    } else {
      // New item - clear fields and enable dropdowns
      console.log('Configuring new item of type:', this.selectedType);
      this.selectedId = '';
      this.selectedVersion = '';
      this.versions = [];
      this.clearInfoFields();
    }

    this.updateVersions();
  }

  clearInfoFields() {
    console.log('Clearing info fields');
    this.itemName = '';
    this.itemDescription = '';
    this.itemAuthor = '';
    this.itemVisibility = '';
    this.itemUrl = '';
    this.itemTimestamp = '';
    
    // Clear hyperparameter section when switching items
    this.availableHyperparameters = [];
    this.hyperparameterSets = [];
    this.showHyperparameterSection = false;
    
    // Clear dataset file mapping section
    this.availableDatasetFiles = [];
    this.selectedDataFile = '';
    this.selectedGroundTruthFile = '';
    this.showDatasetFilesSection = false;
  }

  showPlaceholder() {
    this.selectedType = null;
    this.selectedId = '';
    this.selectedVersion = '';
    this.clearInfoFields();
    this.versions = [];
    
    // Clear hyperparameter section
    this.availableHyperparameters = [];
    this.hyperparameterSets = [];
    this.showHyperparameterSection = false;
    
    // Clear dataset file mapping section
    this.availableDatasetFiles = [];
    this.selectedDataFile = '';
    this.selectedGroundTruthFile = '';
    this.showDatasetFilesSection = false;
  }

  populateDatasetFields(item: any) {
    const data = item.data;
    if (data.dataset_id) {
      this.selectedId = String(data.dataset_id);
      
      // Get selected version or first version
      if (data.selected_version) {
        this.selectedVersion = String(data.selected_version);
      } else if (data.dataset_version_info_list && data.dataset_version_info_list.length > 0) {
        this.selectedVersion = String(data.dataset_version_info_list[0].version.version_number);
      }
      
      this.updateVersions();
      this.updateDatasetInfo();
    }
  }

  populateModelFields(item: any) {
    const data = item.data;
    if (data.modl_id) {
      this.selectedId = String(data.modl_id);
      
      // Get selected version or first version
      if (data.selected_version) {
        this.selectedVersion = String(data.selected_version);
      } else if (data.modl_version_info_list && data.modl_version_info_list.length > 0) {
        this.selectedVersion = String(data.modl_version_info_list[0].version.version_number);
      }
      
      this.updateVersions();
      this.updateModelInfo();
    }
  }

  populateMetricFields(item: any) {
    const data = item.data;
    if (data.metric_id) {
      this.selectedId = String(data.metric_id);
      
      // Get selected version or first version
      if (data.selected_version) {
        this.selectedVersion = String(data.selected_version);
      } else if (data.metric_version_info_list && data.metric_version_info_list.length > 0) {
        this.selectedVersion = String(data.metric_version_info_list[0].version.version_number);
      }
      
      this.updateVersions();
      this.updateMetricInfo();
    }
  }

  onIdSelect() {
    console.log('ID selected:', this.selectedId, 'Type:', this.selectedType);
    this.updateVersions();
    this.updateInfo();
  }

  onVersionSelect() {
    console.log('Version selected:', this.selectedVersion);
    this.updateInfo();
  }

  updateVersions() {
    if (!this.selectedId || !this.selectedType) {
      this.versions = [];
      return;
    }

    console.log('Updating versions for ID:', this.selectedId, 'Type:', this.selectedType);

    if (this.selectedType === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === this.selectedId);
      if (dataset && dataset.dataset_version_info_list) {
        this.versions = dataset.dataset_version_info_list.map((v: any) => String(v.version.version_number));
        this.versions.reverse();
        console.log('Dataset versions found:', this.versions);
      }
    } else if (this.selectedType === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
      if (model && model.modl_version_info_list) {
        this.versions = model.modl_version_info_list.map((v: any) => String(v.version.version_number));
        this.versions.reverse();
        console.log('Model versions found:', this.versions);
      }
    } else if (this.selectedType === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
      if (metric && metric.metric_version_info_list) {
        this.versions = metric.metric_version_info_list.map((v: any) => String(v.version.version_number));
        this.versions.reverse();
        console.log('Metric versions found:', this.versions);
      }
    }

    // Set first version if none selected
    if (this.versions.length > 0 && !this.selectedVersion) {
      this.selectedVersion = this.versions[0];
    }
    
    // Load hyperparameters after versions are updated
    this.loadHyperparameters();
  }

  updateInfo() {
    if (this.selectedType === 'dataset') {
      this.updateDatasetInfo();
    } else if (this.selectedType === 'model') {
      this.updateModelInfo();
    } else if (this.selectedType === 'metric') {
      this.updateMetricInfo();
    }
    
    // Load hyperparameters for models and metrics
    this.loadHyperparameters();
  }

  loadHyperparameters() {
    console.log('loadHyperparameters called');
    console.log('selectedId:', this.selectedId);
    console.log('selectedVersion:', this.selectedVersion);
    console.log('selectedType:', this.selectedType);
    
    this.availableHyperparameters = [];
    this.showHyperparameterSection = false;
    
    if (!this.selectedId || !this.selectedVersion) {
      console.log('Missing selectedId or selectedVersion, returning');
      return;
    }
    
    if (this.selectedType === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
      console.log('Found model:', model);
      if (model) {
        const versionInfo = model.modl_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        console.log('Found versionInfo:', versionInfo);
        if (versionInfo) {
          // Only check 'hyperparameters' field under version
          const hyperparameters = versionInfo.version.hyperparameters || [];
          console.log('Hyperparameters found:', hyperparameters);
          if (hyperparameters && hyperparameters.length > 0) {
            console.log('Setting hyperparameters:', hyperparameters);
            this.availableHyperparameters = hyperparameters;
            this.showHyperparameterSection = true;
          }
        }
      }
    } else if (this.selectedType === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
      console.log('Found metric:', metric);
      if (metric) {
        const versionInfo = metric.metric_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        console.log('Found versionInfo:', versionInfo);
        if (versionInfo) {
          // Only check 'hyperparameters' field under version
          const hyperparameters = versionInfo.version.hyperparameters || [];
          console.log('Hyperparameters found:', hyperparameters);
          if (hyperparameters && hyperparameters.length > 0) {
            console.log('Setting hyperparameters:', hyperparameters);
            this.availableHyperparameters = hyperparameters;
            this.showHyperparameterSection = true;
          }
        }
      }
    }
    
    console.log('showHyperparameterSection:', this.showHyperparameterSection);
    console.log('availableHyperparameters:', this.availableHyperparameters);
    console.log('availableHyperparameters structure:', this.availableHyperparameters);
    
    // Load existing hyperparameter sets from current item
    this.loadExistingHyperparameterSets();
  }

  loadExistingHyperparameterSets() {
    if (this.currentItem && this.currentItem.data && this.currentItem.data.hyperparameter_sets) {
      this.hyperparameterSets = [...this.currentItem.data.hyperparameter_sets];
    } else {
      this.hyperparameterSets = [];
    }
  }

  addHyperparameterSet() {
    const newSet = {
      id: Date.now(), // Simple ID generation
      parameters: {},
      collapsed: false
    };
    this.hyperparameterSets.push(newSet);
  }

  toggleHyperparameterSetCollapse(setId: number) {
    const set = this.hyperparameterSets.find(s => s.id === setId);
    if (set) {
      set.collapsed = !set.collapsed;
    }
  }

  removeHyperparameterSet(setId: number) {
    this.hyperparameterSets = this.hyperparameterSets.filter(set => set.id !== setId);
  }

  updateHyperparameterValue(setId: number, parameterName: string, value: string) {
    const set = this.hyperparameterSets.find(s => s.id === setId);
    if (set) {
      const param = this.availableHyperparameters.find(p => p.hyperparameter_name === parameterName);
      if (param) {
        set.parameters[parameterName] = {
          value: value,
          data_type: param.hyperparameter_data_type
        };
      }
    }
  }

  onHyperparameterInput(event: Event, setId: number, parameterName: string) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateHyperparameterValue(setId, parameterName, target.value);
    }
  }

  isDuplicateHyperparameter(setId: number, parameterName: string, value: string): boolean {
    return this.hyperparameterSets.some(set => 
      set.id !== setId && 
      set.parameters[parameterName] && 
      set.parameters[parameterName].value === value
    );
  }

  updateDatasetInfo() {
    const dataset = this.availableDatasets.find(d => String(d.dataset_id) === this.selectedId);
    if (dataset && this.selectedVersion) {
      const versionInfo = dataset.dataset_version_info_list.find(
        (v: any) => String(v.version.version_number) === this.selectedVersion
      );
      if (versionInfo) {
        this.itemName = versionInfo.dataset.dataset_name;
        this.itemDescription = versionInfo.description.description_text;
        this.itemAuthor = versionInfo.description.author;
        this.itemVisibility = versionInfo.metadata.visibility;
        this.itemUrl = versionInfo.metadata.url;
        this.itemTimestamp = versionInfo.metadata.upload_timestamp;
        
        // Load dataset files for mapping
        this.loadDatasetFiles(versionInfo);
      }
    }
  }

  loadDatasetFiles(versionInfo: any) {
    console.log('loadDatasetFiles called for dataset');
    this.availableDatasetFiles = [];
    this.showDatasetFilesSection = false;
    
    // Only show dataset file mapping section for dataset items
    if (this.selectedType !== 'dataset') {
      console.log('Not a dataset item, hiding file mapping section');
      return;
    }
    
    // Extract files from features - each feature has file_name and file_type
    if (versionInfo.version && versionInfo.version.features) {
      console.log('Extracting files from features...');
      const uniqueFiles = new Map<string, { filename: string, filetype: string }>();
      
      versionInfo.version.features.forEach((feature: any, index: number) => {
        if (feature.file_name && feature.file_type) {
          const key = `${feature.file_name}__${feature.file_type}`;
          uniqueFiles.set(key, {
            filename: feature.file_name,
            filetype: feature.file_type
          });
          console.log(`Found file: ${feature.file_name} (type: ${feature.file_type})`);
        }
      });
      
      this.availableDatasetFiles = Array.from(uniqueFiles.values());
      this.showDatasetFilesSection = this.availableDatasetFiles.length > 0;
      
      console.log(`Extracted ${this.availableDatasetFiles.length} unique files from features`);
      console.log('Available files:', this.availableDatasetFiles);
    } else {
      console.log('No version or features found in dataset');
    }
    
    console.log('Dataset file mapping section enabled:', this.showDatasetFilesSection);
    
    // Load existing file mappings if they exist
    this.loadExistingFileMappings();
  }

  loadExistingFileMappings() {
    // Reset selections
    this.selectedDataFile = '';
    this.selectedGroundTruthFile = '';
    
    // Load existing mappings if they exist in the current item
    if (this.currentItem && 
        this.currentItem.data && 
        this.currentItem.data.file_mappings) {
      this.selectedDataFile = this.currentItem.data.file_mappings.data || '';
      this.selectedGroundTruthFile = this.currentItem.data.file_mappings.ground_truth || '';
      console.log('Loaded existing file mappings:', {
        data: this.selectedDataFile,
        ground_truth: this.selectedGroundTruthFile
      });
    }
  }

  onDataFileSelect() {
    console.log('Data file selected:', this.selectedDataFile);
    // Note: File mappings are stored in component properties only
    // They will be persisted when user clicks Apply, similar to hyperparameters
  }

  onGroundTruthFileSelect() {
    console.log('Ground truth file selected:', this.selectedGroundTruthFile);
    // Note: File mappings are stored in component properties only  
    // They will be persisted when user clicks Apply, similar to hyperparameters
  }

  getFileDisplayName(file: { filename: string, filetype: string }): string {
    return `${file.filename} (${file.filetype})`;
  }

  getGenericFileName(filename: string): string {
    if (!filename) return '';
    
    // Find the selected file object to get its type
    const selectedFile = this.availableDatasetFiles.find(f => f.filename === filename);
    if (!selectedFile) return filename;
    
    // The file type from the API is already in generic format (file1, file2, etc.)
    return selectedFile.filetype;
  }

  updateModelInfo() {
    const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
    if (model && this.selectedVersion) {
      const versionInfo = model.modl_version_info_list.find(
        (v: any) => String(v.version.version_number) === this.selectedVersion
      );
      if (versionInfo) {
        this.itemName = versionInfo.modl.modl_name;
        this.itemDescription = versionInfo.description.description_text;
        this.itemAuthor = versionInfo.description.author;
        this.itemVisibility = versionInfo.metadata.visibility;
        this.itemUrl = versionInfo.metadata.url;
        this.itemTimestamp = versionInfo.metadata.upload_timestamp;
      }
    }
  }

  updateMetricInfo() {
    const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
    if (metric && this.selectedVersion) {
      const versionInfo = metric.metric_version_info_list.find(
        (v: any) => String(v.version.version_number) === this.selectedVersion
      );
      if (versionInfo) {
        this.itemName = versionInfo.metric.metric_name;
        this.itemDescription = versionInfo.description.description_text;
        this.itemAuthor = versionInfo.description.author;
        this.itemVisibility = versionInfo.metadata.visibility;
        this.itemUrl = versionInfo.metadata.url;
        this.itemTimestamp = versionInfo.metadata.upload_timestamp;
      }
    }
  }

  onApplyItem() {
    if (this.currentItem && this.selectedId && this.selectedVersion) {
      // Debug: log task id/version for model (and metric) when applying
      if (this.selectedType === 'model' && this.currentItem?.data) {
        const versionInfo = this.currentItem.data.modl_version_info_list?.find(
          (v: any) => String(v.version?.version_number) === String(this.selectedVersion)
        );
        const tasks = versionInfo?.version?.tasks ?? this.currentItem.data?.version?.tasks ?? [];
        console.debug('[Apply Model]', {
          modelId: this.selectedId,
          modelVersion: this.selectedVersion,
          taskType: tasks.map((t: any) => ({ id: t.task_id ?? t.id, version: t.version ?? t.version_number, name: t.task_name }))
        });
      }
      if (this.selectedType === 'metric' && this.currentItem?.data) {
        const versionInfo = this.currentItem.data.metric_version_info_list?.find(
          (v: any) => String(v.version?.version_number) === String(this.selectedVersion)
        );
        const tasks = versionInfo?.version?.tasks ?? this.currentItem.data?.version?.tasks ?? [];
        console.debug('[Apply Metric]', {
          metricId: this.selectedId,
          metricVersion: this.selectedVersion,
          taskType: tasks.map((t: any) => ({ id: t.task_id ?? t.id, version: t.version ?? t.version_number, name: t.task_name }))
        });
      }

      const applyData: any = {
        item: this.currentItem,
        type: this.selectedType,
        id: this.selectedId,
        version: this.selectedVersion,
        hyperparameterSets: this.hyperparameterSets
      };
      
      // Add file mappings for datasets (following hyperparameter pattern)
      if (this.selectedType === 'dataset' && this.showDatasetFilesSection) {
        applyData.fileMappings = {
          data: this.selectedDataFile,
          ground_truth: this.selectedGroundTruthFile,
          // Also store generic names for export
          generic_data: this.getGenericFileName(this.selectedDataFile),
          generic_ground_truth: this.getGenericFileName(this.selectedGroundTruthFile)
        };
        console.log('Including file mappings in apply data:', applyData.fileMappings);
      }
      
      this.applyItem.emit(applyData);
    }
  }

  onExportContext() {
    this.exportContext.emit();
  }

  onAddDataset() {
    this.addDataset.emit();
  }

  onAddModel() {
    this.addModel.emit();
  }

  onAddMetric() {
    this.addMetric.emit();
  }

  onRemoveItem() {
    this.removeItem.emit();
  }

  showExport() {
    this.showExportDialog = true;
  }

  hideExport() {
    this.showExportDialog = false;
  }

  doExport() {
    this.exportContext.emit();
    this.hideExport();
  }

  // Search functionality methods
  onSearchInput() {
    if (!this.searchQuery.trim()) {
      this.showSearchResults = false;
      this.searchResults = [];
      return;
    }

    this.searchResults = this.performSearch(this.searchQuery.trim());
    this.showSearchResults = this.searchResults.length > 0;
  }

  performSearch(query: string): any[] {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    // Search in datasets
    this.availableDatasets.forEach(dataset => {
      if (dataset.dataset_name && dataset.dataset_name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'dataset',
          id: dataset.dataset_id,
          name: dataset.dataset_name,
          description: dataset.dataset_version_info_list?.[0]?.dataset?.dataset_description || '',
          item: dataset
        });
      }
    });

    // Search in models
    this.availableModels.forEach(model => {
      if (model.modl_name && model.modl_name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'model',
          id: model.modl_id,
          name: model.modl_name,
          description: model.modl_version_info_list?.[0]?.modl?.modl_description || '',
          item: model
        });
      }
    });

    // Search in metrics
    this.availableMetrics.forEach(metric => {
      if (metric.metric_name && metric.metric_name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'metric',
          id: metric.metric_id,
          name: metric.metric_name,
          description: metric.metric_version_info_list?.[0]?.metric?.metric_description || '',
          item: metric
        });
      }
    });

    return results.slice(0, 10); // Limit to 10 results
  }

  onSearchResultSelect(result: any) {
    this.searchQuery = result.name;
    this.showSearchResults = false;
    
    // Set the type and ID automatically
    this.selectedType = result.type;
    this.selectedId = String(result.id);
    
    // Update versions and info
    this.updateVersions();
    
    // Set the first version if available
    if (this.versions.length > 0) {
      this.selectedVersion = this.versions[0];
    }
    
    // Update info and load hyperparameters
    this.updateInfo();
    
    // Check for duplicates
    const selectedVersion = this.versions.length > 0 ? this.versions[0] : '';
    if (this.isDuplicateItem(result.type, result.id, selectedVersion)) {
      const itemName = this.getItemName(result.type, result.id);
      alert(`Cannot add duplicate: ${itemName} (ID: ${result.id}, Version: ${selectedVersion}) already exists.`);
      return;
    }
    
    // Emit event to add item with pre-selected data
    this.addItemWithData.emit({
      type: result.type,
      item: result.item,
      selectedId: result.id,
      selectedVersion: selectedVersion
    });
  }

  isDuplicateItem(type: string, id: string, version: string): boolean {
    let items: any[];
    
    if (type === 'dataset') {
      items = this.currentDatasets;
    } else if (type === 'model') {
      items = this.currentModels;
    } else if (type === 'metric') {
      items = this.currentMetrics;
    } else {
      return false;
    }
    
    return items.some(item => {
      const itemId = this.getItemId(item, type);
      const itemVersion = item.data?.selected_version;
      return itemId === String(id) && itemVersion === version;
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

  getItemName(type: string, id: string): string {
    if (type === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === String(id));
      return dataset?.dataset_name || `Dataset ${id}`;
    } else if (type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === String(id));
      return model?.modl_name || `Model ${id}`;
    } else if (type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === String(id));
      return metric?.metric_name || `Metric ${id}`;
    }
    return `Item ${id}`;
  }

  clearSearch() {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.searchResults = [];
  }

  resetHyperparameterToDefault(setId: number, paramName: string) {
    const set = this.hyperparameterSets.find(s => s.id === setId);
    if (set) {
      const param = this.availableHyperparameters.find(p => p.hyperparameter_name === paramName);
      if (param) {
        set.parameters[paramName] = {
          value: param.hyperparameter_value,
          data_type: param.hyperparameter_data_type
        };
      }
    }
  }

  getParameterTooltip(param: any): string {
    let tooltip = param.hyperparameter_description || '';
    if (param.allowed_values && param.allowed_values.length > 0) {
      tooltip += `\nAllowed: [${param.allowed_values.join(', ')}]`;
    }
    return tooltip;
  }
} 