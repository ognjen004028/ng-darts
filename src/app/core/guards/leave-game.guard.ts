import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { LeaveConfirmService } from '../leave-confirm.service';
import { GameSessionService } from '../../state/game-session.service';

/**
 * Confirm in-app when leaving a live `/game/*` match (ROADMAP 5.3).
 * Keeps the session so Home can Resume. The Leave control resets after its own confirm.
 */
export const leaveGameGuard: CanDeactivateFn<unknown> = () => {
  const session = inject(GameSessionService);
  const confirm = inject(LeaveConfirmService);
  if (session.status() !== 'in_progress') return true;
  return confirm.ask();
};
