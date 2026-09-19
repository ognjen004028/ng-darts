import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DartThrow, NumberSegment } from '../../domain/models/dart-throw';

export type DartMultiplier = 'single' | 'double' | 'triple';

/**
 * Touch-friendly dart pad (ROADMAP 3.1). Emits a `DartThrow` per button
 * press; the game engines validate. The selected multiplier applies to the
 * segment grid and to bull (single 25 / double 50). Triple bull is not a
 * representable dart: a bull tap with triple selected emits nothing. Miss is
 * a fixed throw. After a double, triple, bull, or miss, the multiplier
 * returns to single.
 */
@Component({
  selector: 'app-dart-input',
  imports: [],
  templateUrl: './dart-input.component.html',
  styleUrl: './dart-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DartInputComponent {
  readonly multipliers: DartMultiplier[] = ['single', 'double', 'triple'];
  readonly segments: NumberSegment[] = Array.from(
    { length: 20 },
    (_, i) => (i + 1) as NumberSegment,
  );

  readonly multiplier = signal<DartMultiplier>('single');

  readonly disabled = input(false);

  readonly dartThrow = output<DartThrow>();

  selectMultiplier(multiplier: DartMultiplier): void {
    this.multiplier.set(multiplier);
  }

  private resetMultiplier(): void {
    this.multiplier.set('single');
  }

  throwSegment(segment: NumberSegment): void {
    switch (this.multiplier()) {
      case 'single':
        this.dartThrow.emit({ kind: 'single', target: segment });
        break;
      case 'double':
        this.dartThrow.emit({ kind: 'double', target: segment });
        this.resetMultiplier();
        break;
      case 'triple':
        this.dartThrow.emit({ kind: 'triple', target: segment });
        this.resetMultiplier();
        break;
    }
  }

  throwBull(): void {
    switch (this.multiplier()) {
      case 'single':
        this.dartThrow.emit({ kind: 'single', target: 'bull' });
        break;
      case 'double':
        this.dartThrow.emit({ kind: 'double', target: 'bull' });
        this.resetMultiplier();
        break;
      case 'triple':
        this.resetMultiplier();
        break;
    }
  }

  throwMiss(): void {
    this.dartThrow.emit({ kind: 'miss' });
    this.resetMultiplier();
  }
}
