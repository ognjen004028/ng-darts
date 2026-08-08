import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AddPlayersComponent } from '../../shared/add-players/add-players.component';
import { Player } from '../../domain/models/player';
import { GameMode } from '../../domain/models/game';
import { X01Settings } from '../../domain/x01/x01-engine';
import { GameSessionService } from '../../state/game-session.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule, AddPlayersComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly session = inject(GameSessionService);

  players: Player[] = [];

  gamemodes: GameMode[] = ['cricket', 'x01'];
  x01Scores: X01Settings['startingScore'][] = [301, 501, 701];

  selectedGamemode: GameMode = this.gamemodes[0];
  selectedX01Score: X01Settings['startingScore'] = this.x01Scores[1];

  /** True once Start was pressed with no players — drives the validation hint. */
  startAttempted = false;

  onPlayersChange(players: Player[]): void {
    this.players = players;
  }

  startGame(): void {
    if (this.players.length === 0) {
      this.startAttempted = true;
      return;
    }
    this.startAttempted = false;

    const settings: Partial<X01Settings> =
      this.selectedGamemode === 'x01' ? { startingScore: this.selectedX01Score } : {};
    this.session.startGame(this.selectedGamemode, this.players, settings);

    const route = this.selectedGamemode === 'x01' ? '/game/x01-game' : '/game/cricket-game';
    this.router.navigate([route]);
  }
}
