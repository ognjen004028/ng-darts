import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { CricketGameComponent } from './cricket-game.component';
import { cricketCloseAll, throwAll } from '../../../testing/darts';

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

    component.onDart({ kind: 'single', target: 19 });
    component.onDart({ kind: 'single', target: 18 });
    expect(component.currentPlayerName()).toBe('Grace');
  });

  it('finishes when all targets are closed', () => {
    session.startGame('cricket', players);
    fixture.detectChanges();
    throwAll((dart) => component.onDart(dart), cricketCloseAll);

    fixture.detectChanges();
    expect(session.status()).toBe('finished');
    expect(session.winnerId()).toBe('p1');
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

  function cellText(native: HTMLElement, target: string, index: number): string {
    return cell(native, target, index)?.textContent?.trim() ?? '';
  }

  function cell(native: HTMLElement, target: string, index: number): HTMLTableCellElement | null {
    const rows = Array.from(native.querySelectorAll('tbody tr'));
    const row = rows.find((r) => (r.querySelector('th')?.textContent ?? '').trim() === target);
    return row ? (row.querySelectorAll('td')[index] as HTMLTableCellElement) : null;
  }
});
