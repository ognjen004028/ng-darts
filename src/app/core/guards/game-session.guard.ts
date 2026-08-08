import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameSessionService } from '../../state/game-session.service';

/**
 * Blocks `/game/*` routes when there is no active session (ROADMAP 2.3),
 * e.g. after a refresh — session state lives in memory until Phase 5
 * persistence. Redirects to Home.
 */
export const gameSessionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(GameSessionService);
  return session.hasSession() ? true : router.createUrlTree(['/']);
};
