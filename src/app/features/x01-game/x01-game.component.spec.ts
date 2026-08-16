import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { X01GameComponent } from './x01-game.component';

describe('X01GameComponent', () => {
  let component: X01GameComponent;
  let fixture: ComponentFixture<X01GameComponent>;
  let session: GameSessionService;
  let router: jasmine.SpyObj<Router>;

  const players: Player[] = [
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Grace' },
  ];

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [X01GameComponent],
      providers: [GameSessionService, { provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(X01GameComponent);
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
    expect(session.gameState()?.currentTurn).toBeNull();
  });

  it('shows a bust message and lets undo hand play back', () => {
    session.startGame('x01', players);
    fixture.detectChanges();
    const state = session.gameState();
    if (!state) throw new Error('expected game state');
    state.scores['p1'] = 20;

    component.onDart({ kind: 'triple', target: 10 }); // 30 > 20 → bust

    fixture.detectChanges();
    expect(component.message()).toContain('Bust');
    expect(component.currentPlayerName()).toBe('Grace');

    component.onUndo();

    expect(component.currentPlayerName()).toBe('Ada');
    expect(session.gameState()?.currentTurn?.throws.length).toBe(1);
  });

  it('shows a winner banner and disables the dart input on checkout', () => {
    session.startGame('x01', players);
    fixture.detectChanges();
    const state = session.gameState();
    if (!state) throw new Error('expected game state');
    state.scores['p1'] = 40;

    component.onDart({ kind: 'double', target: 20 });

    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Ada wins!');
    const dartButtons = Array.from(native.querySelectorAll('app-dart-input button'));
    expect(dartButtons.length).toBeGreaterThan(0);
    expect(dartButtons.every((b) => (b as HTMLButtonElement).disabled)).toBeTrue();
  });

  it('can play a full 301 game to completion with no refresh', () => {
    session.startGame('x01', [{ id: 'p1', name: 'Ada' }], { startingScore: 301 });
    fixture.detectChanges();

    // 4 × T20 = 240 → 61; T15 = 45 → 16; D8 = 16 → valid double checkout.
    for (let i = 0; i < 4; i++) {
      component.onDart({ kind: 'triple', target: 20 });
    }
    component.onDart({ kind: 'triple', target: 15 });
    component.onDart({ kind: 'double', target: 8 });

    fixture.detectChanges();
    expect(session.status()).toBe('finished');
    expect(session.winnerId()).toBe('p1');
    expect((fixture.nativeElement as HTMLElement).querySelector('.winner-banner')?.textContent)
      .toContain('Ada wins!');
  });

  it('new game resets the session and returns home', () => {
    session.startGame('x01', players);
    fixture.detectChanges();

    component.newGame();

    expect(session.hasSession()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
