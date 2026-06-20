import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Player } from '../../domain/models/player';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-players',
  imports: [FormsModule],
  templateUrl: './add-players.component.html',
  styleUrl: './add-players.component.scss',
})
export class AddPlayersComponent implements OnInit {
  readonly maxPlayers = 4;

  players: Player[] = [
    { id: crypto.randomUUID(), name: 'Player 1' },
    { id: crypto.randomUUID(), name: 'Player 2' },
  ];

  ngOnInit(): void {
    this.playersChange.emit(this.players);
  }

  newPlayerName = '';

  @Output() playersChange = new EventEmitter<Player[]>();

  addPlayer(): void {
    if (this.players.length >= this.maxPlayers) return;
    if (!this.newPlayerName.trim()) return;

    this.players = [
      ...this.players,
      { id: crypto.randomUUID(), name: this.newPlayerName.trim() },
    ];
    ((this.newPlayerName = ''), this.playersChange.emit(this.players));
  }

  removePlayer(id: string): void {
    if (this.players.length <= 1) return;

    this.players = this.players.filter((p) => p.id !== id);
    this.playersChange.emit(this.players);
  }
}
