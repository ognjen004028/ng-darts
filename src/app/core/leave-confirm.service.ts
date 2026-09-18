import { Injectable, signal } from '@angular/core';

/**
 * In-app leave confirm (ROADMAP 5.3). Shared by the Leave control and CanDeactivate.
 * Do not use beforeunload — it does not run in Capacitor.
 */
@Injectable({ providedIn: 'root' })
export class LeaveConfirmService {
  readonly open = signal(false);

  private resolveAsk: ((ok: boolean) => void) | null = null;
  private currentAsk: Promise<boolean> | null = null;

  /** Open the panel. A second call while open reuses the same promise. */
  ask(): Promise<boolean> {
    if (this.currentAsk) return this.currentAsk;
    this.open.set(true);
    this.currentAsk = new Promise((resolve) => {
      this.resolveAsk = resolve;
    });
    return this.currentAsk;
  }

  answer(ok: boolean): void {
    this.open.set(false);
    const resolve = this.resolveAsk;
    this.resolveAsk = null;
    this.currentAsk = null;
    resolve?.(ok);
  }
}
