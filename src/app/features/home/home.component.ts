import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AddPlayersComponent } from '../../shared/add-players/add-players.component';
import { Player } from '../../domain/models/player';
import { GameMode } from '../../domain/models/game';
import { DEFAULT_X01_SETTINGS, X01Settings } from '../../domain/x01/x01-engine';
import { GameSessionService } from '../../state/game-session.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule, AddPlayersComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly session = inject(GameSessionService);

  players: Player[] = [];

  gameModes: GameMode[] = ['cricket', 'x01'];
  x01Scores: X01Settings['startingScore'][] = [301, 501, 701];

  selectedGamemode: GameMode = this.gameModes[0];
  selectedX01Score: X01Settings['startingScore'] = this.x01Scores[1];
  selectedDoubleIn = DEFAULT_X01_SETTINGS.doubleIn;
  selectedDoubleOut = DEFAULT_X01_SETTINGS.doubleOut;

  onPlayersChange(players: Player[]): void {
    this.players = players;
  }

  startGame(): void {
    if (this.players.length === 0) return;

    const settings: Partial<X01Settings> =
      this.selectedGamemode === 'x01'
        ? {
            startingScore: this.selectedX01Score,
            doubleIn: this.selectedDoubleIn,
            doubleOut: this.selectedDoubleOut,
          }
        : {};
    this.session.startGame(this.selectedGamemode, this.players, settings);

    const route = this.selectedGamemode === 'x01' ? '/game/x01-game' : '/game/cricket-game';
    this.router.navigate([route]);
  }
}
