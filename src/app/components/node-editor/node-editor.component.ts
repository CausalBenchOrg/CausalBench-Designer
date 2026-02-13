import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { TokenService } from '../../services/token.service';

export interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  type: 'dataset' | 'processor' | 'model' | 'metric';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  data: any;
  inputPorts: NodePort[];
  outputPorts: NodePort[];
  selected: boolean;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

@Component({
  selector: 'app-node-editor',
  templateUrl: './node-editor.component.html',
  styleUrls: ['./node-editor.component.scss']
})
export class NodeEditorComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<SVGElement>;
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  
  // Canvas state
  canvasOffset = { x: 0, y: 0 };
  canvasScale = 1.0;
  isPanning = false;
  panStart = { x: 0, y: 0 };
  
  // Node interaction
  selectedNode: GraphNode | null = null;
  draggingNode: GraphNode | null = null;
  dragOffset = { x: 0, y: 0 };
  
  // Edge creation
  connectingPort: { nodeId: string; portId: string; type: 'input' | 'output' } | null = null;
  tempEdgeEnd: { x: number; y: number } | null = null;
  
  // Context menu
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  
  // Node creation menu
  showNodeMenu = false;
  nodeMenuPosition = { x: 0, y: 0 };
  
  // Detail panel
  showDetailPanel = false;
  detailNode: GraphNode | null = null;
  
  // Available items from API
  availableDatasets: any[] = [];
  availableModels: any[] = [];
  availableMetrics: any[] = [];
  loadingDatasets = false;
  loadingModels = false;
  loadingMetrics = false;
  
  // Detail panel form fields
  selectedId = '';
  selectedVersion = '';
  versions: string[] = [];
  itemName = '';
  itemDescription = '';
  itemAuthor = '';
  itemVisibility = '';
  itemUrl = '';
  itemTimestamp = '';
  
  // Dropdown options
  datasetOptions: { id: string, name: string }[] = [];
  modelOptions: { id: string, name: string }[] = [];
  metricOptions: { id: string, name: string }[] = [];
  
  // Dataset file mapping
  availableDatasetFiles: { filename: string, filetype: string }[] = [];
  selectedDataFile = '';
  selectedGroundTruthFile = '';
  
  // Hyperparameter management
  availableHyperparameters: any[] = [];
  hyperparameterSets: any[] = [];
  showHyperparameterSection = false;
  
  // Task selection
  tasks: string[] = [];
  selectedTaskId: string = '';
  selectedTaskVersion: string = '';
  taskVersions: string[] = [];
  loadingTasks = false;
  availableTasks: any[] = [];
  taskOptions: { id: string, name: string }[] = [];
  
  // Export dialog state
  showExportDialog = false;

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService
  ) { }

  ngOnInit() {
    this.updatePortPositions();
    this.loadAvailableData();
    this.loadTasks();
    // Initialize canvas with some default nodes for demonstration
    setTimeout(() => {
      this.updateCanvasSize();
      // Add some example nodes to demonstrate the Blueprints design
      this.addExampleNodes();
    }, 100);
  }

  loadTasks() {
    this.tokenService.token$.subscribe(token => {
      this.loadingTasks = true;
      this.apiService.getTasks(token).subscribe({
        next: (tasks: string[]) => {
          this.tasks = tasks;
          this.loadingTasks = false;
        },
        error: (error) => {
          console.error('Error fetching tasks:', error);
          this.loadingTasks = false;
        }
      });
    });
  }

  onTaskIdSelect() {
    this.selectedTaskVersion = '';
    this.taskVersions = [];
    // For now, tasks are just IDs. If your API provides versions, load them here
    // For example: this.loadTaskVersions(this.selectedTaskId);
  }

  onTaskVersionSelect() {
    // Handle task version selection if needed
    console.log('Task selected:', this.selectedTaskId, 'Version:', this.selectedTaskVersion);
  }

  loadAvailableData() {
    this.tokenService.token$.subscribe(token => {
      // Load available datasets
      this.loadingDatasets = true;
      this.apiService.getDatasets(token).subscribe({
        next: (data) => {
          this.availableDatasets = data;
          this.updateDropdownOptions();
          this.loadingDatasets = false;
        },
        error: (error) => {
          console.error('Error loading datasets:', error);
          this.loadingDatasets = false;
        }
      });
      
      // Load available models
      this.loadingModels = true;
      this.apiService.getModels(token).subscribe({
        next: (data) => {
          this.availableModels = data;
          this.updateDropdownOptions();
          this.loadingModels = false;
        },
        error: (error) => {
          console.error('Error loading models:', error);
          this.loadingModels = false;
        }
      });
      
      // Load available metrics
      this.loadingMetrics = true;
      this.apiService.getMetrics(token).subscribe({
        next: (data) => {
          this.availableMetrics = data;
          this.updateDropdownOptions();
          this.loadingMetrics = false;
        },
        error: (error) => {
          console.error('Error loading metrics:', error);
          this.loadingMetrics = false;
        }
      });
    });
  }

  updateDropdownOptions() {
    this.datasetOptions = this.getUniqueOptions(this.availableDatasets, 'dataset_id', 'dataset_name');
    this.modelOptions = this.getUniqueOptions(this.availableModels, 'modl_id', 'modl_name');
    this.metricOptions = this.getUniqueOptions(this.availableMetrics, 'metric_id', 'metric_name');
  }

  getUniqueOptions(items: any[], idField: string, nameField: string): { id: string, name: string }[] {
    const uniqueItems = items.reduce((acc: any[], item: any) => {
      const id = String(item[idField]);
      if (!acc.find((existing: { id: string, name: string }) => existing.id === id)) {
        acc.push({
          id,
          name: item[nameField] || `Item ${id}`
        });
      }
      return acc;
    }, []);
    
    return uniqueItems.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }

  addExampleNodes() {
    // Add example nodes to show the Blueprints-style workflow
    const centerX = 400;
    const centerY = 300;
    
    // Dataset node
    this.createNode('dataset', centerX - 300, centerY - 50);
    
    // Preprocessing node
    this.createNode('processor', centerX - 100, centerY - 50);
    
    // Model node
    this.createNode('model', centerX + 100, centerY - 50);
    
    // Metric node
    this.createNode('metric', centerX + 300, centerY - 50);
    
    // Auto-connect them to show the flow
    setTimeout(() => {
      if (this.nodes.length >= 4) {
        // Connect dataset -> preprocessing
        this.createEdge(this.nodes[0].id, this.nodes[0].outputPorts[0].id, 
                       this.nodes[1].id, this.nodes[1].inputPorts[0].id);
        // Connect preprocessing -> model
        this.createEdge(this.nodes[1].id, this.nodes[1].outputPorts[0].id,
                       this.nodes[2].id, this.nodes[2].inputPorts[0].id);
        // Connect model -> metric
        this.createEdge(this.nodes[2].id, this.nodes[2].outputPorts[0].id,
                       this.nodes[3].id, this.nodes[3].inputPorts[0].id);
      }
    }, 200);
  }

  updateCanvasSize() {
    if (this.containerRef && this.canvasRef) {
      const container = this.containerRef.nativeElement;
      const svg = this.canvasRef.nativeElement;
      svg.setAttribute('width', container.clientWidth.toString());
      svg.setAttribute('height', container.clientHeight.toString());
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updateCanvasSize();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      const deltaX = event.clientX - this.panStart.x;
      const deltaY = event.clientY - this.panStart.y;
      this.canvasOffset.x += deltaX;
      this.canvasOffset.y += deltaY;
      this.panStart = { x: event.clientX, y: event.clientY };
    }
    
    if (this.draggingNode) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.canvasOffset.x) / this.canvasScale;
      const y = (event.clientY - rect.top - this.canvasOffset.y) / this.canvasScale;
      this.draggingNode.x = x - this.dragOffset.x;
      this.draggingNode.y = y - this.dragOffset.y;
      this.updatePortPositions();
    }
    
    if (this.tempEdgeEnd) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      this.tempEdgeEnd.x = (event.clientX - rect.left - this.canvasOffset.x) / this.canvasScale;
      this.tempEdgeEnd.y = (event.clientY - rect.top - this.canvasOffset.y) / this.canvasScale;
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.isPanning = false;
    this.draggingNode = null;
  }

  @HostListener('click', ['$event'])
  onCanvasClick(event: MouseEvent) {
    if (event.target === this.containerRef.nativeElement || 
        (event.target as Element).tagName === 'svg') {
      this.selectedNode = null;
      this.connectingPort = null;
      this.tempEdgeEnd = null;
      this.contextMenuVisible = false;
    }
  }

  onCanvasMouseDown(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
      // Middle mouse or Ctrl+Left mouse for panning
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }

  onCanvasWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    this.canvasScale = Math.max(0.1, Math.min(3.0, this.canvasScale * delta));
  }

  private lastClickTime = 0;
  private lastClickedNode: GraphNode | null = null;

  onNodeMouseDown(event: MouseEvent, node: GraphNode) {
    event.stopPropagation();
    this.selectedNode = node;
    
    // Handle double-click
    const currentTime = Date.now();
    if (this.lastClickedNode === node && (currentTime - this.lastClickTime) < 300) {
      // Double-click detected
      this.openDetailPanel(node);
      this.lastClickTime = 0;
      this.lastClickedNode = null;
      return;
    }
    
    this.lastClickTime = currentTime;
    this.lastClickedNode = node;
    
    // Start dragging
    this.draggingNode = node;
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const nodeX = (node.x * this.canvasScale) + this.canvasOffset.x;
    const nodeY = (node.y * this.canvasScale) + this.canvasOffset.y;
    this.dragOffset.x = (event.clientX - rect.left - nodeX) / this.canvasScale;
    this.dragOffset.y = (event.clientY - rect.top - nodeY) / this.canvasScale;
  }

  openDetailPanel(node: GraphNode) {
    this.detailNode = node;
    this.showDetailPanel = true;
    this.loadNodeDetails(node);
  }

  closeDetailPanel() {
    this.showDetailPanel = false;
    this.detailNode = null;
  }

  loadNodeDetails(node: GraphNode) {
    // Reset form
    this.selectedId = '';
    this.selectedVersion = '';
    this.versions = [];
    this.clearInfoFields();
    
    // Check if node already has data configured
    if (node.data && Object.keys(node.data).length > 0) {
      if (node.type === 'dataset' && node.data.dataset_id) {
        this.selectedId = String(node.data.dataset_id);
        this.selectedVersion = node.data.selected_version || '';
        this.populateDatasetFields(node.data);
      } else if (node.type === 'model' && node.data.modl_id) {
        this.selectedId = String(node.data.modl_id);
        this.selectedVersion = node.data.selected_version || '';
        this.populateModelFields(node.data);
        this.loadHyperparameters();
      } else if (node.type === 'metric' && node.data.metric_id) {
        this.selectedId = String(node.data.metric_id);
        this.selectedVersion = node.data.selected_version || '';
        this.populateMetricFields(node.data);
        this.loadHyperparameters();
      } else if (node.type === 'processor' && node.data.processor_id) {
        // Handle processor if it has similar structure
        this.selectedId = String(node.data.processor_id);
        this.selectedVersion = node.data.selected_version || '';
      }
    }
    
    this.updateVersions();
  }

  clearInfoFields() {
    this.itemName = '';
    this.itemDescription = '';
    this.itemAuthor = '';
    this.itemVisibility = '';
    this.itemUrl = '';
    this.itemTimestamp = '';
    this.selectedDataFile = '';
    this.selectedGroundTruthFile = '';
    this.hyperparameterSets = [];
    this.availableHyperparameters = [];
    this.showHyperparameterSection = false;
  }

  populateDatasetFields(data: any) {
    const dataset = this.availableDatasets.find(d => String(d.dataset_id) === String(data.dataset_id));
    if (dataset) {
      this.itemName = dataset.dataset_name || '';
      this.itemDescription = dataset.dataset_description || '';
      this.itemAuthor = dataset.uploader || '';
      this.itemVisibility = dataset.visibility || '';
      this.itemUrl = dataset.url || '';
      this.itemTimestamp = dataset.timestamp || '';
      
      // Load dataset files
      if (this.selectedVersion && dataset.dataset_version_info_list) {
        const versionInfo = dataset.dataset_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        if (versionInfo && versionInfo.files) {
          this.availableDatasetFiles = versionInfo.files.map((f: any) => ({
            filename: f.filename,
            filetype: f.filetype
          }));
        }
      }
      
      // Load file mappings if they exist
      if (data.file_mappings) {
        this.selectedDataFile = data.file_mappings.data_file || '';
        this.selectedGroundTruthFile = data.file_mappings.ground_truth_file || '';
      }
    }
  }

  populateModelFields(data: any) {
    const model = this.availableModels.find(m => String(m.modl_id) === String(data.modl_id));
    if (model) {
      this.itemName = model.modl_name || '';
      this.itemDescription = model.modl_description || '';
      this.itemAuthor = model.uploader || '';
      this.itemVisibility = model.visibility || '';
      this.itemUrl = model.url || '';
      this.itemTimestamp = model.timestamp || '';
      
      // Load hyperparameters
      if (this.selectedVersion && model.modl_version_info_list) {
        const versionInfo = model.modl_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        if (versionInfo) {
          const hyperparameters = versionInfo.version?.hyperparameters || [];
          if (hyperparameters && hyperparameters.length > 0) {
            this.availableHyperparameters = hyperparameters;
            this.showHyperparameterSection = true;
          } else {
            this.availableHyperparameters = [];
            this.showHyperparameterSection = false;
          }
        }
      }
      
      // Load hyperparameter sets if they exist
      if (data.hyperparameter_sets) {
        this.hyperparameterSets = data.hyperparameter_sets.map((set: any, index: number) => ({
          ...set,
          id: set.id || Date.now() + index,
          collapsed: false
        }));
      } else {
        this.hyperparameterSets = [];
      }
    }
  }

  populateMetricFields(data: any) {
    const metric = this.availableMetrics.find(m => String(m.metric_id) === String(data.metric_id));
    if (metric) {
      this.itemName = metric.metric_name || '';
      this.itemDescription = metric.metric_description || '';
      this.itemAuthor = metric.uploader || '';
      this.itemVisibility = metric.visibility || '';
      this.itemUrl = metric.url || '';
      this.itemTimestamp = metric.timestamp || '';
      
      // Load hyperparameters
      if (this.selectedVersion && metric.metric_version_info_list) {
        const versionInfo = metric.metric_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        if (versionInfo) {
          const hyperparameters = versionInfo.version?.hyperparameters || [];
          if (hyperparameters && hyperparameters.length > 0) {
            this.availableHyperparameters = hyperparameters;
            this.showHyperparameterSection = true;
          } else {
            this.availableHyperparameters = [];
            this.showHyperparameterSection = false;
          }
        }
      }
      
      // Load hyperparameter sets if they exist
      if (data.hyperparameter_sets) {
        this.hyperparameterSets = data.hyperparameter_sets.map((set: any, index: number) => ({
          ...set,
          id: set.id || Date.now() + index,
          collapsed: false
        }));
      } else {
        this.hyperparameterSets = [];
      }
    }
  }

  onIdSelect() {
    this.selectedVersion = '';
    this.versions = [];
    this.clearInfoFields();
    this.updateVersions();
  }

  onVersionSelect() {
    if (!this.detailNode) return;
    
    if (this.detailNode.type === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === this.selectedId);
      if (dataset && this.selectedVersion) {
        this.populateDatasetFields({ ...dataset, selected_version: this.selectedVersion });
      }
    } else if (this.detailNode.type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
      if (model && this.selectedVersion) {
        this.populateModelFields({ ...model, selected_version: this.selectedVersion });
        this.loadHyperparameters();
      }
    } else if (this.detailNode.type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
      if (metric && this.selectedVersion) {
        this.populateMetricFields({ ...metric, selected_version: this.selectedVersion });
        this.loadHyperparameters();
      }
    }
  }

  loadHyperparameters() {
    this.availableHyperparameters = [];
    this.showHyperparameterSection = false;
    
    if (!this.selectedId || !this.selectedVersion || !this.detailNode) {
      return;
    }
    
    if (this.detailNode.type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
      if (model) {
        const versionInfo = model.modl_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        if (versionInfo) {
          const hyperparameters = versionInfo.version?.hyperparameters || [];
          if (hyperparameters && hyperparameters.length > 0) {
            this.availableHyperparameters = hyperparameters;
            this.showHyperparameterSection = true;
          }
        }
      }
    } else if (this.detailNode.type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
      if (metric) {
        const versionInfo = metric.metric_version_info_list.find(
          (v: any) => String(v.version.version_number) === this.selectedVersion
        );
        if (versionInfo) {
          const hyperparameters = versionInfo.version?.hyperparameters || [];
          if (hyperparameters && hyperparameters.length > 0) {
            this.availableHyperparameters = hyperparameters;
            this.showHyperparameterSection = true;
          }
        }
      }
    }
    
    // Load existing hyperparameter sets
    this.loadExistingHyperparameterSets();
  }

  loadExistingHyperparameterSets() {
    if (this.detailNode && this.detailNode.data && this.detailNode.data.hyperparameter_sets) {
      this.hyperparameterSets = this.detailNode.data.hyperparameter_sets.map((set: any, index: number) => ({
        ...set,
        id: set.id || Date.now() + index,
        collapsed: false
      }));
    } else {
      this.hyperparameterSets = [];
    }
  }

  addHyperparameterSet() {
    const newSet = {
      id: Date.now(),
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

  resetHyperparameterToDefault(setId: number, paramName: string) {
    const set = this.hyperparameterSets.find(s => s.id === setId);
    const param = this.availableHyperparameters.find(p => p.hyperparameter_name === paramName);
    
    if (set && param) {
      // Reset to default value from parameter definition
      if (set.parameters[paramName]) {
        set.parameters[paramName].value = param.hyperparameter_value || '';
      } else {
        set.parameters[paramName] = {
          value: param.hyperparameter_value || '',
          data_type: param.hyperparameter_data_type
        };
      }
    }
  }

  getParameterTooltip(param: any): string {
    let tooltip = param.hyperparameter_description || '';
    if (param.allowed_values && param.allowed_values.length > 0) {
      tooltip += ` Allowed values: ${param.allowed_values.join(', ')}`;
    }
    return tooltip;
  }

  updateVersions() {
    if (!this.selectedId || !this.detailNode) {
      this.versions = [];
      return;
    }
    
    let versionList: any[] = [];
    
    if (this.detailNode.type === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === this.selectedId);
      if (dataset && dataset.dataset_version_info_list) {
        versionList = dataset.dataset_version_info_list.map((v: any) => String(v.version.version_number));
      }
    } else if (this.detailNode.type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
      if (model && model.modl_version_info_list) {
        versionList = model.modl_version_info_list.map((v: any) => String(v.version.version_number));
      }
    } else if (this.detailNode.type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
      if (metric && metric.metric_version_info_list) {
        versionList = metric.metric_version_info_list.map((v: any) => String(v.version.version_number));
      }
    }
    
    this.versions = versionList.sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return numB - numA; // Descending order
    });
  }

  onApplyConfiguration() {
    if (!this.detailNode || !this.selectedId || !this.selectedVersion) {
      alert('Please select an ID and Version');
      return;
    }
    
    let itemData: any = {};
    
    if (this.detailNode.type === 'dataset') {
      const dataset = this.availableDatasets.find(d => String(d.dataset_id) === this.selectedId);
      if (dataset) {
        itemData = { ...dataset };
        itemData.selected_version = this.selectedVersion;
        if (this.selectedDataFile || this.selectedGroundTruthFile) {
          itemData.file_mappings = {
            data_file: this.selectedDataFile,
            ground_truth_file: this.selectedGroundTruthFile
          };
        }
      }
    } else if (this.detailNode.type === 'model') {
      const model = this.availableModels.find(m => String(m.modl_id) === this.selectedId);
      if (model) {
        itemData = { ...model };
        itemData.selected_version = this.selectedVersion;
        if (this.hyperparameterSets.length > 0) {
          itemData.hyperparameter_sets = this.hyperparameterSets;
        }
      }
    } else if (this.detailNode.type === 'metric') {
      const metric = this.availableMetrics.find(m => String(m.metric_id) === this.selectedId);
      if (metric) {
        itemData = { ...metric };
        itemData.selected_version = this.selectedVersion;
        if (this.hyperparameterSets.length > 0) {
          itemData.hyperparameter_sets = this.hyperparameterSets;
        }
      }
    }
    
      // Update node data
    this.detailNode.data = itemData;
    
    // Save hyperparameter sets if they exist
    if (this.hyperparameterSets.length > 0) {
      this.detailNode.data.hyperparameter_sets = this.hyperparameterSets;
    }
    
    // Update node title to show configured name and version
    let newTitle = '';
    if (itemData.dataset_name) {
      newTitle = itemData.dataset_name;
    } else if (itemData.modl_name) {
      newTitle = itemData.modl_name;
    } else if (itemData.metric_name) {
      newTitle = itemData.metric_name;
    }
    
    if (newTitle && this.selectedVersion) {
      this.detailNode.title = `${newTitle} (v${this.selectedVersion})`;
    } else if (newTitle) {
      this.detailNode.title = newTitle;
    }
    
    this.closeDetailPanel();
  }

  getNodeTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'dataset': 'Dataset',
      'processor': 'Processor',
      'model': 'Model',
      'metric': 'Metric'
    };
    return labels[type] || type;
  }

  getProcessorLabel(node: GraphNode): string {
    if (node.type !== 'processor') return '';
    const hasModelInput = this.edges.some(edge => {
      if (edge.targetNodeId === node.id) {
        const sourceNode = this.nodes.find(n => n.id === edge.sourceNodeId);
        return sourceNode && sourceNode.type === 'model';
      }
      return false;
    });
    const hasDatasetInput = this.edges.some(edge => {
      if (edge.targetNodeId === node.id) {
        const sourceNode = this.nodes.find(n => n.id === edge.sourceNodeId);
        return sourceNode && sourceNode.type === 'dataset';
      }
      return false;
    });
    const hasModelOutput = this.edges.some(edge => {
      if (edge.sourceNodeId === node.id) {
        const targetNode = this.nodes.find(n => n.id === edge.targetNodeId);
        return targetNode && targetNode.type === 'model';
      }
      return false;
    });
    if (hasModelInput) return 'Model Output Processor';
    if (hasDatasetInput && hasModelOutput) return 'Data Processor';
    return 'Processor';
  }

  onExportContext() {
    this.showExportDialog = true;
  }

  onCloseExportDialog() {
    this.showExportDialog = false;
  }

  // Convert nodes to the format expected by export dialog
  getExportDatasets(): any[] {
    return this.nodes
      .filter(node => node.type === 'dataset' && node.data && node.data.dataset_id && node.data.selected_version)
      .map(node => ({
        data: node.data,
        isSelected: false
      }));
  }

  getExportModels(): any[] {
    return this.nodes
      .filter(node => node.type === 'model' && node.data && node.data.modl_id && node.data.selected_version)
      .map(node => ({
        data: node.data,
        isSelected: false
      }));
  }

  getExportMetrics(): any[] {
    return this.nodes
      .filter(node => node.type === 'metric' && node.data && node.data.metric_id && node.data.selected_version)
      .map(node => ({
        data: node.data,
        isSelected: false
      }));
  }

  getNodeDisplayTitle(node: GraphNode): string {
    // Processor: show context label (Data Processor / Model Output Processor) and optional name
    if (node.type === 'processor') {
      const label = this.getProcessorLabel(node);
      if (node.data && node.data.processor_name) {
        return `${label}: ${node.data.processor_name}`;
      }
      return label;
    }
    // If node has configured data with a name, show it
    if (node.data) {
      if (node.data.dataset_name) {
        return node.data.dataset_name;
      } else if (node.data.modl_name) {
        return node.data.modl_name;
      } else if (node.data.metric_name) {
        return node.data.metric_name;
      }
    }
    // Otherwise show the default title
    return node.title;
  }

  onPortMouseDown(event: MouseEvent, node: GraphNode, port: NodePort) {
    event.stopPropagation();
    
    if (this.connectingPort) {
      // Complete connection - validate connection rules
      if (this.connectingPort.type !== port.type && 
          this.connectingPort.nodeId !== node.id) {
        
        // Get source and target nodes
        const sourceNode = this.nodes.find(n => n.id === this.connectingPort!.nodeId);
        const targetNode = node;
        
        if (sourceNode && this.isValidConnection(sourceNode, targetNode)) {
          if (port.type === 'input') {
            this.createEdge(
              this.connectingPort.nodeId,
              this.connectingPort.portId,
              node.id,
              port.id
            );
          } else {
            this.createEdge(
              node.id,
              port.id,
              this.connectingPort.nodeId,
              this.connectingPort.portId
            );
          }
        } else {
          alert(`Invalid connection: ${this.getNodeTypeLabel(sourceNode!.type)} cannot connect to ${this.getNodeTypeLabel(targetNode.type)}`);
        }
      }
      this.connectingPort = null;
      this.tempEdgeEnd = null;
    } else {
      // Start connection
      this.connectingPort = {
        nodeId: node.id,
        portId: port.id,
        type: port.type
      };
      this.tempEdgeEnd = { x: port.x, y: port.y };
    }
  }

  isValidConnection(sourceNode: GraphNode, targetNode: GraphNode): boolean {
    const sourceType = sourceNode.type;
    const targetType = targetNode.type;
    
    // Connection rules:
    // Dataset -> Processor, Model
    // Model -> Processor, Metric
    // Processor -> Processor, Model, Metric
    
    if (sourceType === 'dataset') {
      return targetType === 'processor' || targetType === 'model';
    }
    
    if (sourceType === 'model') {
      return targetType === 'processor' || targetType === 'metric';
    }
    
    if (sourceType === 'processor') {
      return targetType === 'processor' || targetType === 'model' || targetType === 'metric';
    }
    
    // Metric cannot be a source; Processor cannot connect to Dataset
    return false;
  }

  onCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    this.nodeMenuPosition = {
      x: event.clientX,
      y: event.clientY
    };
    // Store the canvas position for node creation
    this.contextMenuCanvasPos = {
      x: (event.clientX - rect.left - this.canvasOffset.x) / this.canvasScale,
      y: (event.clientY - rect.top - this.canvasOffset.y) / this.canvasScale
    };
    this.showNodeMenu = true;
  }
  
  contextMenuCanvasPos = { x: 0, y: 0 };

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showNodeMenu) {
      const menu = (event.target as Element).closest('.context-menu');
      if (!menu) {
        this.showNodeMenu = false;
      }
    }
  }

  createNode(type: 'dataset' | 'processor' | 'model' | 'metric', x?: number, y?: number) {
    let nodeX: number;
    let nodeY: number;
    
    if (x !== undefined && y !== undefined) {
      nodeX = x;
      nodeY = y;
    } else if (this.showNodeMenu && this.contextMenuCanvasPos) {
      // Use context menu position
      nodeX = this.contextMenuCanvasPos.x - 100;
      nodeY = this.contextMenuCanvasPos.y - 50;
    } else {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      const centerX = (rect.width / 2 - this.canvasOffset.x) / this.canvasScale;
      const centerY = (rect.height / 2 - this.canvasOffset.y) / this.canvasScale;
      nodeX = centerX - 100;
      nodeY = centerY - 50;
    }
    
    const nodeId = `node-${Date.now()}`;
    const node: GraphNode = {
      id: nodeId,
      type: type,
      x: nodeX,
      y: nodeY,
      width: 200,
      height: 140, // Increased height to accommodate subtitle and hyperparameter info
      title: this.getNodeTitle(type),
      data: {},
      inputPorts: this.getInputPorts(type),
      outputPorts: this.getOutputPorts(type),
      selected: false
    };
    
    this.nodes.push(node);
    this.updatePortPositions();
    this.showNodeMenu = false;
    this.selectedNode = node;
  }

  getNodeTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'dataset': 'Dataset',
      'processor': 'Processor',
      'model': 'Model',
      'metric': 'Metric'
    };
    return titles[type] || 'Node';
  }

  getInputPorts(type: string): NodePort[] {
    const ports: { [key: string]: NodePort[] } = {
      'dataset': [],
      'processor': [{ id: 'input-1', name: 'Input', type: 'input', x: 0, y: 0 }],
      'model': [{ id: 'input-1', name: 'Input', type: 'input', x: 0, y: 0 }],
      'metric': [{ id: 'input-1', name: 'Input', type: 'input', x: 0, y: 0 }]
    };
    return ports[type] || [];
  }

  getOutputPorts(type: string): NodePort[] {
    const ports: { [key: string]: NodePort[] } = {
      'dataset': [{ id: 'output-1', name: 'Output', type: 'output', x: 0, y: 0 }],
      'processor': [{ id: 'output-1', name: 'Output', type: 'output', x: 0, y: 0 }],
      'model': [{ id: 'output-1', name: 'Output', type: 'output', x: 0, y: 0 }],
      'metric': []
    };
    return ports[type] || [];
  }

  updatePortPositions() {
    this.nodes.forEach(node => {
      const portSpacing = 30;
      let inputY = node.y + 20;
      let outputY = node.y + 20;
      
      node.inputPorts.forEach((port, index) => {
        port.x = node.x;
        port.y = inputY + (index * portSpacing);
      });
      
      node.outputPorts.forEach((port, index) => {
        port.x = node.x + node.width;
        port.y = outputY + (index * portSpacing);
      });
    });
  }

  createEdge(sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) {
    // Check if edge already exists
    const exists = this.edges.some(edge =>
      edge.sourceNodeId === sourceNodeId &&
      edge.sourcePortId === sourcePortId &&
      edge.targetNodeId === targetNodeId &&
      edge.targetPortId === targetPortId
    );
    
    if (!exists) {
      const edge: GraphEdge = {
        id: `edge-${Date.now()}`,
        sourceNodeId,
        sourcePortId,
        targetNodeId,
        targetPortId
      };
      this.edges.push(edge);
    }
  }

  deleteNode(node: GraphNode) {
    // Remove all edges connected to this node
    this.edges = this.edges.filter(edge =>
      edge.sourceNodeId !== node.id && edge.targetNodeId !== node.id
    );
    
    // Remove the node
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.selectedNode = null;
  }

  deleteEdge(edge: GraphEdge) {
    this.edges = this.edges.filter(e => e.id !== edge.id);
  }

  getNodeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'dataset': '#9b59b6',
      'processor': '#e67e22',
      'model': '#3498db',
      'metric': '#2ecc71'
    };
    return colors[type] || '#95a5a6';
  }

  getEdgePath(edge: GraphEdge): string {
    const sourceNode = this.nodes.find(n => n.id === edge.sourceNodeId);
    const targetNode = this.nodes.find(n => n.id === edge.targetNodeId);
    
    if (!sourceNode || !targetNode) return '';
    
    const sourcePort = sourceNode.outputPorts.find(p => p.id === edge.sourcePortId);
    const targetPort = targetNode.inputPorts.find(p => p.id === edge.targetPortId);
    
    if (!sourcePort || !targetPort) return '';
    
    const x1 = (sourcePort.x * this.canvasScale) + this.canvasOffset.x;
    const y1 = (sourcePort.y * this.canvasScale) + this.canvasOffset.y;
    const x2 = (targetPort.x * this.canvasScale) + this.canvasOffset.x;
    const y2 = (targetPort.y * this.canvasScale) + this.canvasOffset.y;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 150);
    
    return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
  }

  getTempEdgePath(): string {
    if (!this.connectingPort || !this.tempEdgeEnd) return '';
    
    const node = this.nodes.find(n => n.id === this.connectingPort!.nodeId);
    if (!node) return '';
    
    const port = node[this.connectingPort.type === 'input' ? 'inputPorts' : 'outputPorts']
      .find(p => p.id === this.connectingPort!.portId);
    if (!port) return '';
    
    const x1 = (port.x * this.canvasScale) + this.canvasOffset.x;
    const y1 = (port.y * this.canvasScale) + this.canvasOffset.y;
    const x2 = (this.tempEdgeEnd.x * this.canvasScale) + this.canvasOffset.x;
    const y2 = (this.tempEdgeEnd.y * this.canvasScale) + this.canvasOffset.y;
    
    const dx = x2 - x1;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 150);
    
    return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
  }

  getPortPosition(port: NodePort): { x: number; y: number } {
    return {
      x: (port.x * this.canvasScale) + this.canvasOffset.x,
      y: (port.y * this.canvasScale) + this.canvasOffset.y
    };
  }
}

