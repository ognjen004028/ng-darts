import { Component, inject } from '@angular/core';
import { GameSessionService } from '../../state/game-session.service';

@Component({
  selector: 'app-cricket-game',
  imports: [],
  templateUrl: './cricket-game.component.html',
  styleUrl: './cricket-game.component.scss'
})
export class CricketGameComponent {
  readonly session = inject(GameSessionService);

  playerNames(): string {
    return this.session.players().map((p) => p.name).join(', ');
  }
}
