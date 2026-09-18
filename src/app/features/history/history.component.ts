import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatchSummary } from '../../state/history-persist';
import { MatchHistoryService } from '../../state/match-history.service';

@Component({
  selector: 'app-history',
  imports: [DatePipe],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  private readonly router = inject(Router);
  private readonly history = inject(MatchHistoryService);

  readonly matches = computed(() => [...this.history.matches()].reverse());

  goHome(): void {
    this.router.navigate(['/']);
  }

  modeLabel(match: MatchSummary): string {
    return match.mode === 'x01' ? 'X01' : 'Cricket';
  }

  playerNames(match: MatchSummary): string {
    return match.players.map((player) => player.name).join(', ');
  }

  outcome(match: MatchSummary): string {
    if (!match.winnerId) return 'Draw';
    const name = match.players.find((player) => player.id === match.winnerId)?.name ?? 'Winner';
    return `${name} wins`;
  }

  settingsLabel(match: MatchSummary): string {
    if (match.mode === 'cricket') return 'Standard';
    const inn = match.settings.doubleIn ? 'On' : 'Off';
    const out = match.settings.doubleOut ? 'On' : 'Off';
    return `${match.settings.startingScore}, double in ${inn}, double out ${out}`;
  }
}
