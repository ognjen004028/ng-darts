import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Player } from '../../domain/models/player';

@Component({
  selector: 'app-add-players',
  imports: [FormsModule],
  templateUrl: './add-players.component.html',
  styleUrl: './add-players.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPlayersComponent implements OnInit {
  readonly maxPlayers = 4;

  players: Player[] = [
    { id: crypto.randomUUID(), name: 'Player 1' },
    { id: crypto.randomUUID(), name: 'Player 2' },
  ];

  newPlayerName = '';

  readonly playersChange = output<Player[]>();

  ngOnInit(): void {
    this.playersChange.emit(this.players);
  }

  onNameChange(id: string, name: string): void {
    this.players = this.players.map((player) => (player.id === id ? { ...player, name } : player));
    this.playersChange.emit(this.players);
  }

  addPlayer(): void {
    if (this.players.length >= this.maxPlayers) return;
    const name = this.newPlayerName.trim();
    if (!name) return;

    this.players = [...this.players, { id: crypto.randomUUID(), name }];
    this.newPlayerName = '';
    this.playersChange.emit(this.players);
  }

  removePlayer(id: string): void {
    if (this.players.length <= 1) return;

    this.players = this.players.filter((player) => player.id !== id);
    this.playersChange.emit(this.players);
  }
}
