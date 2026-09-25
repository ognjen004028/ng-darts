# ng-darts

Pass-and-play darts scorer. The app runs in the browser. Players can play **X01** (301 / 501 / 701) or **Cricket** on one device.

The end goal is a phone app: the same Angular UI, wrapped with **Capacitor** (Android first).

Game rules live in [RULES.md](./RULES.md) and in pure TypeScript engines. The UI does not re-implement the rules.

Session state is in memory. A page refresh ends the game (until Phase 5.2).

## Start the app

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

## Docs

| File | Content |
|------|---------|
| [RULES.md](./RULES.md) | Locked X01 and Cricket rules |
| [architecture.md](./architecture.md) | Folder layout, routing, and conventions |
| [ROADMAP.md](./ROADMAP.md) | Feature phases and status |

## Scripts

| Script | Command |
|--------|---------|
| Start the dev server | `npm start` |

## Try it out online (work in progress)
https://darts-helper.netlify.app/
| Production build | `npm run build` |
| Unit tests (watch) | `npm test` |
| Unit tests (one shot) | `npm run test:ci` |
| Lint | `npm run lint` |
| Format | `npm run format` |
