import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { GameSessionService } from '../../state/game-session.service';
import { gameSessionGuard } from './game-session.guard';

describe('gameSessionGuard', () => {
  let router: Router;
  let session: GameSessionService;
  const route = { data: { mode: 'x01' } } as unknown as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  /** Guards are only invoked inside an injection context by the router. */
  const runGuard = () =>
    TestBed.runInInjectionContext(() => gameSessionGuard(route, state));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    router = TestBed.inject(Router);
    session = TestBed.inject(GameSessionService);
  });

  it('allows navigation when a session exists', () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }]);

    expect(runGuard()).toBe(true);
  });

  it('redirects to home when no session exists', () => {
    expect(runGuard()).toEqual(router.createUrlTree(['/']));
  });

  it('redirects to home after the session is reset', () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }]);
    session.reset();

    expect(runGuard()).toEqual(router.createUrlTree(['/']));
  });

  it('redirects to home when the session mode does not match the route', () => {
    session.startGame('cricket', [{ id: 'p1', name: 'Ada' }]);

    expect(runGuard()).toEqual(router.createUrlTree(['/']));
  });
});
