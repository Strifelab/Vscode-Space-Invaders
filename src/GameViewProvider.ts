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
          webviewView.webview.postMessage({
            type: "settingsData",
            difficulty: config.get<string>("difficulty", "medium"),
            bulletSpeed: config.get<number>("bulletSpeed", 5),
            initialLives: config.get<number>("initialLives", 3),
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
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "game.css")
    );
    const gameJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "game.js")
    );
    const i18nConfigUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "i18n", "config.js")
    );
    const i18nItUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "i18n", "it.js")
    );

    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="it">
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
    <canvas id="gameCanvas" width="300" height="350" tabindex="0"></canvas>

    <div id="buttons">
      <button id="startBtn">Nuova Partita</button>
      <button id="stopBtn">Stop</button>
      <button id="leaderboardBtn">Classifica</button>
    </div>
  </div>

  <!-- Game Over Overlay -->
  <div id="name-overlay" style="display:none;">
    <div id="name-overlay-box">
      <div id="name-overlay-title">GAME OVER</div>
      <div id="name-overlay-score"></div>
      <div id="name-overlay-wave"></div>
      <input id="nameInput" type="text" maxlength="20" placeholder="NOME" autocomplete="off">
      <button id="saveScoreBtn">Salva</button>
    </div>
  </div>

  <!-- Pause Overlay -->
  <div id="pause-overlay" style="display:none;">
    <div id="pause-overlay-box">
      <div id="pause-overlay-title">PAUSA</div>
      <div id="pause-overlay-message">Premi P per riprendere</div>
    </div>
  </div>

  <!-- Leaderboard Overlay -->
  <div id="leaderboard-overlay" style="display:none;">
    <div id="leaderboard-box">
      <div id="leaderboard-title">CLASSIFICA</div>
      <table id="leaderboard-table">
        <thead>
          <tr><th>#</th><th>Nome</th><th>Punti</th><th>Ondata</th><th>Data</th></tr>
        </thead>
        <tbody id="leaderboard-body"></tbody>
      </table>
      <button id="leaderboardBackBtn">Indietro</button>
    </div>
  </div>

  <!-- Settings Overlay -->
  <div id="settings-overlay" style="display:none;">
    <div id="settings-box">
      <div id="settings-title">IMPOSTAZIONI</div>
      <div class="setting-row">
        <span>DIFFICOLT\u00C0</span>
        <select id="difficultySelect">
          <option value="easy">Facile</option>
          <option value="medium" selected>Medio</option>
          <option value="hard">Difficile</option>
        </select>
      </div>
      <div id="difficulty-desc" class="setting-desc"></div>
      <button id="settingsStartBtn">GIOCA</button>
      <button id="settingsBackBtn">Indietro</button>
    </div>
  </div>

  <script nonce="${nonce}" src="${i18nConfigUri}"></script>
  <script nonce="${nonce}" src="${i18nItUri}"></script>
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
