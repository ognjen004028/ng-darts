import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let session: GameSessionService;
  let router: jasmine.SpyObj<Router>;

  const players: Player[] = [{ id: 'p1', name: 'Ada' }];

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        GameSessionService,
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not start a session or navigate without players', () => {
    component.players = [];
    component.startGame();

    expect(session.hasSession()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('starts an x01 session and navigates to the x01 game route', () => {
    component.selectedGamemode = 'x01';
    component.selectedX01Score = 301;
    component.players = players;

    component.startGame();

    expect(session.hasSession()).toBe(true);
    expect(session.mode()).toBe('x01');
    expect(session.x01Settings()?.startingScore).toBe(301);
    expect(router.navigate).toHaveBeenCalledWith(['/game/x01-game']);
  });

  it('starts a cricket session and navigates to the cricket game route', () => {
    component.selectedGamemode = 'cricket';
    component.players = players;

    component.startGame();

    expect(session.hasSession()).toBe(true);
    expect(session.mode()).toBe('cricket');
    expect(router.navigate).toHaveBeenCalledWith(['/game/cricket-game']);
  });
});
