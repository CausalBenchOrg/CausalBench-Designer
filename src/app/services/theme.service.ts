import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

const THEME_KEY = 'causalbench.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  dark = false;
  constructor(@Inject(DOCUMENT) private document: Document) {
    const window = document.defaultView;
    let saved: string | null = null;
    try { saved = window?.localStorage.getItem(THEME_KEY) ?? null; } catch { /* Theme works without storage. */ }
    this.dark = saved === 'dark' || (saved !== 'light' && !!window?.matchMedia?.('(prefers-color-scheme: dark)').matches);
    this.apply();
  }
  toggle() {
    this.dark = !this.dark;
    this.apply();
    try { this.document.defaultView?.localStorage.setItem(THEME_KEY, this.dark ? 'dark' : 'light'); } catch { /* Keep the in-memory choice. */ }
  }
  private apply() { this.document.documentElement.dataset['theme'] = this.dark ? 'dark' : 'light'; }
}
