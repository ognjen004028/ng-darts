import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { SetupComponent } from './features/setup/setup.component';
import { CricketGameComponent } from './features/cricket-game/cricket-game.component';
import { X01GameComponent } from './features/x01-game/x01-game.component';
import { gameSessionGuard } from './core/guards/game-session.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'setup/:mode', component: SetupComponent},
    { path: 'game/cricket-game', component: CricketGameComponent, canActivate: [gameSessionGuard] },
    { path: 'game/x01-game', component: X01GameComponent, canActivate: [gameSessionGuard] }
];
