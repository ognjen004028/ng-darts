import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DartThrow } from '../../domain/models/dart-throw';
import { GameActionResult, GameSessionService } from '../../state/game-session.service';
import { GameShellComponent } from '../../shared/game-shell/game-shell.component';
import { LeaveConfirmService } from '../../core/leave-confirm.service';
import {
  canEndTurn as isEndTurnAllowed,
  canUndo as isUndoAllowed,
} from '../../shared/game-play/turn-flow';
import { messageForResult } from '../../shared/game-play/result-message';

/**
 * Live X01 scoring screen (ROADMAP 3.2). Reads the session and drives the
 * engine through `GameSessionService`; rules live in the engine, never here.
 */
@Component({
  selector: 'app-x01-game',
  imports: [GameShellComponent],
  templateUrl: './x01-game.component.html',
  styleUrl: './x01-game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class X01GameComponent {
  private readonly router = inject(Router);
  private readonly leaveConfirm = inject(LeaveConfirmService);
  readonly session = inject(GameSessionService);

  readonly message = signal<string | null>(null);

  readonly currentPlayerName = computed(() => {
    const state = this.session.x01GameState();
    if (!state) return '';
    return this.playerName(state.playerIds[state.currentPlayerIndex]);
  });

  readonly winnerName = computed(() => {
    const id = this.session.x01GameState()?.winnerId;
    return id ? this.playerName(id) : null;
  });

  readonly canUndo = computed(() => {
    const state = this.session.x01GameState();
    return state ? isUndoAllowed(state) : false;
  });

  readonly canEndTurn = computed(() => {
    const state = this.session.x01GameState();
    return state ? isEndTurnAllowed(state) : false;
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

  /** Leave to Home. Confirm first while the match is live; finished games leave at once. */
  async leave(): Promise<void> {
    if (this.session.status() === 'in_progress') {
      const ok = await this.leaveConfirm.ask();
      if (!ok) return;
    }
    this.session.reset();
    await this.router.navigate(['/']);
  }

  rematch(): void {
    this.session.rematch();
    this.message.set(null);
  }

  private playerName(id: string): string {
    return this.session.players().find((player) => player.id === id)?.name ?? 'Player';
  }

  private handleResult(result: GameActionResult | null): void {
    if (!result) return;
    this.message.set(messageForResult(result, (id) => this.playerName(id)));
  }
}
