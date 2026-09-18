import { TestBed } from '@angular/core/testing';
import { LeaveConfirmService } from './leave-confirm.service';

describe('LeaveConfirmService', () => {
  let service: LeaveConfirmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeaveConfirmService);
    if (service.open()) service.answer(false);
  });

  it('resolves ask when the player answers', async () => {
    const pending = service.ask();
    expect(service.open()).toBe(true);

    service.answer(false);

    expect(await pending).toBe(false);
    expect(service.open()).toBe(false);
  });

  it('reuses the same promise while open', async () => {
    const first = service.ask();
    const second = service.ask();
    expect(first).toBe(second);

    service.answer(true);

    expect(await first).toBe(true);
  });
});
