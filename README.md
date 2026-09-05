# ng-darts

Pass-and-play darts scorer. The app runs in the browser. Players can play **X01** (301 / 501 / 701) or **Cricket** on one device.

Game rules live in pure TypeScript engines. The UI does not re-implement the rules.

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
| Production build | `npm run build` |
| Unit tests (watch) | `npm test` |
| Unit tests (one shot) | `npm run test:ci` |
| Lint | `npm run lint` |
| Format | `npm run format` |
