import { Component, Input } from '@angular/core';
import { DartThrow } from '../../domain/models/dart-throw';
import { Turn } from '../../domain/models/turn';

/**
 * Displays the darts of the current turn as three slots (ROADMAP 3.3).
 * Purely presentational — labels follow RULES.md notation
 * (S = number, D = double, T = triple, inner bull = D25).
 */
@Component({
  selector: 'app-turn-summary',
  imports: [],
  templateUrl: './turn-summary.component.html',
  styleUrl: './turn-summary.component.scss',
})
export class TurnSummaryComponent {
  /** Fixed slot positions 0–2; a turn holds at most 3 darts. */
  readonly slots = [0, 1, 2];

  @Input() turn: Turn | null = null;

  hasDart(slot: number): boolean {
    return this.turn?.throws.length != null && this.turn.throws.length > slot;
  }

  slotLabel(slot: number): string {
    const dart = this.turn?.throws[slot];
    return dart ? this.dartLabel(dart) : '—';
  }

  dartLabel(dart: DartThrow): string {
    switch (dart.kind) {
      case 'miss':
        return 'Miss';
      case 'single':
        return dart.target === 'bull' ? '25' : `${dart.target}`;
      case 'double':
        return dart.target === 'bull' ? 'D25' : `D${dart.target}`;
      case 'triple':
        return `T${dart.target}`;
    }
  }
}
