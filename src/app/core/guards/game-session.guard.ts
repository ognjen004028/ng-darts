import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameMode } from '../../domain/models/game';
import { GameSessionService } from '../../state/game-session.service';

/**
 * Blocks `/game/*` routes when there is no active session (ROADMAP 2.3),
 * e.g. after a refresh — session state lives in memory until Phase 5
 * persistence. Also requires the session mode to match the route.
 * Redirects to Home.
 */
export const gameSessionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const session = inject(GameSessionService);
  const expectedMode = route.data['mode'] as GameMode | undefined;
  if (!session.hasSession() || session.mode() !== expectedMode) {
    return router.createUrlTree(['/']);
  }
  return true;
};
