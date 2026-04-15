import * as vscode from "vscode";

interface ScoreEntry {
  name: string;
  score: number;
  wave: number;
  date: string;
}

export class GameViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "spaceInvaders.gameView";

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _globalState: vscode.Memento
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "media"),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "getSettings": {
          const config = vscode.workspace.getConfiguration("spaceInvaders");
          const language = this._getLanguage();
          webviewView.webview.postMessage({
            type: "settingsData",
            difficulty: config.get<string>("difficulty", "medium"),
            bulletSpeed: config.get<number>("bulletSpeed", 5),
            initialLives: config.get<number>("initialLives", 3),
            powerupDropRate: config.get<number>("powerupDropRate", 5),
            language: language,
          });
          break;
        }
        case "saveScore": {
          const entry: ScoreEntry = {
            name: String(message.name || "???").substring(0, 20),
            score: Number(message.score) || 0,
            wave: Number(message.wave) || 1,
            date: new Date().toISOString(),
          };
          const scores = this._globalState.get<ScoreEntry[]>(
            "spaceInvaders.leaderboard",
            []
          );
          scores.push(entry);
          scores.sort((a, b) => b.score - a.score);
          const top10 = scores.slice(0, 10);
          this._globalState.update("spaceInvaders.leaderboard", top10);
          webviewView.webview.postMessage({
            type: "leaderboardData",
            scores: top10,
          });
          break;
        }
        case "getLeaderboard": {
          const scores = this._globalState.get<ScoreEntry[]>(
            "spaceInvaders.leaderboard",
            []
          );
          webviewView.webview.postMessage({
            type: "leaderboardData",
            scores,
          });
          break;
        }
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        webviewView.webview.postMessage({ type: "pause" });
      } else {
        webviewView.webview.postMessage({ type: "resume" });
      }
    });
  }

  private _getLanguage(): string {
    const config = vscode.workspace.getConfiguration("spaceInvaders");
    const configLang = config.get<string>("language", "auto");

    if (configLang !== "auto") {
      return configLang;
    }

    // Get VS Code's display language
    const vscodeLocale = vscode.env.language; // e.g., "en", "it", "fr-FR"
    const langCode = vscodeLocale.split("-")[0]; // Extract base language code

    // Check if we support this language
    const supportedLanguages = [
      "en",
      "fr",
      "es",
      "it",
      "de",
      "pt",
      "zh",
      "ja",
      "ko",
      "ru",
      "hi",
    ];

    return supportedLanguages.includes(langCode) ? langCode : "en";
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "game.css")
    );
    const gameJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "game.js")
    );
    const i18nConfigUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "i18n", "config.js")
    );

    // Get all i18n language file URIs
    const supportedLanguages = [
      "en",
      "fr",
      "es",
      "it",
      "de",
      "pt",
      "zh",
      "ja",
      "ko",
      "ru",
      "hi",
    ];
    const i18nScripts = supportedLanguages
      .map((lang) => {
        const uri = webview.asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, "media", "i18n", `${lang}.js`)
        );
        return `<script nonce="${nonce}" src="${uri}"></script>`;
      })
      .join("\n  ");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
  <title>Space Invaders</title>
</head>
<body>
  <div id="game-container">
    <canvas id="gameCanvas" width="345" height="402" tabindex="0"></canvas>

    <div id="buttons">
      <button id="startBtn"></button>
      <button id="stopBtn" style="display:none;"></button>
      <button id="settingsBtn"></button>
      <button id="leaderboardBtn"></button>
    </div>
  </div>

  <!-- Game Over Overlay -->
  <div id="name-overlay" style="display:none;">
    <div id="name-overlay-box">
      <div id="name-overlay-title"></div>
      <div id="name-overlay-score"></div>
      <div id="name-overlay-wave"></div>
      <input id="nameInput" type="text" maxlength="20" placeholder="" autocomplete="off">
      <button id="saveScoreBtn"></button>
    </div>
  </div>

  <!-- Pause Overlay -->
  <div id="pause-overlay" style="display:none;">
    <div id="pause-overlay-box">
      <div id="pause-overlay-title"></div>
      <div id="pause-overlay-message"></div>
    </div>
  </div>

  <!-- Leaderboard Overlay -->
  <div id="leaderboard-overlay" style="display:none;">
    <div id="leaderboard-box">
      <div id="leaderboard-title"></div>
      <table id="leaderboard-table">
        <thead>
          <tr><th id="th-rank"></th><th id="th-name"></th><th id="th-points"></th><th id="th-wave"></th><th id="th-date"></th></tr>
        </thead>
        <tbody id="leaderboard-body"></tbody>
      </table>
      <button id="leaderboardBackBtn"></button>
    </div>
  </div>

  <!-- Settings Overlay -->
  <div id="settings-overlay" style="display:none;">
    <div id="settings-box">
      <div id="settings-title"></div>
      <div id="difficulty-row" class="setting-row">
        <span id="settings-difficulty-label"></span>
        <select id="difficultySelect">
          <option value="easy"></option>
          <option value="medium" selected></option>
          <option value="hard"></option>
        </select>
      </div>
      <div id="difficulty-desc" class="setting-desc"></div>
      <div id="powerup-row" class="setting-row">
        <span id="settings-powerup-label"></span>
        <select id="powerupDropRateSelect">
          <!-- Options populated dynamically from config -->
        </select>
      </div>
      <div id="powerup-desc" class="setting-desc"></div>
      <div id="language-row" class="setting-row">
        <span id="settings-language-label"></span>
        <select id="languageSelect">
          <option value="en"></option>
          <option value="fr"></option>
          <option value="es"></option>
          <option value="it"></option>
          <option value="de"></option>
          <option value="pt"></option>
          <option value="zh"></option>
          <option value="ja"></option>
          <option value="ko"></option>
          <option value="ru"></option>
          <option value="hi"></option>
        </select>
      </div>
      <button id="settingsStartBtn"></button>
      <button id="settingsBackBtn"></button>
    </div>
  </div>

  <script nonce="${nonce}" src="${i18nConfigUri}"></script>
  ${i18nScripts}
  <script nonce="${nonce}" src="${gameJsUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
