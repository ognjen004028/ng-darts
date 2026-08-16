import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Game action buttons shared by game screens (ROADMAP 3.3): Undo and
 * End turn. Parents own the enabled states and handle the events.
 */
@Component({
  selector: 'app-game-actions',
  imports: [],
  templateUrl: './game-actions.component.html',
  styleUrl: './game-actions.component.scss',
})
export class GameActionsComponent {
  @Input() undoDisabled = false;
  @Input() endTurnDisabled = false;

  @Output() undo = new EventEmitter<void>();
  @Output() endTurn = new EventEmitter<void>();
}
