import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CricketTarget } from '../../domain/cricket/cricket-engine';
import { GameActionResult, GameSessionService } from '../../state/game-session.service';
import { LeaveConfirmService } from '../../core/leave-confirm.service';
import { canUndo as isUndoAllowed } from '../../shared/game-play/turn-flow';
import { messageForResult } from '../../shared/game-play/result-message';

interface CricketCell {
  playerId: string;
  playerName: string;
  marks: number;
  closed: boolean;
  tappable: boolean;
}

interface CricketRow {
  key: string;
  target: CricketTarget;
  label: string;
  cells: CricketCell[];
}

/**
 * Cricket scoreboard: tappable mark zones and Undo. No keypad, no turns.
 * Rules live in the engine (RULES.md).
 */
@Component({
  selector: 'app-cricket-game',
  imports: [],
  templateUrl: './cricket-game.component.html',
  styleUrl: './cricket-game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CricketGameComponent {
  private readonly router = inject(Router);
  private readonly leaveConfirm = inject(LeaveConfirmService);
  readonly session = inject(GameSessionService);

  readonly targets = computed<CricketTarget[]>(() => this.session.cricketSettings()?.targets ?? []);

  readonly message = signal<string | null>(null);

  readonly winnerName = computed(() => {
    const id = this.session.cricketGameState()?.winnerId;
    return id ? this.playerName(id) : null;
  });

  readonly canUndo = computed(() => {
    const state = this.session.cricketGameState();
    return state ? isUndoAllowed(state) : false;
  });

  readonly rows = computed<CricketRow[]>(() => {
    const state = this.session.cricketGameState();
    const players = this.session.players();
    if (!state) return [];
    const live = state.status === 'in_progress';
    return this.targets().map((target) => {
      const key = String(target);
      return {
        key,
        target,
        label: target === 'bull' ? 'Bull' : `${target}`,
        cells: players.map((player) => {
          const marks = state.players[player.id].marks[key] ?? 0;
          return {
            playerId: player.id,
            playerName: player.name,
            marks,
            closed: marks >= 3,
            tappable: live,
          };
        }),
      };
    });
  });

  /** One tap = one single dart for that player on that target. */
  onTargetTap(target: CricketTarget, cell: CricketCell): void {
    if (!cell.tappable) return;
    this.handleResult(this.session.applyThrow({ kind: 'single', target }, cell.playerId));
  }

  markLabel(rowLabel: string, cell: CricketCell): string {
    const state =
      cell.marks >= 3
        ? 'closed'
        : cell.marks === 0
          ? 'no marks'
          : cell.marks === 1
            ? '1 mark'
            : `${cell.marks} marks`;
    return `${rowLabel}, ${cell.playerName}, ${state}`;
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
