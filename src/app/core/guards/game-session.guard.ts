import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameMode } from '../../domain/models/game';
import { GameSessionService } from '../../state/game-session.service';

/**
 * Blocks `/game/*` routes when there is no active session (ROADMAP 2.3).
 * The session is restored from localStorage on service construct (Phase 5.2),
 * so a refresh keeps a valid stored match. Redirects to Home when there is
 * no valid session, or when the session mode does not match the route.
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
