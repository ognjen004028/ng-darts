import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { LeaveConfirmService } from '../leave-confirm.service';
import { GameSessionService } from '../../state/game-session.service';
import { applyDarts, clearPersistedHistory, clearPersistedSession } from '../../../testing/session';
import { x01CheckoutFrom301 } from '../../../testing/darts';
import { leaveGameGuard } from './leave-game.guard';

describe('leaveGameGuard', () => {
  let session: GameSessionService;
  let confirm: LeaveConfirmService;
  const component = {};
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const nextState = {} as RouterStateSnapshot;

  const runGuard = () =>
    TestBed.runInInjectionContext(() => leaveGameGuard(component, route, state, nextState));

  beforeEach(() => {
    clearPersistedSession();
    clearPersistedHistory();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    session = TestBed.inject(GameSessionService);
    confirm = TestBed.inject(LeaveConfirmService);
  });

  it('allows leave when there is no session', () => {
    expect(runGuard()).toBe(true);
  });

  it('allows leave when the game is finished', () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }], { startingScore: 301 });
    applyDarts(session, x01CheckoutFrom301);

    expect(session.status()).toBe('finished');
    expect(runGuard()).toBe(true);
  });

  it('blocks navigation until the player confirms', async () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }]);
    spyOn(confirm, 'ask').and.resolveTo(false);

    await expectAsync(runGuard() as Promise<boolean>).toBeResolvedTo(false);
    expect(session.hasSession()).toBe(true);
    expect(session.status()).toBe('in_progress');
  });

  it('allows navigation after confirm and keeps the session', async () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }]);
    spyOn(confirm, 'ask').and.resolveTo(true);

    await expectAsync(runGuard() as Promise<boolean>).toBeResolvedTo(true);
    expect(session.hasSession()).toBe(true);
    expect(session.status()).toBe('in_progress');
  });
});
