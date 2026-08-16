import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DartThrow } from '../../domain/models/dart-throw';
import { X01Result } from '../../domain/x01/x01-engine';
import { GameSessionService } from '../../state/game-session.service';
import { DartInputComponent } from '../../shared/dart-input/dart-input.component';
import { TurnSummaryComponent } from '../../shared/turn-summary/turn-summary.component';
import { GameActionsComponent } from '../../shared/game-actions/game-actions.component';

/**
 * Live X01 scoring screen (ROADMAP 3.2). Reads the session and drives the
 * engine through `GameSessionService`; rules live in the engine, never here.
 */
@Component({
  selector: 'app-x01-game',
  imports: [DartInputComponent, TurnSummaryComponent, GameActionsComponent],
  templateUrl: './x01-game.component.html',
  styleUrl: './x01-game.component.scss',
})
export class X01GameComponent {
  private readonly router = inject(Router);
  readonly session = inject(GameSessionService);

  /** Latest engine result message (bust, checkout, invalid), cleared on success. */
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
    const state = this.session.gameState();
    return state ? state.playerIds[state.currentPlayerIndex] : null;
  }

  currentPlayerName(): string {
    const id = this.currentPlayerId();
    return id ? this.playerName(id) : '';
  }

  winnerName(playerId: string): string {
    return this.playerName(playerId);
  }

  canUndo(): boolean {
    const state = this.session.gameState();
    if (!state) return false;
    if (state.status === 'finished') return state.history.length > 0;
    return (state.currentTurn?.throws.length ?? 0) > 0 || state.history.length > 0;
  }

  canEndTurn(): boolean {
    const state = this.session.gameState();
    return !!state && state.status === 'in_progress' && (state.currentTurn?.throws.length ?? 0) > 0;
  }

  private playerName(id: string): string {
    return this.session.players().find((p) => p.id === id)?.name ?? 'Player';
  }

  private handleResult(result: X01Result | null): void {
    if (!result) return;
    switch (result.type) {
      case 'bust':
        this.message.set('Bust — turn reverted, next player up.');
        break;
      case 'game_won':
        this.message.set(`${this.playerName(result.winnerId)} wins!`);
        break;
      case 'invalid':
        this.message.set(result.reason);
        break;
      case 'success':
        this.message.set(null);
        break;
    }
  }
}
