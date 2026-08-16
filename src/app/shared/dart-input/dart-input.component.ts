import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DartThrow, NumberSegment } from '../../domain/models/dart-throw';

export type DartMultiplier = 'single' | 'double' | 'triple';

/**
 * Touch-friendly dart pad (ROADMAP 3.1). Emits a `DartThrow` per button
 * press; the game engines validate. The selected multiplier applies to the
 * segment grid only — bull and miss are fixed throws (triple bull is not a
 * representable dart).
 */
@Component({
  selector: 'app-dart-input',
  imports: [],
  templateUrl: './dart-input.component.html',
  styleUrl: './dart-input.component.scss',
})
export class DartInputComponent {
  readonly multipliers: DartMultiplier[] = ['single', 'double', 'triple'];
  readonly segments: NumberSegment[] = Array.from(
    { length: 20 },
    (_, i) => (i + 1) as NumberSegment,
  );

  multiplier: DartMultiplier = 'single';

  @Input() disabled = false;

  @Output() dartThrow = new EventEmitter<DartThrow>();

  selectMultiplier(multiplier: DartMultiplier): void {
    this.multiplier = multiplier;
  }

  throwSegment(segment: NumberSegment): void {
    switch (this.multiplier) {
      case 'single':
        this.dartThrow.emit({ kind: 'single', target: segment });
        break;
      case 'double':
        this.dartThrow.emit({ kind: 'double', target: segment });
        break;
      case 'triple':
        this.dartThrow.emit({ kind: 'triple', target: segment });
        break;
    }
  }

  throwBullSingle(): void {
    this.dartThrow.emit({ kind: 'single', target: 'bull' });
  }

  throwBullDouble(): void {
    this.dartThrow.emit({ kind: 'double', target: 'bull' });
  }

  throwMiss(): void {
    this.dartThrow.emit({ kind: 'miss' });
  }
}
