import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DartThrow } from '../../domain/models/dart-throw';
import { CricketGameState, CricketTarget } from '../../domain/cricket/cricket-engine';
import { GameSessionService, GameActionResult } from '../../state/game-session.service';
import { DartInputComponent } from '../../shared/dart-input/dart-input.component';
import { TurnSummaryComponent } from '../../shared/turn-summary/turn-summary.component';
import { GameActionsComponent } from '../../shared/game-actions/game-actions.component';

/**
 * Live Cricket scoring screen (ROADMAP 4.2). Scoreboard grid of
 * targets × players with marks and points, driven through the engine
 * via `GameSessionService` — rules never live in the template.
 */
@Component({
  selector: 'app-cricket-game',
  imports: [DartInputComponent, TurnSummaryComponent, GameActionsComponent],
  templateUrl: './cricket-game.component.html',
  styleUrl: './cricket-game.component.scss',
})
export class CricketGameComponent {
  private readonly router = inject(Router);
  readonly session = inject(GameSessionService);

  /** Targets in scoreboard order, from the session settings. */
  readonly targets = computed<CricketTarget[]>(() => this.session.cricketSettings()?.targets ?? []);

  /** Latest engine result message (win, draw, invalid), cleared on success. */
  readonly message = signal<string | null>(null);

  onDart(dart: DartThrow): void {
    this.handleResult(this.session.applyThrow(dart));
  }

  onEndTurn(): void {
    this.handleResult(this.session.endTurn());
  }

  onUndo(): void {
    this.handleResult(this.session.undoLastThrow());
  }

  /** Leave the finished/live game back to setup (session cleared). */
  newGame(): void {
    this.session.reset();
    this.router.navigate(['/']);
  }

  currentPlayerId(): string | null {
    const state = this.session.cricketGameState();
    return state ? state.playerIds[state.currentPlayerIndex] : null;
  }

  currentPlayerName(): string {
    const id = this.currentPlayerId();
    return id ? this.playerName(id) : '';
  }

  winnerName(playerId: string): string {
    return this.playerName(playerId);
  }

  targetKey(target: CricketTarget): string {
    return String(target);
  }

  targetLabel(target: CricketTarget): string {
    return target === 'bull' ? 'Bull' : `${target}`;
  }

  marksOf(state: CricketGameState, playerId: string, target: CricketTarget): number {
    return state.players[playerId].marks[String(target)] ?? 0;
  }

  isClosed(state: CricketGameState, playerId: string, target: CricketTarget): boolean {
    return this.marksOf(state, playerId, target) >= 3;
  }

  canUndo(): boolean {
    const state = this.session.cricketGameState();
    if (!state) return false;
    if (state.status === 'finished') return state.history.length > 0;
    return (state.currentTurn?.throws.length ?? 0) > 0 || state.history.length > 0;
  }

  canEndTurn(): boolean {
    const state = this.session.cricketGameState();
    return !!state && state.status === 'in_progress' && (state.currentTurn?.throws.length ?? 0) > 0;
  }

  private playerName(id: string): string {
    return this.session.players().find((p) => p.id === id)?.name ?? 'Player';
  }

  private handleResult(result: GameActionResult | null): void {
    if (!result) return;
    switch (result.type) {
      case 'game_won':
        this.message.set(`${this.playerName(result.winnerId)} wins!`);
        break;
      case 'draw':
        this.message.set('Draw!');
        break;
      case 'invalid':
        this.message.set(result.reason);
        break;
      case 'success':
        this.message.set(null);
        break;
      case 'bust':
        // Not a Cricket result; present for the shared GameActionResult union.
        break;
    }
  }
}
