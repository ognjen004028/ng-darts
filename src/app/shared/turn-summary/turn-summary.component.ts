import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DartThrow } from '../../domain/models/dart-throw';
import { DARTS_PER_TURN, Turn } from '../../domain/models/turn';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnSummaryComponent {
  readonly turn = input<Turn | null>(null);

  readonly slotViews = computed(() => {
    const throws = this.turn()?.throws ?? [];
    return Array.from({ length: DARTS_PER_TURN }, (_, slot) => {
      const dart = throws[slot];
      return {
        slot,
        filled: dart != null,
        label: dart ? this.dartLabel(dart) : '—',
      };
    });
  });

  private dartLabel(dart: DartThrow): string {
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
