import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove('dark-theme');
  });

  it('should have router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const routerOutlet = compiled.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });
});
