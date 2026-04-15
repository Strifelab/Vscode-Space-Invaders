# Space Invaders for Visual Studio Code

Space Invaders for Visual Studio Code brings a compact retro shooter directly into the Explorer side bar. It is a lightweight webview extension built for quick arcade sessions without leaving the editor.

## Why install it

- Play a full canvas based Space Invaders experience inside VS Code.
- Launch the game from a dedicated Explorer view with no extra setup.
- Tune difficulty, bullet speed, starting lives, and powerup drop rates from VS Code settings.
- Save local high scores in a persistent top 10 leaderboard.
- Enjoy wave based progression, enemy health tiers, and temporary powerups.
- Keep your run safe with automatic pause when the webview becomes hidden.
- Play in your preferred language with support for 12 languages.

## What is included

- Retro pixel art presentation designed for a narrow side bar layout.
- Three difficulty presets: easy, medium, and hard.
- Scaling enemy aggression across waves.
- Three powerups: Triple Shot, Missile, and Extra Life.
- Configurable powerup drop rate system for customized gameplay.
- Local leaderboard storage using the VS Code extension state.
- Full internationalization support for 12 languages: English, French, Spanish, Italian, German, Portuguese, Chinese, Japanese, Korean, Russian, and Hindi.

## How to play

1. Install the extension.
2. Open the Explorer view container.
3. Find the Space Invaders view.
4. Click New Game, or focus the canvas and press Enter.
5. Choose a difficulty and start playing.

## Controls

- Move left: A or Left Arrow
- Move right: D or Right Arrow
- Fire: Space
- Pause or resume: P or Escape
- Resume from the pause overlay: click the overlay

Keep the game canvas focused while playing so keyboard input is captured correctly.

## Extension settings

- `spaceInvaders.language`: Sets the game interface language. Set to `auto` to use VS Code's display language, or choose from English, French, Spanish, Italian, German, Portuguese, Chinese, Japanese, Korean, Russian, or Hindi. Default: `auto`.
- `spaceInvaders.difficulty`: Sets the difficulty preset (`easy`, `medium`, or `hard`). Default: `medium`.
- `spaceInvaders.bulletSpeed`: Sets player bullet speed from `1` to `10`. Default: `5`.
- `spaceInvaders.initialLives`: Sets starting lives from `1` to `6`. Default: `3`.
- `spaceInvaders.powerupDropRate`: Sets powerup drop probability as a percentage. Choose from `0`, `10`, `20`, `30`, `40`, or `50`. Default: `20`.

## Privacy and data

This extension does not require an account, does not make network requests, and does not send gameplay data to external services. The leaderboard is stored locally through the VS Code extension state on the machine where the extension runs.

## Requirements

- Visual Studio Code 1.85.0 or newer

## Development snapshot

The extension host is intentionally small. Most gameplay logic lives in the webview assets under `media/`, while the TypeScript host side registers the view, reads configuration, and persists leaderboard data.

The internationalization system automatically detects your VS Code language and loads the appropriate translation. You can also manually select a language from the in-game settings menu.

Useful local commands:

```bash
npm install
npm run check-types
npm run compile
npm run build-vsix
```

For architecture details and contribution workflow, see [CONTRIBUTING.md](CONTRIBUTING.md). For release notes, see [CHANGELOG.md](CHANGELOG.md).

## Notes

- The leaderboard stores the best 10 scores only.
- The view is optimized for the Explorer side bar and uses a fixed canvas size.
- All translations are maintained by contributors and loaded dynamically based on the selected language.
