import { BehaviorSubject, Subject } from 'rxjs';
import { OpenContextComponent } from './open-context.component';
import { ContextLibraryService } from '../../services/context-library.service';
import { TokenService } from '../../services/token.service';
import { ContextRecipe } from '../../domain/context-import';
import { contextData, serializeYaml } from '../../domain/serialize';
import { supervisedFixture } from '../../../../tests/fixtures/contexts';

describe('Context selection races', () => {
  it('reads a browser File into a preview without replacing the draft automatically', async () => {
    const component = new OpenContextComponent({ deactivate: () => {} } as ContextLibraryService, { token$: new BehaviorSubject('') } as TokenService);
    const opened = spyOn(component.contextOpened, 'emit');
    const input = { files: [new File([serializeYaml(supervisedFixture())], 'saved-context.yaml')], value: 'selected' };
    await component.readFile({ target: input } as unknown as Event);
    expect(component.preview!.source.label).toBe('saved-context.yaml');
    expect(component.preview!.recipe.task.id).toBe(91001); expect(opened).not.toHaveBeenCalled();
    expect(input.value).toBe(''); component.ngOnDestroy();
  });
  it('cancels stale selections and never emits a draft merely because a download completed', () => {
    const first = new Subject<ContextRecipe>(), second = new Subject<ContextRecipe>();
    const library = { items: [{ id: 1, version: 1, name: 'First' }, { id: 2, version: 1, name: 'Second' }],
      download: (item: { id: number }) => item.id === 1 ? first : second, deactivate: () => {} } as unknown as ContextLibraryService;
    const component = new OpenContextComponent(library, { token$: new BehaviorSubject('') } as TokenService);
    const opened = spyOn(component.contextOpened, 'emit');
    component.selection = '1@1'; component.selectContext();
    component.selection = '2@1'; component.selectContext();
    const recipe = contextData(supervisedFixture());
    first.next({ ...recipe, type: 'context', name: 'Stale' }); expect(component.preview).toBeNull();
    second.next({ ...recipe, type: 'context', name: 'Second' }); expect(component.preview!.recipe.name).toBe('Second');
    expect(opened).not.toHaveBeenCalled();
    component.open(); expect(opened).toHaveBeenCalled();
    component.ngOnDestroy();
  });
});
