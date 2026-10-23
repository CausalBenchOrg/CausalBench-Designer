import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const ORIGINS = ['https://causalbench.org', 'https://www.causalbench.org'];
export function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 16384 && !/[\s\x00-\x1f\x7f]/.test(value);
}
@Injectable({ providedIn: 'root' })
export class TokenService implements OnDestroy {
  readonly token$ = new BehaviorSubject<string>('');
  readonly status$ = new BehaviorSubject<string>('Connect a CausalBench session to browse the registry, or supply descriptor metadata.');
  private timeout?: ReturnType<typeof setTimeout>;
  private listener?: (event: MessageEvent) => void;
  constructor() { this.loadToken(); }
  private loadToken() {
    let token: string | null = null;
    try { token = sessionStorage.getItem('token'); } catch { /* In-memory authoring works without storage. */ }
    if (validToken(token)) { this.setToken(token); return; }
    const opener = window.opener;
    if (!opener) return;
    this.status$.next('Waiting for the CausalBench session…');
    this.listener = event => {
      if (!ORIGINS.includes(event.origin) || event.source !== opener || !validToken(event.data?.token)) return;
      this.setToken(event.data.token);
    };
    window.addEventListener('message', this.listener);
    this.timeout = setTimeout(() => {
      this.cleanup();
      this.status$.next('Session handoff timed out. Reopen the designer from CausalBench or enter a session token.');
    }, 10000);
    try { for (const origin of ORIGINS) opener.postMessage('ready-for-token', origin); }
    catch { this.cleanup(); this.status$.next('Session handoff unavailable. Reopen from CausalBench or enter a session token.'); }
  }
  setToken(token: string): boolean {
    if (!validToken(token)) return false;
    this.cleanup();
    try { sessionStorage.setItem('token', token); } catch { /* Keep an in-memory session. */ }
    this.status$.next('Session connected.');
    this.token$.next(token);
    return true;
  }
  clearToken(message = 'Session disconnected. Reconnect to retry registry requests.') {
    this.cleanup();
    try { sessionStorage.removeItem('token'); } catch { /* Storage can be unavailable. */ }
    this.status$.next(message);
    this.token$.next('');
  }
  hasToken(): boolean { return !!this.token$.value; }
  private cleanup() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = undefined;
    if (this.listener) window.removeEventListener('message', this.listener);
    this.listener = undefined;
  }
  ngOnDestroy() { this.cleanup(); }
}
