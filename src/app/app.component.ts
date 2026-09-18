import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LeaveConfirmComponent } from './shared/leave-confirm/leave-confirm.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LeaveConfirmComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}

