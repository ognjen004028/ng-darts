import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddPlayersComponent } from '../../shared/add-players/add-players.component';
import { Player } from '../../domain/models/player';

@Component({
  selector: 'app-home',
  imports: [FormsModule, AddPlayersComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  players: Player[] = [];

  gamemodes = ['cricket', 'x01'];
  x01Scores = [301, 501, 701];

  selectedGamemode = this.gamemodes[0];
  selectedX01Score = this.x01Scores[1];

  onPlayersChange(players: Player[]): void {
    this.players = players;
  }
}
