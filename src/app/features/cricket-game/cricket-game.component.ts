import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DartThrow } from '../../domain/models/dart-throw';
import { CricketTarget } from '../../domain/cricket/cricket-engine';
import { GameActionResult, GameSessionService } from '../../state/game-session.service';
import { GameShellComponent } from '../../shared/game-shell/game-shell.component';
import {
  canEndTurn as isEndTurnAllowed,
  canUndo as isUndoAllowed,
} from '../../shared/game-play/turn-flow';
import { messageForResult } from '../../shared/game-play/result-message';

interface CricketCell {
  playerId: string;
  marks: number;
  closed: boolean;
}

interface CricketRow {
  key: string;
  label: string;
  cells: CricketCell[];
}

/**
 * Live Cricket scoring screen (ROADMAP 4.2). Scoreboard grid of
 * targets × players with marks and points, driven through the engine
 * via `GameSessionService` — rules never live in the template.
 */
@Component({
  selector: 'app-cricket-game',
  imports: [GameShellComponent],
  templateUrl: './cricket-game.component.html',
  styleUrl: './cricket-game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CricketGameComponent {
  private readonly router = inject(Router);
  readonly session = inject(GameSessionService);

  readonly targets = computed<CricketTarget[]>(() => this.session.cricketSettings()?.targets ?? []);

  readonly message = signal<string | null>(null);

  readonly currentPlayerId = computed(() => {
    const state = this.session.cricketGameState();
    return state ? state.playerIds[state.currentPlayerIndex] : null;
  });

  readonly currentPlayerName = computed(() => {
    const id = this.currentPlayerId();
    return id ? this.playerName(id) : '';
  });

  readonly winnerName = computed(() => {
    const id = this.session.cricketGameState()?.winnerId;
    return id ? this.playerName(id) : null;
  });

  readonly canUndo = computed(() => {
    const state = this.session.cricketGameState();
    return state ? isUndoAllowed(state) : false;
  });

  readonly canEndTurn = computed(() => {
    const state = this.session.cricketGameState();
    return state ? isEndTurnAllowed(state) : false;
  });

  readonly rows = computed<CricketRow[]>(() => {
    const state = this.session.cricketGameState();
    const players = this.session.players();
    if (!state) return [];
    return this.targets().map((target) => {
      const key = String(target);
      return {
        key,
        label: target === 'bull' ? 'Bull' : `${target}`,
        cells: players.map((player) => {
          const marks = state.players[player.id].marks[key] ?? 0;
          return { playerId: player.id, marks, closed: marks >= 3 };
        }),
      };
    });
  });

  onDart(dart: DartThrow): void {
    this.handleResult(this.session.applyThrow(dart));
  }

  onEndTurn(): void {
    this.handleResult(this.session.endTurn());
  }

  onUndo(): void {
    this.handleResult(this.session.undoLastThrow());
  }

  /** Leave the finished/live game back to home (session cleared). */
  newGame(): void {
    this.session.reset();
    this.router.navigate(['/']);
  }

  private playerName(id: string): string {
    return this.session.players().find((player) => player.id === id)?.name ?? 'Player';
  }

  private handleResult(result: GameActionResult | null): void {
    if (!result) return;
    this.message.set(messageForResult(result, (id) => this.playerName(id)));
  }
}
