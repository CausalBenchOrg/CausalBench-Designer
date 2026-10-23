import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Configuration, Descriptor, Entry, Parameter, Value, clone, compatibility, datasetInputs, isValue, newConfiguration, valueError } from '../../domain/context';

@Component({ selector: 'app-sidebar', templateUrl: './sidebar.component.html', styleUrls: ['./sidebar.component.scss'] })
export class SidebarComponent implements OnChanges {
  @Input({ required: true }) entry!: Entry;
  @Input() task: Descriptor | null = null;
  @Output() applyEntry = new EventEmitter<Entry>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() removeEntry = new EventEmitter<Entry>();
  @Output() editMetadata = new EventEmitter<Descriptor>();
  working!: Entry;
  raw: Record<string, string> = {};
  errors: Record<string, string> = {};
  ngOnChanges(changes?: SimpleChanges) {
    if (changes && !changes['entry'] && this.working) return;
    this.working = clone(this.entry);
    this.raw = {}; this.errors = {};
    for (const config of this.working.configurations)
      for (const [name, value] of Object.entries(config.overrides)) this.raw[this.fieldKey(config, name)] = this.editText(value, this.working.descriptor.parameters?.[name]);
  }
  get inputs() { return this.task?.contract ? Object.entries(datasetInputs(this.task.contract)).map(([name, type]) => ({ name, type })) : []; }
  get parameters() { return Object.entries(this.working.descriptor.parameters ?? {}).map(([name, declaration]) => ({ name, declaration })); }
  trackName(index: number, row: { name: string }) { return row.name; }
  trackConfiguration(index: number, configuration: Configuration) { return configuration.id; }
  get match() { return compatibility(this.working.descriptor, this.task); }
  get hasErrors() { return Object.keys(this.errors).length > 0; }
  fieldKey(config: Configuration, name: string) { return `${config.id}:${name}`; }
  hasOverride(config: Configuration, name: string) { return Object.hasOwn(config.overrides, name); }
  isNull(config: Configuration, name: string) { return this.hasOverride(config, name) && config.overrides[name] === null; }
  controlType(parameter: Parameter): 'text' | 'number' | 'boolean' | 'json' {
    if (['str', 'string'].includes(parameter.data)) return 'text';
    if (['int', 'integer', 'decimal', 'float', 'number'].includes(parameter.data)) return 'number';
    if (['bool', 'boolean'].includes(parameter.data)) return 'boolean';
    return 'json';
  }
  defaultLabel(parameter: Parameter) { return Object.hasOwn(parameter, 'value') ? JSON.stringify(parameter.value) : 'unavailable'; }
  editText(value: Value, parameter?: Parameter) { return parameter && this.controlType(parameter) === 'text' && typeof value === 'string' ? value : JSON.stringify(value); }
  initialValue(parameter: Parameter): Value {
    const type = this.controlType(parameter);
    if (type === 'text') return '';
    if (type === 'number') return 0;
    if (type === 'boolean') return false;
    return ['array', 'list'].includes(parameter.data) ? [] : {};
  }
  toggleOverride(config: Configuration, name: string, parameter: Parameter) {
    const key = this.fieldKey(config, name);
    if (this.hasOverride(config, name)) {
      const { [name]: removed, ...rest } = config.overrides;
      config.overrides = rest;
      delete this.errors[key]; delete this.raw[key];
    } else {
      const value = Object.hasOwn(parameter, 'value') ? clone(parameter.value!) : this.initialValue(parameter);
      config.overrides = { ...config.overrides, [name]: value };
      this.raw[key] = this.editText(value, parameter);
    }
  }
  toggleNull(config: Configuration, name: string, parameter: Parameter) {
    const value = this.isNull(config, name) ? this.initialValue(parameter) : null;
    config.overrides = { ...config.overrides, [name]: value };
    this.raw[this.fieldKey(config, name)] = this.editText(value, parameter);
    delete this.errors[this.fieldKey(config, name)];
  }
  setMapping(name: string, alias: string) { this.working.mapping = { ...this.working.mapping, [name]: alias }; }
  removeMapping(name: string) { const { [name]: removed, ...rest } = this.working.mapping; this.working.mapping = rest; }
  get staleMappings() { const names = new Set(this.inputs.map(i => i.name)); return Object.keys(this.working.mapping).filter(k => !names.has(k)); }
  missingAlias(name: string) { const alias = this.working.mapping[name]; return !!alias && !this.working.descriptor.files?.some(file => file.alias === alias); }
  setSavedOverride(config: Configuration, name: string, raw: string) {
    const key = this.fieldKey(config, name); this.raw[key] = raw;
    try {
      const value = JSON.parse(raw);
      if (!isValue(value)) throw new Error('Use a finite JSON value.');
      config.overrides = { ...config.overrides, [name]: value }; delete this.errors[key];
    } catch { this.errors[key] = 'Enter valid JSON, including quotes around text values.'; }
  }
  setValue(config: Configuration, name: string, parameter: Parameter, raw: string | boolean) {
    const key = this.fieldKey(config, name);
    this.raw[key] = String(raw);
    try {
      const type = this.controlType(parameter);
      const value: Value = type === 'text' ? String(raw) : type === 'boolean' ? Boolean(raw) : JSON.parse(String(raw));
      const error = valueError(value, parameter.data);
      if (error) throw new Error(error);
      config.overrides = { ...config.overrides, [name]: value };
      delete this.errors[key];
    } catch (error) { this.errors[key] = error instanceof SyntaxError ? 'Enter a valid JSON number, array, or object.' : error instanceof Error ? error.message : 'Invalid value.'; }
  }
  unknownOverrides(config: Configuration) { return Object.keys(config.overrides).filter(name => !Object.hasOwn(this.working.descriptor.parameters ?? {}, name)); }
  removeOverride(config: Configuration, name: string) {
    const { [name]: removed, ...rest } = config.overrides;
    config.overrides = rest;
    delete this.errors[this.fieldKey(config, name)];
  }
  addConfiguration() { this.working.configurations.push(newConfiguration()); }
  removeConfiguration(config: Configuration) {
    this.working.configurations = this.working.configurations.filter(c => c.id !== config.id);
    for (const key of Object.keys(this.errors)) if (key.startsWith(`${config.id}:`)) delete this.errors[key];
  }
  apply() { if (!this.hasErrors) this.applyEntry.emit(clone(this.working)); }
}
