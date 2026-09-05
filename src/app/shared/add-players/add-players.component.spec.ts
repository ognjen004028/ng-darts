import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player } from '../../domain/models/player';
import { AddPlayersComponent } from './add-players.component';

describe('AddPlayersComponent', () => {
  let component: AddPlayersComponent;
  let fixture: ComponentFixture<AddPlayersComponent>;
  let emitted: Player[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPlayersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPlayersComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.playersChange.subscribe((players) => emitted.push(players));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the default two players on init', () => {
    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBe(2);
    expect(emitted[0][0].name).toBe('Player 1');
  });

  it('emits a new list when a name is edited', () => {
    const firstId = component.players[0].id;
    component.onNameChange(firstId, 'Ada');
    expect(emitted.at(-1)?.[0].name).toBe('Ada');
    expect(emitted.at(-1)).not.toBe(emitted[0]);
  });

  it('adds a trimmed name and ignores a blank add', () => {
    component.newPlayerName = '  Ada  ';
    component.addPlayer();
    expect(component.players.length).toBe(3);
    expect(component.players[2].name).toBe('Ada');
    expect(component.newPlayerName).toBe('');

    const count = component.players.length;
    component.newPlayerName = '   ';
    component.addPlayer();
    expect(component.players.length).toBe(count);
  });

  it('allows at most four players and at least one', () => {
    component.newPlayerName = 'Three';
    component.addPlayer();
    component.newPlayerName = 'Four';
    component.addPlayer();
    component.newPlayerName = 'Five';
    component.addPlayer();
    expect(component.players.length).toBe(4);

    while (component.players.length > 1) {
      component.removePlayer(component.players[0].id);
    }
    const lastId = component.players[0].id;
    component.removePlayer(lastId);
    expect(component.players.length).toBe(1);
  });
});
