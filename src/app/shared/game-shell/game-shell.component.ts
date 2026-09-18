import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DartThrow } from '../../domain/models/dart-throw';
import { Turn } from '../../domain/models/turn';
import { DartInputComponent } from '../dart-input/dart-input.component';
import { GameActionsComponent } from '../game-actions/game-actions.component';
import { TurnSummaryComponent } from '../turn-summary/turn-summary.component';

/**
 * Shared chrome for live game screens: banner, message, dart pad, actions.
 * Feature pages project the mode-specific scoreboard.
 */
@Component({
  selector: 'app-game-shell',
  imports: [DartInputComponent, TurnSummaryComponent, GameActionsComponent],
  templateUrl: './game-shell.component.html',
  styleUrl: './game-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameShellComponent {
  readonly finished = input(false);
  readonly winnerName = input<string | null>(null);
  readonly draw = input(false);
  readonly message = input<string | null>(null);
  readonly currentPlayerName = input('');
  readonly turn = input<Turn | null>(null);
  readonly undoDisabled = input(true);
  readonly endTurnDisabled = input(true);

  readonly dartThrow = output<DartThrow>();
  readonly undo = output<void>();
  readonly endTurn = output<void>();
  readonly leave = output<void>();
  readonly rematch = output<void>();
}
