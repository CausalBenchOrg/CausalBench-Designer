import { SidebarComponent } from './sidebar.component';
import { supervisedFixture } from '../../../../tests/fixtures/contexts';

describe('Typed temporary configuration editor', () => {
  let editor: SidebarComponent;
  beforeEach(() => { const fixture = supervisedFixture(); editor = new SidebarComponent(); editor.entry = fixture.models[0]; editor.task = fixture.task; editor.ngOnChanges(); });
  it('retains typed zero, false, empty text, structured values, and explicit null', () => {
    const config = editor.working.configurations[0], declarations = editor.working.descriptor.parameters!;
    editor.setValue(config, 'count', declarations['count'], '0');
    editor.setValue(config, 'enabled', declarations['enabled'], false);
    editor.setValue(config, 'empty', declarations['empty'], '');
    editor.setValue(config, 'settings', declarations['settings'], '{"enabled":false,"value":0}');
    editor.toggleNull(config, 'optional', declarations['optional']); // null -> typed zero
    editor.toggleNull(config, 'optional', declarations['optional']); // zero -> null
    expect<unknown>(config.overrides['count']).toBe(0); expect<unknown>(config.overrides['enabled']).toBeFalse(); expect<unknown>(config.overrides['empty']).toBe('');
    expect<unknown>(config.overrides['settings']).toEqual({ enabled: false, value: 0 }); expect<unknown>(config.overrides['optional']).toBeNull();
    expect(editor.hasErrors).toBeFalse();
  });
  it('blocks malformed numeric or structured edits without mutating applied state', () => {
    const config = editor.working.configurations[0], declaration = editor.working.descriptor.parameters!['count'];
    const apply = spyOn(editor.applyEntry, 'emit');
    editor.setValue(config, 'count', declaration, 'bad'); editor.apply();
    expect(editor.hasErrors).toBeTrue(); expect(apply).not.toHaveBeenCalled();
    expect<unknown>(editor.entry.configurations[0].overrides['count']).toBe(0);
    editor.setValue(config, 'count', declaration, '2'); editor.apply();
    expect(editor.hasErrors).toBeFalse(); expect(apply).toHaveBeenCalled();
    expect<unknown>(editor.entry.configurations[0].overrides['count']).toBe(0);
  });
  it('uses defaults only when no override is enabled and permits repeated configurations', () => {
    const config = editor.working.configurations[0], declaration = editor.working.descriptor.parameters!['enabled'];
    editor.toggleOverride(config, 'enabled', declaration);
    expect(editor.hasOverride(config, 'enabled')).toBeFalse();
    editor.toggleOverride(config, 'enabled', declaration);
    expect<unknown>(config.overrides['enabled']).toBeTrue();
    editor.addConfiguration(); editor.addConfiguration();
    expect(editor.working.configurations.length).toBe(3);
  });
  it('edits retained overrides with unknown declarations as JSON and blocks malformed changes', () => {
    editor.entry.descriptor.parameters = undefined; editor.ngOnChanges();
    const config = editor.working.configurations[0];
    editor.setSavedOverride(config, 'enabled', 'false');
    editor.setSavedOverride(config, 'settings', '{"nested":[0,null,""]}');
    expect<unknown>(config.overrides['enabled']).toBe(false);
    expect<unknown>(config.overrides['settings']).toEqual({ nested: [0, null, ''] });
    editor.setSavedOverride(config, 'enabled', 'broken');
    const apply = spyOn(editor.applyEntry, 'emit'); editor.apply();
    expect(apply).not.toHaveBeenCalled(); expect<unknown>(config.overrides['enabled']).toBe(false);
    editor.setSavedOverride(config, 'enabled', 'null'); editor.apply(); expect(apply).toHaveBeenCalled();
    expect<unknown>(editor.entry.configurations[0].overrides['enabled']).toBe(false);
  });
  it('retains unapplied settings and invalid field text when automatic package metadata arrives', () => {
    const config = editor.working.configurations[0], declaration = editor.working.descriptor.parameters!['count'];
    editor.setValue(config, 'count', declaration, '7');
    editor.setValue(config, 'settings', editor.working.descriptor.parameters!['settings'], '{invalid');
    editor.entry = { ...editor.entry, descriptor: { ...editor.entry.descriptor, provenance: 'package' } };
    editor.ngOnChanges();
    expect<unknown>(editor.working.configurations[0].overrides['count']).toBe(7);
    expect(editor.raw[editor.fieldKey(config, 'settings')]).toBe('{invalid');
    expect(editor.hasErrors).toBeTrue(); expect(editor.working.descriptor.provenance).toBe('package');
  });
  it('suggests only unambiguous type matches and preserves explicit mappings', () => {
    const fixture = supervisedFixture(); editor.entry = fixture.datasets[0]; editor.task = fixture.task; editor.ngOnChanges();
    editor.working.mapping = {}; editor.suggestMappings();
    expect(editor.working.mapping).toEqual({ features: 'observations', labels: 'observations' });
    editor.working.mapping['features'] = 'saved-choice'; editor.suggestMappings();
    expect(editor.working.mapping['features']).toBe('saved-choice');
    editor.working.descriptor.files!.push({ alias: 'second', format: 'dataframe' });
    editor.working.mapping = {}; editor.suggestMappings(); expect(editor.working.mapping).toEqual({});
  });
});
