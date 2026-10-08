# Emoji Royale 2

Emoji Royale 2 is a modular HTML5 canvas strategy game inspired by Clash Royale. It runs entirely in the browser with plain JavaScript and no build step.

## Features

- Real-time 1v1 battles with two lanes, a river, princess towers, and king towers
- 8-card deck building with a 4-card hand and cycling
- Trophy Road and Casual modes
- Progression systems for chests, quests, season rewards, EVO cards, legends, shop items, and saves
- Debug tools for fast testing

## Run Locally

Requirements:
- Node.js 18+

Commands:

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Project Structure

```text
src/
|-- core/
|   |-- Battle.js
|   |-- Game.js
|   |-- GameConfig.js
|   |-- GameState.js
|   `-- SaveManager.js
|-- entities/
|   |-- Entity.js
|   |-- Tower.js
|   |-- Unit.js
|   |-- Projectile.js
|   |-- Particle.js
|   |-- Shockwave.js
|   `-- FloatingText.js
|-- systems/
|   |-- ChestSystem.js
|   `-- ProgressionSystem.js
`-- ui/
    |-- BattleUI.js
    |-- DebugMenu.js
    |-- Toast.js
    `-- UIManager.js
```

## Notes

- `index.html` now contains the DOM structure and styles.
- Runtime logic is loaded from `src/` as separate browser scripts.
- Saves are stored in `localStorage`.
