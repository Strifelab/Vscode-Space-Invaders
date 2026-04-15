# Contributing to Vscode Space Invaders

Thank you for contributing. This document explains how the project is structured, how the runtime works, and how to make changes safely.

## Project goals

- Keep the extension easy to understand and easy to ship.
- Keep the extension host minimal and move gameplay logic into the webview layer.
- Preserve the retro arcade feel while keeping the codebase dependency light.
- Prefer focused, testable changes over broad rewrites.

## Repository map

- `package.json`: VS Code extension manifest, Marketplace metadata, contributed Explorer view, configuration schema, and npm scripts.
- `esbuild.js`: Bundles the extension host entry point into `dist/extension.js`.
- `src/extension.ts`: Extension entry point. It creates and registers the webview provider.
- `src/GameViewProvider.ts`: Host side bridge between VS Code and the webview. It builds the HTML shell, exposes local assets, reads settings, stores leaderboard data, manages language detection, and pauses gameplay when the view is hidden.
- `media/game.js`: Main game engine. It owns input handling, gameplay state, rendering, collisions, powerups, wave progression, overlays, language management, and message exchange with the host.
- `media/game.css`: Retro UI styling for the canvas container and overlays.
- `media/i18n/config.js`: Supported language list and global translation container.
- `media/i18n/*.js`: Translation files for English, French, Spanish, Italian, German, Portuguese, Chinese, Japanese, Korean, Russian, and Hindi.
- `.vscode/launch.json`: Launch profile for running the extension in an Extension Development Host.

## Architecture overview

The runtime architecture is split into two distinct layers:

1. The extension host runs in Node.js through the VS Code extension API.
2. The game runs inside a webview using standard browser APIs.

The host layer is intentionally minimal and focused. Its responsibilities include:

- Registering the Explorer webview view provider.
- Building the HTML document with Content Security Policy nonce.
- Exposing local resources from the `media/` directory through secure webview URIs.
- Reading the `spaceInvaders` configuration section from VS Code settings.
- Detecting the active language from VS Code locale or user preference.
- Persisting the leaderboard in `context.globalState`.
- Pausing the game when the webview becomes invisible and resuming when it becomes visible again.

The webview layer handles all gameplay concerns:

- Canvas rendering and animation loop.
- Input capture and focus management.
- Difficulty presets and runtime configuration.
- Player, aliens, bullets, explosions, and powerups.
- Wave flow and game over handling.
- Leaderboard and settings overlays.
- Rendering translated labels through the internationalization system.

## Lifecycle and message flow

### Extension activation

When VS Code activates the extension, `src/extension.ts` creates `GameViewProvider` with two dependencies:

- `extensionUri` for locating local assets
- `globalState` for leaderboard persistence

It then registers the provider for the `spaceInvaders.gameView` view id.

### Webview resolution

When the Explorer view is opened, `resolveWebviewView` in `src/GameViewProvider.ts`:

- Enables scripts in the webview
- Restricts local resources to the `media/` folder
- Generates the HTML shell with a CSP nonce
- Loads `game.css`, `game.js`, and the current i18n assets

### Messages from the webview to the host

- `getSettings`: Reads the workspace configuration and sends the current values back to the webview, including difficulty, bullet speed, initial lives, powerup drop rate options, and the active language.
- `saveScore`: Sanitizes the submitted player name, saves the score entry, sorts scores descending, trims the list to the best 10 entries, and returns the updated leaderboard.
- `getLeaderboard`: Returns the stored leaderboard without changing state.

### Messages from the host to the webview

- `settingsData`: Sends difficulty, bullet speed, initial lives, powerup drop rate, powerup drop rate options, and the active language identifier.
- `leaderboardData`: Sends the current leaderboard entries.
- `pause`: Requests the game to pause when the view is no longer visible.
- `resume`: Notifies the game when the view becomes visible again.

## Game engine structure

`media/game.js` is organized as a single self-executing module with logically grouped sections.

### Core state

- `STATE` tracks the high-level game mode: `idle`, `playing`, `paused`, `gameover`, `wavepause`, or `leaderboard`.
- Global arrays store bullets, aliens, explosions, stars, and powerups for efficient access and rendering.
- `settings` is initialized with default values and then synchronized from VS Code configuration on webview load.

### Difficulty and progression

- Difficulty presets define enemy movement interval, enemy shooting interval, bullet speed multiplier, and shots per cycle.
- Wave tiers increase the number of alien rows per enemy type and lower the effective shooting interval.
- Alien speed also scales with the number of enemies left alive, which creates the expected arcade pressure near the end of a wave.
- The configurable powerup drop rate determines the probability of enemies dropping powerups when destroyed.

### Combat systems

- Player fire supports continuous shooting with a cooldown timer to prevent spam.
- Enemies shoot from the lowest alive alien in random columns, creating dynamic threat patterns.
- Collision detection uses axis aligned bounding boxes for accurate hit detection.
- Enemies have type specific hit points and point values, creating strategic depth.
- Temporary powerups grant Triple Shot or Missile behavior with timed durations, while Extra Life increases lives up to the configured maximum.
- Powerup drops are governed by the configurable drop rate percentage.

### Rendering

- All sprites are encoded as pixel matrices inside the file for maximum portability.
- Rendering uses the canvas 2D context exclusively, with no external image dependencies.
- The HUD draws score, wave, lives, and active powerup duration in real time.
- Overlays for settings, pause, leaderboard, and game over are standard DOM elements layered over the canvas.
- All UI text is dynamically updated through the translation system to support multiple languages.

### Localization

The internationalization system provides multi-language support for all in-game UI elements.

- `media/i18n/config.js` defines the list of supported languages and initializes the global translation container `I18N`.
- Each language file (`media/i18n/en.js`, `media/i18n/fr.js`, etc.) provides a complete translation dictionary.
- The host determines the active language from either the `spaceInvaders.language` setting or VS Code's display language when set to `auto`.
- The webview receives the active language identifier and calls `updateUIText()` to apply translations to all DOM elements.
- Players can change the language at runtime through the in-game settings menu.

When adding new UI text:

1. Add the English key and value to `media/i18n/en.js`.
2. Update all other language files with translated equivalents.
3. Reference the translation key using the `t(key)` function in `media/game.js`.
4. Call `updateUIText()` after modifying DOM elements to ensure translations apply correctly.

## Data model and persistence

Leaderboard entries use the following structure:

- `name`: Player name as a string, automatically trimmed to 20 characters on the host side.
- `score`: Total score as a number.
- `wave`: Final wave reached as a number.
- `date`: Timestamp as an ISO 8601 string, generated when the score is saved.

The leaderboard is persisted in `globalState` under the key `spaceInvaders.leaderboard`. The extension maintains only the top 10 scores, sorted by score in descending order. This ensures minimal storage usage while preserving the most significant achievements.

## Development setup

Required environment:

- Node.js LTS release (Node.js 20 or newer recommended for the current toolchain).
- npm package manager.
- Visual Studio Code 1.85.0 or newer.

Install dependencies:

```bash
npm install
```

Run a type check:

```bash
npm run check-types
```

Build the extension host bundle:

```bash
npm run compile
```

Start a watch workflow for live development:

```bash
npm run watch
```

Create a production VSIX package:

```bash
npm run build-vsix
```

## Running the extension locally

The repository includes `.vscode/launch.json` with a preconfigured `Run Extension` launch configuration.

Development workflow:

1. Run `npm install` to install all dependencies.
2. Run `npm run compile` at least once to build the extension bundle.
3. Open the Run and Debug panel in VS Code (Ctrl+Shift+D or Cmd+Shift+D).
4. Select the `Run Extension` configuration and press F5 to launch.
5. In the Extension Development Host, open the Explorer and locate the Space Invaders view.

For continuous development, use `npm run watch` in a terminal to automatically rebuild on file changes. The Extension Development Host can be reloaded with Ctrl+R (Cmd+R on macOS) to apply updates without restarting.

## Contribution guidelines

Follow these practices when making changes:

- Keep changes scoped to a single concern whenever possible.
- Preserve the host and webview separation. Host code should stay focused on VS Code integration and persistence.
- When you add or change a message type, update both `src/GameViewProvider.ts` and `media/game.js` in the same change.
- When you add a new setting, update `package.json`, the runtime code that consumes it, and the documentation files.
- When you add or rename UI text, update all language files in `media/i18n/` to maintain translation completeness.
- Keep webview assets local and CSP safe.
- Avoid introducing large frameworks for the webview unless there is a clear payoff.
- Keep the retro visual language consistent with the current art direction.
- Update documentation when behavior, controls, settings, or architecture change.

## Manual smoke test checklist

Before submitting changes, verify the following behaviors:

1. Confirm `npm run check-types` passes without errors.
2. Confirm `npm run compile` produces `dist/extension.js`.
3. Start the extension in an Extension Development Host.
4. Verify the following behaviors manually:

- The Explorer view loads without webview errors.
- The correct language is applied based on VS Code locale or manual selection.
- A new game starts from the settings overlay.
- Movement, shooting, pause, and resume all work with keyboard input.
- The game pauses when the view becomes hidden.
- Leaderboard entries save and reload correctly.
- Settings from the VS Code configuration are reflected in gameplay.
- Powerups drop at the configured rate and function correctly.
- Wave transitions and game over flow work as expected.
- Language selection from the in-game settings menu applies immediately.
- Difficulty changes take effect when starting a new game.

Test with at least two different difficulty levels and verify the gameplay changes reflect the selected preset.

## Release hygiene

Before preparing a release:

1. Ensure the version number is consistent across `package.json` and `package-lock.json`.
2. Update `CHANGELOG.md` with all user-visible changes since the last release.
3. Verify all smoke tests pass successfully.
4. Build and manually test the VSIX package with `npm run build-vsix`.

Follow Semantic Versioning principles: increment the major version for breaking changes, the minor version for new features, and the patch version for bug fixes.

## Pull requests

When opening a pull request, provide the following information:

- A concise problem statement or feature description.
- A summary of the changes made and the approach taken.
- Screenshots or GIFs for any UI or visual changes.
- The manual verification steps you performed from the smoke test checklist.

Focused pull requests with a single clear purpose are easier to review and safer to merge. Large changes should be split into multiple logical commits when possible.
