import { Component, inject } from '@angular/core';
import { GameSessionService } from '../../state/game-session.service';

@Component({
  selector: 'app-x01-game',
  imports: [],
  templateUrl: './x01-game.component.html',
  styleUrl: './x01-game.component.scss'
})
export class X01GameComponent {
  readonly session = inject(GameSessionService);

  playerNames(): string {
    return this.session.players().map((p) => p.name).join(', ');
  }

  /** Remaining score for a player, or null when the session has no game state. */
  remainingScore(playerId: string): number | null {
    return this.session.gameState()?.scores[playerId] ?? null;
  }
}
