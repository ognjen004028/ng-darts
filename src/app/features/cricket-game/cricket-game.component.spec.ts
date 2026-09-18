import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LeaveConfirmService } from '../../core/leave-confirm.service';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { MatchHistoryService } from '../../state/match-history.service';
import { CricketGameComponent } from './cricket-game.component';
import { cricketCloseAll, throwAll } from '../../../testing/darts';
import { clearPersistedHistory, clearPersistedSession } from '../../../testing/session';

describe('CricketGameComponent', () => {
  let component: CricketGameComponent;
  let fixture: ComponentFixture<CricketGameComponent>;
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
      imports: [CricketGameComponent],
      providers: [GameSessionService, { provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(CricketGameComponent);
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

  it('renders the targets-by-players scoreboard with zones and Undo only', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    const text = native.textContent ?? '';
    expect(text).toContain('Ada');
    expect(text).toContain('Grace');
    for (const target of [20, 19, 18, 17, 16, 15]) {
      expect(text).toContain(`${target}`);
    }
    expect(text).toContain('Bull');
    expect(text).toContain('Points');
    expect(text).toContain('Undo');
    expect(text).not.toContain('End turn');
    expect(text).not.toContain('Up next');
    expect(native.querySelector('app-dart-input')).toBeNull();
    expect(native.querySelector('app-turn-summary')).toBeNull();
    expect(native.querySelectorAll('button.mark-hit').length).toBe(14);
  });

  it('updates a mark when that player zone is tapped', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    clickZone(fixture, '20, Ada, no marks');
    fixture.detectChanges();

    expect(markClass(fixture.nativeElement as HTMLElement, '20', 0)).toContain('mark-1');
  });

  it('lets either player tap without a turn change', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    clickZone(fixture, '20, Ada, no marks');
    clickZone(fixture, '20, Grace, no marks');
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    expect(markClass(native, '20', 0)).toContain('mark-1');
    expect(markClass(native, '20', 1)).toContain('mark-1');
  });

  it('marks a closed target after three singles', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    clickZone(fixture, '20, Ada, no marks');
    clickZone(fixture, '20, Ada, 1 mark');
    clickZone(fixture, '20, Ada, 2 marks');
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    expect(cell(native, '20', 0)?.classList.contains('closed')).toBeTrue();
    expect(markClass(native, '20', 0)).toContain('mark-closed');
  });

  it('finishes when all targets are closed', () => {
    session.startGame('cricket', players);
    throwAll((dart) => session.applyThrow(dart, 'p1'), cricketCloseAll);

    fixture.detectChanges();
    expect(session.status()).toBe('finished');
    expect(session.winnerId()).toBe('p1');
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Ada wins!');
    expect(component.message()).toBeNull();
    expect(native.querySelector('.message')).toBeNull();
  });

  it('does not put a win in the message when the last tap finishes the game', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();
    throwAll((dart) => session.applyThrow(dart, 'p1'), cricketCloseAll.slice(0, -1));
    fixture.detectChanges();
    clickZone(fixture, 'Bull, Ada, 2 marks');

    expect(session.status()).toBe('finished');
    expect(component.message()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.message')).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.winner-banner')?.textContent,
    ).toContain('Ada wins!');
  });

  it('undoes the last tap and restores marks', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    clickZone(fixture, '20, Ada, no marks');
    component.onUndo();
    fixture.detectChanges();

    expect(markClass(fixture.nativeElement as HTMLElement, '20', 0)).toContain('mark-0');
  });

  it('asks to confirm leave while live and cancel keeps the game', async () => {
    session.startGame('cricket', players);
    fixture.detectChanges();
    spyOn(leaveConfirm, 'ask').and.resolveTo(false);

    await component.leave();

    expect(session.hasSession()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears the session and goes home when leave is confirmed', async () => {
    session.startGame('cricket', players);
    fixture.detectChanges();
    spyOn(leaveConfirm, 'ask').and.resolveTo(true);

    await component.leave();

    expect(session.hasSession()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('leaves a finished game without confirm', async () => {
    session.startGame('cricket', players);
    throwAll((dart) => session.applyThrow(dart, 'p1'), cricketCloseAll);
    const ask = spyOn(leaveConfirm, 'ask');

    await component.leave();

    expect(ask).not.toHaveBeenCalled();
    expect(session.hasSession()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('rematch stays on the route, resets the engine, and keeps history', () => {
    session.startGame('cricket', players);
    throwAll((dart) => session.applyThrow(dart, 'p1'), cricketCloseAll);
    expect(history.matches().length).toBe(1);

    component.rematch();
    fixture.detectChanges();

    expect(session.status()).toBe('in_progress');
    expect(session.cricketGameState()?.players['p1'].marks['20']).toBe(0);
    expect(history.matches().length).toBe(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  function clickZone(current: ComponentFixture<CricketGameComponent>, label: string): void {
    const button = (current.nativeElement as HTMLElement).querySelector(
      `button[aria-label="${label}"]`,
    ) as HTMLButtonElement | null;
    button?.click();
    current.detectChanges();
  }

  function markClass(native: HTMLElement, target: string, index: number): string {
    return cell(native, target, index)?.querySelector('.mark')?.className ?? '';
  }

  function cell(native: HTMLElement, target: string, index: number): HTMLTableCellElement | null {
    const rows = Array.from(native.querySelectorAll('tbody tr'));
    const row = rows.find((r) => (r.querySelector('th')?.textContent ?? '').trim() === target);
    return row ? (row.querySelectorAll('td')[index] as HTMLTableCellElement) : null;
  }
});
