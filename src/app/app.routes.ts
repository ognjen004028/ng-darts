import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { CricketGameComponent } from './features/cricket-game/cricket-game.component';
import { X01GameComponent } from './features/x01-game/x01-game.component';
import { gameSessionGuard } from './core/guards/game-session.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'game/cricket-game',
    component: CricketGameComponent,
    canActivate: [gameSessionGuard],
    data: { mode: 'cricket' },
  },
  {
    path: 'game/x01-game',
    component: X01GameComponent,
    canActivate: [gameSessionGuard],
    data: { mode: 'x01' },
  },
  { path: '**', redirectTo: '' },
];
