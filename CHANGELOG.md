# Changelog

All notable changes to this project are documented in this file.

The project follows Semantic Versioning.

## Unreleased

No unreleased changes yet.

## 1.0.0 (2026-04-15)

### Added

- Added a dedicated Explorer webview that hosts Space Invaders directly inside Visual Studio Code.
- Added a canvas based game loop with keyboard controls, pause support, wave progression, enemy tier health, and score tracking.
- Added difficulty presets and extension settings for difficulty, bullet speed, and initial lives.
- Added random powerups for Triple Shot, Missile, and Extra Life.
- Added configurable powerup drop rate setting with options from 0% to 50%.
- Added a persistent top 10 leaderboard stored with VS Code global state.
- Added retro themed overlays for settings, pause, game over, and leaderboard screens.
- Added comprehensive internationalization system with support for 12 languages: English, French, Spanish, Italian, German, Portuguese, Chinese, Japanese, Korean, Russian, and Hindi.
- Added automatic language detection based on VS Code display language.
- Added in-game language selection menu for runtime language switching.
- Added esbuild based bundling and VSIX packaging scripts for extension distribution.
- Added resume capability when the webview becomes visible again.

### Changed

- Refined the canvas size for the Explorer layout.
- Unified timed powerup durations for more consistent gameplay.

### Notes

This is the first documented public release, featuring a complete internationalization system and customizable gameplay settings.
