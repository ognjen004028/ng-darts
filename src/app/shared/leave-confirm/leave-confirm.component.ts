import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LeaveConfirmService } from '../../core/leave-confirm.service';

@Component({
  selector: 'app-leave-confirm',
  imports: [],
  templateUrl: './leave-confirm.component.html',
  styleUrl: './leave-confirm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveConfirmComponent {
  readonly confirm = inject(LeaveConfirmService);
}
