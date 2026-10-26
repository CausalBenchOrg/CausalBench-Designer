import { fakeAsync, tick } from '@angular/core/testing';
import { TokenService } from './token.service';

describe('Session handoff', () => {
  let service: TokenService | undefined;
  let originalOpener: any;
  const opener = { postMessage: jasmine.createSpy('postMessage') };
  beforeEach(() => { originalOpener = window.opener; window.opener = opener; sessionStorage.removeItem('token'); opener.postMessage.calls.reset(); });
  afterEach(() => { service?.ngOnDestroy(); service = undefined; window.opener = originalOpener; sessionStorage.removeItem('token'); });
  function message(origin: string, source: any, data: unknown) { const event = new MessageEvent('message', { origin, data }); Object.defineProperty(event, 'source', { value: source }); window.dispatchEvent(event); }
  it('allows unauthenticated local authoring with no opener', () => {
    window.opener = null; service = new TokenService();
    expect(service.hasToken()).toBeFalse(); expect(service.status$.value).toContain('Connect'); expect(opener.postMessage).not.toHaveBeenCalled();
  });
  it('accepts a stored token without starting a handoff', () => {
    sessionStorage.setItem('token', 'stored-session'); service = new TokenService();
    expect(service.token$.value).toBe('stored-session'); expect(opener.postMessage).not.toHaveBeenCalled();
  });
  it('requires trusted origin, opener source, and valid payload before stopping the timeout', fakeAsync(() => {
    service = new TokenService();
    expect(opener.postMessage).toHaveBeenCalledWith('ready-for-token', 'https://causalbench.org');
    message('https://foreign.example', opener, { token: 'foreign' });
    message('https://causalbench.org', window, { token: 'wrong-source' });
    for (const token of ['', 42, null, {}, 'white space', '\nheader']) message('https://causalbench.org', opener, { token });
    expect(service.hasToken()).toBeFalse();
    tick(10001); expect(service.status$.value).toContain('timed out');
    message('https://causalbench.org', opener, { token: 'too-late' });
    expect(service.hasToken()).toBeFalse();
  }));
  it('accepts a valid handoff once and cleans up its listener and timer', fakeAsync(() => {
    service = new TokenService();
    message('https://www.causalbench.org', opener, { token: 'accepted-session' });
    expect(service.token$.value).toBe('accepted-session'); expect(sessionStorage.getItem('token')).toBe('accepted-session');
    message('https://causalbench.org', opener, { token: 'replacement' });
    tick(10001); expect(service.token$.value).toBe('accepted-session'); expect(service.status$.value).toBe('Session connected.');
    service.clearToken(); expect(service.hasToken()).toBeFalse(); expect(sessionStorage.getItem('token')).toBeNull();
  }));
  it('rejects invalid manually supplied tokens and handles a destroyed handoff', fakeAsync(() => {
    service = new TokenService();
    expect(service.setToken('')).toBeFalse(); expect(service.setToken('bad\ntoken')).toBeFalse();
    service.ngOnDestroy(); tick(10001);
    message('https://causalbench.org', opener, { token: 'late' });
    expect(service.hasToken()).toBeFalse();
  }));
});
