import { Injectable, signal } from '@angular/core';
import {
  MatchHistorySource,
  MatchSummary,
  createMatchSummary,
  loadMatchHistory,
  saveMatchHistory,
} from './history-persist';

/**
 * Finished matches only (ROADMAP 5.2b). Separate from the live session key.
 * Restores from localStorage so a refresh of /history keeps the list.
 */
@Injectable({ providedIn: 'root' })
export class MatchHistoryService {
  private readonly entries = signal<MatchSummary[]>(loadMatchHistory());

  readonly matches = this.entries.asReadonly();

  record(source: MatchHistorySource): void {
    const next = [...this.entries(), createMatchSummary(source)];
    this.entries.set(next);
    saveMatchHistory(next);
  }

  /** Drop the newest row (undo of a finish). No-op when the list is empty. */
  retractLast(): void {
    const current = this.entries();
    if (current.length === 0) return;
    const next = current.slice(0, -1);
    this.entries.set(next);
    saveMatchHistory(next);
  }
}
