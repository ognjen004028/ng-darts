import { ComponentFixture, TestBed } from '@angular/core/testing';

import { X01GameComponent } from './x01-game.component';

describe('X01GameComponent', () => {
  let component: X01GameComponent;
  let fixture: ComponentFixture<X01GameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [X01GameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(X01GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
