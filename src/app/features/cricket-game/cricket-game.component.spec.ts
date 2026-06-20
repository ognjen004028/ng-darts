import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CricketGameComponent } from './cricket-game.component';

describe('CricketGameComponent', () => {
  let component: CricketGameComponent;
  let fixture: ComponentFixture<CricketGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CricketGameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CricketGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
