import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LeaveConfirmService } from '../../core/leave-confirm.service';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { X01GameComponent } from './x01-game.component';
import { throwAll, x01BustFrom301, x01CheckoutFrom301 } from '../../../testing/darts';
import { clearPersistedHistory, clearPersistedSession } from '../../../testing/session';
import { MatchHistoryService } from '../../state/match-history.service';

describe('X01GameComponent', () => {
  let component: X01GameComponent;
  let fixture: ComponentFixture<X01GameComponent>;
  let session: GameSessionService;
  let history: MatchHistoryService;
  let leaveConfirm: LeaveConfirmService;
  let router: jasmine.SpyObj<Router>;

  const players: Player[] = [
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Grace' },
  ];

  beforeEach(async () => {
    clearPersistedSession();
    clearPersistedHistory();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [X01GameComponent],
      providers: [GameSessionService, { provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(X01GameComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    history = TestBed.inject(MatchHistoryService);
    leaveConfirm = TestBed.inject(LeaveConfirmService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows no active session before a game starts', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No active session.');
  });

  it('shows players with their starting score and the first player up', () => {
    session.startGame('x01', players);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ada');
    expect(text).toContain('Grace');
    expect(text).toContain('501');
    expect(text).toContain('Up next:');
    expect(component.currentPlayerName()).toBe('Ada');
  });

  it('updates the scoreboard when a dart is thrown', () => {
    session.startGame('x01', players);
    fixture.detectChanges();

    component.onDart({ kind: 'triple', target: 20 });

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('441');
  });

  it('auto-passes play after 3 darts', () => {
    session.startGame('x01', players);
    fixture.detectChanges();

    for (let i = 0; i < 3; i++) {
      component.onDart({ kind: 'single', target: 1 });
    }

    expect(component.currentPlayerName()).toBe('Grace');
    expect(session.x01GameState()?.currentTurn).toBeNull();
  });

  it('shows a bust message and lets undo hand play back', () => {
    session.startGame('x01', players, { startingScore: 301 });
    fixture.detectChanges();
    throwAll((dart) => component.onDart(dart), x01BustFrom301);

    fixture.detectChanges();
    expect(component.message()).toContain('Bust');
    expect(component.currentPlayerName()).toBe('Grace');

    component.onUndo();

    expect(component.currentPlayerName()).toBe('Ada');
    expect(session.x01GameState()?.currentTurn?.throws.length).toBe(1);
  });

  it('can play a 301 game to a double checkout', () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }], { startingScore: 301 });
    fixture.detectChanges();
    throwAll((dart) => component.onDart(dart), x01CheckoutFrom301);

    fixture.detectChanges();
    expect(session.status()).toBe('finished');
    expect(session.winnerId()).toBe('p1');
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Ada wins!');
    expect(component.message()).toBeNull();
    expect(native.querySelector('.message')).toBeNull();
  });

  it('asks to confirm leave while live and cancel keeps the game', async () => {
    session.startGame('x01', players);
    fixture.detectChanges();
    spyOn(leaveConfirm, 'ask').and.resolveTo(false);

    await component.leave();

    expect(session.hasSession()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears the session and goes home when leave is confirmed', async () => {
    session.startGame('x01', players);
    fixture.detectChanges();
    spyOn(leaveConfirm, 'ask').and.resolveTo(true);

    await component.leave();

    expect(session.hasSession()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('leaves a finished game without confirm', async () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }], { startingScore: 301 });
    throwAll((dart) => component.onDart(dart), x01CheckoutFrom301);
    const ask = spyOn(leaveConfirm, 'ask');

    await component.leave();

    expect(ask).not.toHaveBeenCalled();
    expect(session.hasSession()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('rematch stays on the route, resets the engine, and keeps history', () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }], { startingScore: 301 });
    fixture.detectChanges();
    throwAll((dart) => component.onDart(dart), x01CheckoutFrom301);
    expect(history.matches().length).toBe(1);

    component.rematch();
    fixture.detectChanges();

    expect(session.status()).toBe('in_progress');
    expect(session.x01GameState()?.scores['p1']).toBe(301);
    expect(history.matches().length).toBe(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
