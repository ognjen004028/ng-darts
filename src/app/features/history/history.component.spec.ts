import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { MatchHistoryService } from '../../state/match-history.service';
import { x01CheckoutFrom301 } from '../../../testing/darts';
import { applyDarts, clearPersistedHistory, clearPersistedSession } from '../../../testing/session';
import { HistoryComponent } from './history.component';

describe('HistoryComponent', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let session: GameSessionService;
  let history: MatchHistoryService;
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
      imports: [HistoryComponent],
      providers: [GameSessionService, MatchHistoryService, { provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    session = TestBed.inject(GameSessionService);
    history = TestBed.inject(MatchHistoryService);
    fixture.detectChanges();
  });

  it('shows an empty state when there are no matches', () => {
    expect(fixture.nativeElement.textContent).toContain('No matches yet.');
  });

  it('lists a finished x01 game', () => {
    session.startGame('x01', [players[0]], { startingScore: 301 });
    applyDarts(session, x01CheckoutFrom301);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('X01');
    expect(text).toContain('Ada');
    expect(text).toContain('Ada wins');
    expect(text).toContain('301');
    expect(text).not.toContain('No matches yet.');
  });

  it('lists a cricket draw', () => {
    history.record({
      mode: 'cricket',
      players,
      winnerId: null,
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Cricket');
    expect(text).toContain('Draw');
    expect(text).toContain('Standard');
  });

  it('goes back to Home', () => {
    fixture.nativeElement.querySelector('.back').click();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
