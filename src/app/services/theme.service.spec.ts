import { ThemeService } from './theme.service';

describe('Theme preference', () => {
  function environment(systemDark: boolean, saved?: string, blocked = false) {
    let preference = saved ?? null;
    const root = document.createElement('html');
    const doc = { documentElement: root, defaultView: {
      matchMedia: () => ({ matches: systemDark }),
      localStorage: {
        getItem: () => { if (blocked) throw new Error('Storage unavailable'); return preference; },
        setItem: (key: string, value: string) => { if (blocked) throw new Error('Storage unavailable'); preference = value; }
      }
    } } as unknown as Document;
    return { doc, root };
  }
  it('starts with the system appearance and restores an explicit choice on reload', () => {
    const { doc, root } = environment(true);
    const theme = new ThemeService(doc);
    expect(theme.dark).toBeTrue();
    theme.toggle();
    expect(root.dataset['theme']).toBe('light');
    expect(new ThemeService(doc).dark).toBeFalse();
  });
  it('keeps switching usable when browser storage is blocked', () => {
    const { doc, root } = environment(false, undefined, true);
    const theme = new ThemeService(doc);
    expect(() => theme.toggle()).not.toThrow();
    expect(root.dataset['theme']).toBe('dark');
    theme.toggle();
    expect(root.dataset['theme']).toBe('light');
  });
});
