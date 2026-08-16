import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { CricketGameComponent } from './cricket-game.component';

describe('CricketGameComponent', () => {
  let component: CricketGameComponent;
  let fixture: ComponentFixture<CricketGameComponent>;
  let session: GameSessionService;
  let router: jasmine.SpyObj<Router>;

  const players: Player[] = [
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Grace' },
  ];

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [CricketGameComponent],
      providers: [GameSessionService, { provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(CricketGameComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows no active session before a game starts', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No active session.');
  });

  it('renders the targets-by-players scoreboard with 0 marks and points', () => {
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
    expect(component.currentPlayerName()).toBe('Ada');
  });

  it('updates marks when a dart is thrown', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    component.onDart({ kind: 'single', target: 20 });
    component.onDart({ kind: 'triple', target: 19 });

    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    expect(cellText(native, '20', 0)).toBe('1');
    expect(cellText(native, '19', 0)).toBe('3');
  });

  it('marks a closed target and passes play after 3 darts', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    component.onDart({ kind: 'triple', target: 20 });

    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    const closedCell = cell(native, '20', 0);
    expect(closedCell?.classList.contains('closed')).toBeTrue();

    // Two more darts auto-end Ada's turn.
    component.onDart({ kind: 'single', target: 19 });
    component.onDart({ kind: 'single', target: 18 });
    expect(component.currentPlayerName()).toBe('Grace');
  });

  it('shows a winner banner when all targets are closed', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();
    const state = session.cricketGameState();
    if (!state) throw new Error('expected game state');
    for (const target of state.settings.targets.filter((t) => t !== 15)) {
      state.players['p1'].marks[String(target)] = 3;
    }

    component.onDart({ kind: 'triple', target: 15 });

    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Ada wins!');
    expect(session.status()).toBe('finished');
    expect(session.winnerId()).toBe('p1');
  });

  it('shows a draw banner when a deadlock ends level', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();
    const state = session.cricketGameState();
    if (!state) throw new Error('expected game state');
    for (const target of state.settings.targets) {
      state.players['p1'].marks[String(target)] = 3;
      state.players['p2'].marks[String(target)] = 3;
    }
    state.players['p1'].points = 80;
    state.players['p2'].points = 80;

    component.onDart({ kind: 'miss' });

    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Draw!');
    expect(session.status()).toBe('finished');
    expect(session.winnerId()).toBeNull();
  });

  it('undoes a thrown dart and restores marks', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    component.onDart({ kind: 'single', target: 20 });
    component.onUndo();

    fixture.detectChanges();
    expect(cellText(fixture.nativeElement as HTMLElement, '20', 0)).toBe('0');
  });

  it('new game resets the session and returns home', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();

    component.newGame();

    expect(session.hasSession()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  /** Text of the player `index` cell in the scoreboard row for `target`. */
  function cellText(native: HTMLElement, target: string, index: number): string {
    return cell(native, target, index)?.textContent?.trim() ?? '';
  }

  /** The player `index` cell in the scoreboard row for `target`. */
  function cell(native: HTMLElement, target: string, index: number): HTMLTableCellElement | null {
    const rows = Array.from(native.querySelectorAll('tbody tr'));
    const row = rows.find(
      (r) => (r.querySelector('th')?.textContent ?? '').trim() === target,
    );
    return row ? (row.querySelectorAll('td')[index] as HTMLTableCellElement) : null;
  }
});
