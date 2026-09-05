import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Game action buttons shared by game screens (ROADMAP 3.3): Undo and
 * End turn. Parents own the enabled states and handle the events.
 */
@Component({
  selector: 'app-game-actions',
  imports: [],
  templateUrl: './game-actions.component.html',
  styleUrl: './game-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameActionsComponent {
  readonly undoDisabled = input(false);
  readonly endTurnDisabled = input(false);

  readonly undo = output<void>();
  readonly endTurn = output<void>();
}
