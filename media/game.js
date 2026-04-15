/* ============================================================================
   SPACE INVADERS — Game Engine
   ============================================================================
   Canvas-based retro arcade game running inside a VS Code webview.
   ============================================================================ */

(function () {
  "use strict";

  // ── VS Code API ──────────────────────────────────────────────────────────
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  // ── i18n helper ──────────────────────────────────────────────────────────
  const LANG = "it";
  function t(key) {
    return (I18N[LANG] && I18N[LANG][key]) || key;
  }

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const leaderboardBtn = document.getElementById("leaderboardBtn");
  const nameOverlay = document.getElementById("name-overlay");
  const nameScore = document.getElementById("name-overlay-score");
  const nameWave = document.getElementById("name-overlay-wave");
  const nameInput = document.getElementById("nameInput");
  const saveScoreBtn = document.getElementById("saveScoreBtn");
  const pauseOverlay = document.getElementById("pause-overlay");
  const leaderboardOverlay = document.getElementById("leaderboard-overlay");
  const leaderboardBody = document.getElementById("leaderboard-body");
  const leaderboardBackBtn = document.getElementById("leaderboardBackBtn");
  const settingsOverlay = document.getElementById("settings-overlay");
  const difficultySelect = document.getElementById("difficultySelect");
  const difficultyDesc = document.getElementById("difficulty-desc");
  const settingsStartBtn = document.getElementById("settingsStartBtn");
  const settingsBackBtn = document.getElementById("settingsBackBtn");

  // ── Customisable constants ───────────────────────────────────────────────
  const CANVAS_W = 345;
  const CANVAS_H = 402;
  const PLAYER_W = 18;
  const PLAYER_H = 11;
  const PLAYER_SPEED = 3;
  const SHOOT_COOLDOWN = 150; // ms between shots (continuous fire)
  const BULLET_W = 2;
  const BULLET_H = 5;
  const ALIEN_COLS = 11;
  const ALIEN_SIZE = 10;
  const ALIEN_PAD = 6;
  const ALIEN_TOP = 24;
  const ALIEN_DROP = 8;
  const INVULN_MS = 2000;
  const WAVE_PAUSE_MS = 1500;
  const EXPLOSION_FRAMES = 12;
  const POWERUP_SIZE = 15;
  const POWERUP_FALL_SPEED = 1.5;
  const POWERUP_DROP_CHANCE = 0.08;
  const POWERUP_DURATION_MS = 8000; // durata boost in ms (parametrizzabile)
  const TRIPLESHOT_DURATION = POWERUP_DURATION_MS;
  const MISSILE_RADIUS = 25;
  const MISSILE_SHOTS = 3;
  const MAX_LIVES = 6;

  // ── Difficulty presets ───────────────────────────────────────────────────
  const DIFFICULTY = {
    easy: {
      moveInterval: 1200,
      shootInterval: 2500,
      bulletMul: 0.8,
      shotsPerCycle: 1,
    },
    medium: {
      moveInterval: 800,
      shootInterval: 1800,
      bulletMul: 1.0,
      shotsPerCycle: 1,
    },
    hard: {
      moveInterval: 500,
      shootInterval: 1200,
      bulletMul: 1.2,
      shotsPerCycle: 2,
    },
  };

  // Wave-tier aggression multipliers (lower = aliens shoot faster)
  const WAVE_TIER_AGGRESSION = [1.0, 0.7, 0.5]; // tier 0 (w1-3), tier 1 (w4-6), tier 2 (w7+)

  // ── Settings (overridden by VS Code config) ──────────────────────────────
  let settings = { difficulty: "medium", bulletSpeed: 5, initialLives: 3 };

  // ── Sprite definitions (pixel-art matrices) ──────────────────────────────
  // Each sprite is an array of rows; each row is a string of 0/1.
  // Rendered at ALIEN_SIZE scale via fillRect.

  const SPRITES = {
    // Squid — 8×8, 30 pts
    squidA: [
      "00011000",
      "00111100",
      "01111110",
      "11011011",
      "11111111",
      "00100100",
      "01011010",
      "10100101",
    ],
    squidB: [
      "00011000",
      "00111100",
      "01111110",
      "11011011",
      "11111111",
      "01011010",
      "10000001",
      "01000010",
    ],
    // Crab — 11×8, 20 pts
    crabA: [
      "00100000100",
      "00010001000",
      "00111111100",
      "01101110110",
      "11111111111",
      "10111111101",
      "10100000101",
      "00011011000",
    ],
    crabB: [
      "00100000100",
      "10010001001",
      "10111111101",
      "11101110111",
      "11111111111",
      "01111111110",
      "00100000100",
      "01000000010",
    ],
    // Octopus — 12×8, 10 pts
    octopusA: [
      "000011110000",
      "001111111100",
      "011111111110",
      "110011001101", // Nota: 12 wide, asimmetria intenzionale per look retro
      "111111111111",
      "001001001000", // Tentacoli giù a sinistra, alternati
      "010110110100",
      "110000000011",
    ],
    octopusB: [
      "000011110000",
      "001111111100",
      "011111111110",
      "110011001101",
      "111111111111",
      "010110110100",
      "100100100110",
      "010010010010",
    ],
    // Player — 15×8
    player: [
      "000000100000000",
      "000001110000000",
      "000001110000000",
      "011111111111100",
      "111111111111110",
      "111111111111110",
      "111111111111110",
      "111111111111110",
    ],
    // Explosion — 8×8
    explosion: [
      "10000001",
      "00100100",
      "01000010",
      "00000000",
      "00000000",
      "01000010",
      "00100100",
      "10000001",
    ],
  };

  // Base alien types (top → bottom: squid, crab, octopus)
  const BASE_ALIEN_TYPES = [
    { a: "squidA", b: "squidB", color: "#ff00ff", points: 30, hp: 3 },
    { a: "crabA", b: "crabB", color: "#ffcc00", points: 20, hp: 2 },
    { a: "octopusA", b: "octopusB", color: "#00ff41", points: 10, hp: 1 },
  ];

  // ── Game state ───────────────────────────────────────────────────────────
  let STATE = "idle"; // idle | playing | paused | gameover | wavepause | leaderboard
  let score = 0;
  let wave = 1;
  let lives = 3;
  let player = { x: 0, y: 0 };
  let playerBullets = [];
  let alienBullets = [];
  let aliens = [];
  let alienRows = 3; // dynamic — set by spawnAliens each wave
  let alienDir = 1; // 1 = right, -1 = left
  let alienFrame = 0; // animation frame toggle (0 or 1)
  let alienMoveTimer = 0;
  let alienShootTimer = 0;
  let alienMoveInterval = 800;
  let alienShootInterval = 1800;
  let bulletSpeedFactor = 1;
  let invulnTimer = 0;
  let explosions = [];
  let stars = [];
  let wavePauseTimer = 0;
  let shootCooldownTimer = 0;
  let powerups = [];
  let activePowerup = null;
  let lastTime = 0;

  // ── Input ────────────────────────────────────────────────────────────────
  const keys = {};

  canvas.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Space",
        "KeyA",
        "KeyD",
      ].includes(e.code)
    ) {
      e.preventDefault();
    }
    // Open settings with Enter from idle
    if (e.code === "Enter" && STATE === "idle") {
      showSettings();
    }
    // Pause
    if ((e.code === "KeyP" || e.code === "Escape") && STATE === "playing") {
      pauseGame();
    } else if (
      (e.code === "KeyP" || e.code === "Escape") &&
      STATE === "paused"
    ) {
      resumeGame();
    }
  });

  canvas.addEventListener("keydown", function (e) {
    // Shoot on Space — fire immediately on first press
    if (
      e.code === "Space" &&
      STATE === "playing" &&
      !e.repeat &&
      shootCooldownTimer <= 0
    ) {
      shootPlayer();
      shootCooldownTimer = SHOOT_COOLDOWN;
    }
  });

  canvas.addEventListener("keyup", function (e) {
    keys[e.code] = false;
  });

  // Keep focus on canvas
  canvas.addEventListener("blur", function () {
    if (STATE === "playing") {
      // Small delay to allow button clicks to register
      setTimeout(function () {
        if (STATE === "playing") canvas.focus();
      }, 100);
    }
  });

  // ── Button handlers ──────────────────────────────────────────────────────
  startBtn.addEventListener("click", function () {
    showSettings();
  });

  stopBtn.addEventListener("click", function () {
    if (STATE === "playing" || STATE === "paused") {
      STATE = "gameover";
      showGameOver();
    }
  });

  leaderboardBtn.addEventListener("click", function () {
    if (STATE === "idle" || STATE === "gameover") {
      showLeaderboard();
    }
  });

  saveScoreBtn.addEventListener("click", function () {
    saveScore();
  });

  nameInput.addEventListener("keydown", function (e) {
    if (e.code === "Enter") saveScore();
  });

  leaderboardBackBtn.addEventListener("click", function () {
    leaderboardOverlay.style.display = "none";
    STATE = "idle";
    canvas.focus();
  });

  pauseOverlay.addEventListener("click", function () {
    if (STATE === "paused") resumeGame();
  });

  // ── Settings handlers ────────────────────────────────────────────────────
  var DIFFICULTY_DESCRIPTIONS = {
    easy: "Nemici lenti, pochi colpi. Perfetto per iniziare.",
    medium: "Velocit\u00E0 ed aggressivit\u00E0 bilanciate.",
    hard: "Nemici veloci, colpi multipli. Buona fortuna!",
  };

  function updateDifficultyDesc() {
    difficultyDesc.textContent =
      DIFFICULTY_DESCRIPTIONS[difficultySelect.value] || "";
  }

  difficultySelect.addEventListener("change", updateDifficultyDesc);

  function showSettings() {
    difficultySelect.value = settings.difficulty;
    updateDifficultyDesc();
    settingsOverlay.style.display = "flex";
  }

  settingsStartBtn.addEventListener("click", function () {
    settings.difficulty = difficultySelect.value;
    settingsOverlay.style.display = "none";
    startGame();
    canvas.focus();
  });

  settingsBackBtn.addEventListener("click", function () {
    settingsOverlay.style.display = "none";
    STATE = "idle";
    canvas.focus();
  });

  // ── VS Code message handler ──────────────────────────────────────────────
  window.addEventListener("message", function (e) {
    const msg = e.data;
    switch (msg.type) {
      case "settingsData":
        settings.difficulty = msg.difficulty || "medium";
        settings.bulletSpeed = msg.bulletSpeed || 5;
        settings.initialLives = msg.initialLives || 3;
        break;
      case "leaderboardData":
        renderLeaderboard(msg.scores || []);
        break;
      case "pause":
        if (STATE === "playing") pauseGame();
        break;
    }
  });

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    generateStars();
    vscode.postMessage({ type: "getSettings" });
    drawIdleScreen();
    canvas.focus();
  }

  function generateStars() {
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: Math.random() < 0.3 ? 2 : 1,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  }

  // ── Start / Stop / Pause ─────────────────────────────────────────────────
  function startGame() {
    score = 0;
    wave = 1;
    lives = settings.initialLives;
    const diff = DIFFICULTY[settings.difficulty] || DIFFICULTY.medium;
    alienMoveInterval = diff.moveInterval;
    alienShootInterval = diff.shootInterval;
    bulletSpeedFactor = diff.bulletMul * (settings.bulletSpeed / 5);

    player = { x: CANVAS_W / 2 - PLAYER_W / 2, y: CANVAS_H - 20 };
    playerBullets = [];
    alienBullets = [];
    explosions = [];
    powerups = [];
    activePowerup = null;
    invulnTimer = 0;

    spawnAliens();

    nameOverlay.style.display = "none";
    pauseOverlay.style.display = "none";
    leaderboardOverlay.style.display = "none";
    settingsOverlay.style.display = "none";
    STATE = "playing";
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function pauseGame() {
    STATE = "paused";
    pauseOverlay.style.display = "flex";
  }

  function resumeGame() {
    pauseOverlay.style.display = "none";
    STATE = "playing";
    lastTime = performance.now();
    canvas.focus();
    requestAnimationFrame(gameLoop);
  }

  function showGameOver() {
    nameOverlay.style.display = "flex";
    nameScore.textContent = t("points") + ": " + score;
    nameWave.textContent = t("waveReached") + ": " + wave;
    nameInput.value = "";
    nameInput.focus();
  }

  function saveScore() {
    const name = nameInput.value.trim() || "???";
    vscode.postMessage({
      type: "saveScore",
      name: name,
      score: score,
      wave: wave,
    });
    nameOverlay.style.display = "none";
    STATE = "idle";
    drawIdleScreen();
    canvas.focus();
  }

  function showLeaderboard() {
    STATE = "leaderboard";
    leaderboardOverlay.style.display = "flex";
    vscode.postMessage({ type: "getLeaderboard" });
  }

  function renderLeaderboard(scores) {
    leaderboardBody.innerHTML = "";
    if (scores.length === 0) {
      var row = document.createElement("tr");
      row.innerHTML =
        '<td colspan="5" style="text-align:center;opacity:0.5">' +
        t("noScores") +
        "</td>";
      leaderboardBody.appendChild(row);
      return;
    }
    scores.forEach(function (entry, i) {
      var row = document.createElement("tr");
      var d = new Date(entry.date);
      var dateStr = d.toLocaleDateString(t("dateLocale"));
      row.innerHTML =
        "<td>" +
        (i + 1) +
        "</td>" +
        "<td>" +
        escapeHtml(entry.name) +
        "</td>" +
        "<td>" +
        entry.score +
        "</td>" +
        "<td>" +
        entry.wave +
        "</td>" +
        "<td>" +
        dateStr +
        "</td>";
      leaderboardBody.appendChild(row);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Wave helpers ──────────────────────────────────────────────────────────
  function getWaveTier() {
    if (wave <= 3) return 0;
    if (wave <= 6) return 1;
    return 2;
  }

  function getRowsPerType() {
    return getWaveTier() + 1; // 1, 2, or 3
  }

  // ── Alien spawning ───────────────────────────────────────────────────────
  function spawnAliens() {
    aliens = [];
    alienDir = 1;
    alienFrame = 0;
    alienMoveTimer = 0;
    alienShootTimer = 0;

    var rowsPerType = getRowsPerType();
    alienRows = BASE_ALIEN_TYPES.length * rowsPerType;

    var totalW = ALIEN_COLS * (ALIEN_SIZE + ALIEN_PAD) - ALIEN_PAD;
    var startX = (CANVAS_W - totalW) / 2;
    var startY = ALIEN_TOP;

    var rowIndex = 0;
    for (var t = 0; t < BASE_ALIEN_TYPES.length; t++) {
      for (var r = 0; r < rowsPerType; r++) {
        for (var col = 0; col < ALIEN_COLS; col++) {
          aliens.push({
            x: startX + col * (ALIEN_SIZE + ALIEN_PAD),
            y: startY + rowIndex * (ALIEN_SIZE + ALIEN_PAD),
            row: rowIndex,
            col: col,
            alive: true,
            hp: BASE_ALIEN_TYPES[t].hp,
            type: BASE_ALIEN_TYPES[t],
          });
        }
        rowIndex++;
      }
    }
  }

  // ── Shooting ─────────────────────────────────────────────────────────────
  function shootPlayer() {
    var cx = player.x + PLAYER_W / 2;
    var by = player.y - BULLET_H;
    if (activePowerup && activePowerup.type === "missile") {
      // Triple parallel vertical shots
      playerBullets.push({
        x: cx - BULLET_W / 2,
        y: by,
        vx: 0,
        isMissile: false,
      });
      playerBullets.push({
        x: cx - BULLET_W / 2 - 4,
        y: by,
        vx: 0,
        isMissile: false,
      });
      playerBullets.push({
        x: cx - BULLET_W / 2 + 4,
        y: by,
        vx: 0,
        isMissile: false,
      });
    } else if (activePowerup && activePowerup.type === "tripleshot") {
      playerBullets.push({
        x: cx - BULLET_W / 2,
        y: by,
        vx: 0,
        isMissile: false,
      });
      playerBullets.push({
        x: cx - BULLET_W / 2,
        y: by,
        vx: -1.2,
        isMissile: false,
      });
      playerBullets.push({
        x: cx - BULLET_W / 2,
        y: by,
        vx: 1.2,
        isMissile: false,
      });
    } else {
      playerBullets.push({
        x: cx - BULLET_W / 2,
        y: by,
        vx: 0,
        isMissile: false,
      });
    }
  }

  function alienShoot() {
    // Pick a random alive alien from the bottom of each column
    var bottomAliens = [];
    for (var col = 0; col < ALIEN_COLS; col++) {
      var bottom = null;
      for (var row = alienRows - 1; row >= 0; row--) {
        var idx = row * ALIEN_COLS + col;
        if (aliens[idx] && aliens[idx].alive) {
          bottom = aliens[idx];
          break;
        }
      }
      if (bottom) bottomAliens.push(bottom);
    }
    if (bottomAliens.length === 0) return;

    // Number of simultaneous shots: difficulty base + extra at tier 2
    var diff = DIFFICULTY[settings.difficulty] || DIFFICULTY.medium;
    var shots = diff.shotsPerCycle;
    if (getWaveTier() === 2) shots++;

    for (var s = 0; s < shots; s++) {
      var shooter =
        bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
      alienBullets.push({
        x: shooter.x + ALIEN_SIZE / 2 - BULLET_W / 2,
        y: shooter.y + ALIEN_SIZE,
      });
    }
  }

  // ── Game loop ────────────────────────────────────────────────────────────
  function gameLoop(timestamp) {
    if (STATE !== "playing" && STATE !== "wavepause") return;

    var dt = timestamp - lastTime;
    lastTime = timestamp;

    // Cap delta to prevent huge jumps after tab switch
    if (dt > 100) dt = 16;

    if (STATE === "wavepause") {
      wavePauseTimer -= dt;
      if (wavePauseTimer <= 0) {
        STATE = "playing";
        spawnAliens();
      }
      drawFrame(dt);
      requestAnimationFrame(gameLoop);
      return;
    }

    updatePlayer(dt);
    updateBullets(dt);
    updateAliens(dt);
    checkCollisions();
    updateExplosions(dt);
    updatePowerups(dt);

    // Check win/lose
    if (aliensAlive() === 0 && STATE === "playing") {
      nextWave();
    }

    drawFrame(dt);

    if (STATE === "playing" || STATE === "wavepause") {
      requestAnimationFrame(gameLoop);
    }
  }

  // ── Update functions ─────────────────────────────────────────────────────
  function updatePlayer(dt) {
    var move = (PLAYER_SPEED * dt) / 16; // normalise to ~60 fps
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      player.x -= move;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      player.x += move;
    }
    // Clamp
    if (player.x < 0) player.x = 0;
    if (player.x > CANVAS_W - PLAYER_W) player.x = CANVAS_W - PLAYER_W;

    // Continuous fire while Space is held
    if (shootCooldownTimer > 0) {
      shootCooldownTimer -= dt;
    }
    if (keys["Space"] && shootCooldownTimer <= 0) {
      shootPlayer();
      shootCooldownTimer = SHOOT_COOLDOWN;
    }

    // Invulnerability timer
    if (invulnTimer > 0) {
      invulnTimer -= dt;
      if (invulnTimer < 0) invulnTimer = 0;
    }
  }

  function updateBullets(dt) {
    var speed = 6 * bulletSpeedFactor;

    // Player bullets — move up (+ diagonal vx)
    for (var i = playerBullets.length - 1; i >= 0; i--) {
      playerBullets[i].y -= speed;
      playerBullets[i].x += (playerBullets[i].vx || 0) * bulletSpeedFactor;
      if (
        playerBullets[i].y + BULLET_H < 0 ||
        playerBullets[i].x < -BULLET_W ||
        playerBullets[i].x > CANVAS_W
      ) {
        playerBullets.splice(i, 1);
      }
    }

    // Alien bullets — move down
    var alienBulletSpeed = 3.5 * bulletSpeedFactor;
    for (var j = alienBullets.length - 1; j >= 0; j--) {
      alienBullets[j].y += alienBulletSpeed;
      if (alienBullets[j].y > CANVAS_H) {
        alienBullets.splice(j, 1);
      }
    }
  }

  function updateAliens(dt) {
    var aliveCount = aliensAlive();
    if (aliveCount === 0) return;

    // Speed up as fewer aliens remain
    var speedFactor = Math.max(0.2, aliveCount / (ALIEN_COLS * alienRows));
    var waveFactor = Math.max(0.4, 1 - (wave - 1) * 0.05);
    var currentMoveInterval = alienMoveInterval * speedFactor * waveFactor;
    var tierAggression = WAVE_TIER_AGGRESSION[getWaveTier()];
    var currentShootInterval =
      alienShootInterval *
      tierAggression *
      Math.max(0.5, 1 - (wave - 1) * 0.03);

    alienMoveTimer += dt;
    alienShootTimer += dt;

    // Move aliens
    if (alienMoveTimer >= currentMoveInterval) {
      alienMoveTimer = 0;
      alienFrame = 1 - alienFrame; // toggle animation

      // Check bounds
      var needDrop = false;
      for (var i = 0; i < aliens.length; i++) {
        if (!aliens[i].alive) continue;
        var nextX = aliens[i].x + alienDir * 10;
        if (nextX < 0 || nextX + ALIEN_SIZE > CANVAS_W) {
          needDrop = true;
          break;
        }
      }

      if (needDrop) {
        alienDir *= -1;
        for (var j = 0; j < aliens.length; j++) {
          if (aliens[j].alive) {
            aliens[j].y += ALIEN_DROP;
          }
        }
        // Check if aliens reached player
        for (var k = 0; k < aliens.length; k++) {
          if (aliens[k].alive && aliens[k].y + ALIEN_SIZE >= player.y) {
            STATE = "gameover";
            showGameOver();
            return;
          }
        }
      } else {
        for (var m = 0; m < aliens.length; m++) {
          if (aliens[m].alive) {
            aliens[m].x += alienDir * 10;
          }
        }
      }
    }

    // Alien shooting
    if (alienShootTimer >= currentShootInterval) {
      alienShootTimer = 0;
      alienShoot();
    }
  }

  function checkCollisions() {
    // Player bullets → aliens
    for (var i = playerBullets.length - 1; i >= 0; i--) {
      var b = playerBullets[i];
      for (var j = 0; j < aliens.length; j++) {
        var a = aliens[j];
        if (!a.alive) continue;
        if (
          aabb(b.x, b.y, BULLET_W, BULLET_H, a.x, a.y, ALIEN_SIZE, ALIEN_SIZE)
        ) {
          playerBullets.splice(i, 1);
          if (b.isMissile) {
            // Legacy: no longer used, treat as normal hit
            a.hp--;
            if (a.hp <= 0) {
              a.alive = false;
              score += a.type.points;
              spawnExplosion(
                a.x + ALIEN_SIZE / 2,
                a.y + ALIEN_SIZE / 2,
                a.type.color,
              );
              maybeSpawnPowerup(a.x + ALIEN_SIZE / 2, a.y + ALIEN_SIZE / 2);
            } else {
              spawnExplosion(
                a.x + ALIEN_SIZE / 2,
                a.y + ALIEN_SIZE / 2,
                "#ffffff",
              );
            }
          } else {
            a.hp--;
            if (a.hp <= 0) {
              a.alive = false;
              score += a.type.points;
              spawnExplosion(
                a.x + ALIEN_SIZE / 2,
                a.y + ALIEN_SIZE / 2,
                a.type.color,
              );
              maybeSpawnPowerup(a.x + ALIEN_SIZE / 2, a.y + ALIEN_SIZE / 2);
            } else {
              spawnExplosion(
                a.x + ALIEN_SIZE / 2,
                a.y + ALIEN_SIZE / 2,
                "#ffffff",
              );
            }
          }
          break;
        }
      }
    }

    // Powerups → player
    for (var p = powerups.length - 1; p >= 0; p--) {
      var pu = powerups[p];
      if (
        aabb(
          pu.x,
          pu.y,
          POWERUP_SIZE,
          POWERUP_SIZE,
          player.x,
          player.y,
          PLAYER_W,
          PLAYER_H,
        )
      ) {
        collectPowerup(pu);
        powerups.splice(p, 1);
      }
    }

    // Alien bullets → player
    if (invulnTimer <= 0) {
      for (var k = alienBullets.length - 1; k >= 0; k--) {
        var ab = alienBullets[k];
        if (
          aabb(
            ab.x,
            ab.y,
            BULLET_W,
            BULLET_H,
            player.x,
            player.y,
            PLAYER_W,
            PLAYER_H,
          )
        ) {
          alienBullets.splice(k, 1);
          lives--;
          spawnExplosion(
            player.x + PLAYER_W / 2,
            player.y + PLAYER_H / 2,
            "#00ff41",
          );
          if (lives <= 0) {
            STATE = "gameover";
            showGameOver();
            return;
          }
          invulnTimer = INVULN_MS;
        }
      }
    }
  }

  function aabb(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  function aliensAlive() {
    var count = 0;
    for (var i = 0; i < aliens.length; i++) {
      if (aliens[i].alive) count++;
    }
    return count;
  }

  function nextWave() {
    wave++;
    playerBullets = [];
    alienBullets = [];
    powerups = [];
    STATE = "wavepause";
    wavePauseTimer = WAVE_PAUSE_MS;
  }

  // ── Missile explosion (legacy, kept for safety) ────────────────────
  function missileExplode(cx, cy) {
    spawnExplosion(cx, cy, "#ff6600");
  }

  // ── Powerups ─────────────────────────────────────────────────────────
  function maybeSpawnPowerup(x, y) {
    if (Math.random() > POWERUP_DROP_CHANCE) return;
    var types = ["tripleshot", "missile", "extralife"];
    var type = types[Math.floor(Math.random() * types.length)];
    powerups.push({ x: x - POWERUP_SIZE / 2, y: y, type: type });
  }

  function collectPowerup(pu) {
    switch (pu.type) {
      case "tripleshot":
        activePowerup = { type: "tripleshot", timer: TRIPLESHOT_DURATION };
        break;
      case "missile":
        activePowerup = { type: "missile", timer: POWERUP_DURATION_MS };
        break;
      case "extralife":
        if (lives < MAX_LIVES) lives++;
        break;
    }
  }

  function updatePowerups(dt) {
    for (var i = powerups.length - 1; i >= 0; i--) {
      powerups[i].y += POWERUP_FALL_SPEED;
      if (powerups[i].y > CANVAS_H) {
        powerups.splice(i, 1);
      }
    }
    if (
      activePowerup &&
      (activePowerup.type === "tripleshot" || activePowerup.type === "missile")
    ) {
      activePowerup.timer -= dt;
      if (activePowerup.timer <= 0) activePowerup = null;
    }
  }

  // ── Explosions ───────────────────────────────────────────────────────────
  function spawnExplosion(cx, cy, color) {
    var particles = [];
    for (var i = 0; i < 8; i++) {
      var angle = (Math.PI * 2 * i) / 8;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * (1.5 + Math.random() * 2),
        vy: Math.sin(angle) * (1.5 + Math.random() * 2),
      });
    }
    explosions.push({
      particles: particles,
      color: color,
      life: EXPLOSION_FRAMES,
    });
  }

  function updateExplosions(dt) {
    for (var i = explosions.length - 1; i >= 0; i--) {
      var ex = explosions[i];
      ex.life--;
      for (var j = 0; j < ex.particles.length; j++) {
        ex.particles[j].x += ex.particles[j].vx;
        ex.particles[j].y += ex.particles[j].vy;
      }
      if (ex.life <= 0) {
        explosions.splice(i, 1);
      }
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  function drawFrame(dt) {
    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    drawStars();

    // Aliens
    drawAliens();

    // Player
    drawPlayer();

    // Bullets
    drawBullets();

    // Explosions
    drawExplosions();

    // Powerups
    drawPowerups();

    // HUD
    drawHUD();

    // Wave pause text
    if (STATE === "wavepause") {
      drawCenteredText(t("wave") + " " + wave, CANVAS_H / 2, 16, "#00ccff");
    }
  }

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.fillStyle = "rgba(255,255,255," + s.brightness + ")";
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  function drawSprite(sprite, x, y, color, scale) {
    var rows = SPRITES[sprite];
    if (!rows) return;
    var spriteW = rows[0].length;
    var spriteH = rows.length;
    var px = scale / Math.max(spriteW, spriteH);

    ctx.fillStyle = color;
    for (var r = 0; r < spriteH; r++) {
      for (var c = 0; c < spriteW; c++) {
        if (rows[r][c] === "1") {
          ctx.fillRect(x + c * px, y + r * px, Math.ceil(px), Math.ceil(px));
        }
      }
    }
  }

  function drawAliens() {
    for (var i = 0; i < aliens.length; i++) {
      var a = aliens[i];
      if (!a.alive) continue;
      var spriteKey = alienFrame === 0 ? a.type.a : a.type.b;
      drawSprite(spriteKey, a.x, a.y, a.type.color, ALIEN_SIZE);
      // HP bar for multi-hp aliens
      if (a.hp > 1) {
        var barW = ALIEN_SIZE;
        var barY = a.y - 3;
        ctx.fillStyle = "#333";
        ctx.fillRect(a.x, barY, barW, 2);
        ctx.fillStyle = a.type.color;
        ctx.fillRect(a.x, barY, barW * (a.hp / a.type.hp), 2);
      }
    }
  }

  function drawPlayer() {
    // Blink if invulnerable
    if (invulnTimer > 0 && Math.floor(invulnTimer / 100) % 2 === 0) return;
    drawSprite("player", player.x, player.y, "#00ff41", PLAYER_W);
  }

  function drawBullets() {
    // Player bullets
    ctx.fillStyle = "#00ff41";
    for (var i = 0; i < playerBullets.length; i++) {
      var b = playerBullets[i];
      ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
    }
    // Alien bullets
    ctx.fillStyle = "#ff0040";
    for (var j = 0; j < alienBullets.length; j++) {
      ctx.fillRect(alienBullets[j].x, alienBullets[j].y, BULLET_W, BULLET_H);
    }
  }

  function drawExplosions() {
    for (var i = 0; i < explosions.length; i++) {
      var ex = explosions[i];
      var alpha = ex.life / EXPLOSION_FRAMES;
      ctx.fillStyle = ex.color;
      ctx.globalAlpha = alpha;
      for (var j = 0; j < ex.particles.length; j++) {
        var p = ex.particles[j];
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawPowerups() {
    for (var i = 0; i < powerups.length; i++) {
      var pu = powerups[i];
      var s = POWERUP_SIZE;
      var px = pu.x;
      var py = pu.y;

      // Background circle
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();

      if (pu.type === "extralife") {
        // Red heart pixel icon (7x6 in 8x8 box)
        ctx.fillStyle = "#ff0040";
        var h = [
          "01101100",
          "11111110",
          "11111110",
          "01111100",
          "00111000",
          "00010000",
        ];
        var ps = s / 8;
        for (var r = 0; r < h.length; r++) {
          for (var c = 0; c < h[r].length; c++) {
            if (h[r][c] === "1")
              ctx.fillRect(px + c * ps, py + r * ps + ps, ps + 0.5, ps + 0.5);
          }
        }
      } else if (pu.type === "tripleshot") {
        // Green Y shape
        ctx.fillStyle = "#00ff41";
        var yy = [
          "10000010",
          "01000100",
          "00101000",
          "00010000",
          "00010000",
          "00010000",
        ];
        var ps2 = s / 8;
        for (var r2 = 0; r2 < yy.length; r2++) {
          for (var c2 = 0; c2 < yy[r2].length; c2++) {
            if (yy[r2][c2] === "1")
              ctx.fillRect(
                px + c2 * ps2,
                py + r2 * ps2 + ps2,
                ps2 + 0.5,
                ps2 + 0.5,
              );
          }
        }
      } else if (pu.type === "missile") {
        // Cyan ||| icon (3 vertical bars)
        ctx.fillStyle = "#00ccff";
        var bars = [
          "01010100",
          "01010100",
          "01010100",
          "01010100",
          "01010100",
          "01010100",
        ];
        var ps3 = s / 8;
        for (var r3 = 0; r3 < bars.length; r3++) {
          for (var c3 = 0; c3 < bars[r3].length; c3++) {
            if (bars[r3][c3] === "1")
              ctx.fillRect(
                px + c3 * ps3,
                py + r3 * ps3 + ps3,
                ps3 + 0.5,
                ps3 + 0.5,
              );
          }
        }
      }

      // Border (round)
      var borderColor = "#666";
      if (pu.type === "extralife") borderColor = "#ff0040";
      else if (pu.type === "tripleshot") borderColor = "#00ff41";
      else if (pu.type === "missile") borderColor = "#00ccff";
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  function drawHUD() {
    ctx.font = "12px 'Courier New', Consolas, monospace";
    ctx.textBaseline = "top";

    // Score — left
    ctx.fillStyle = "#00ff41";
    ctx.textAlign = "left";
    ctx.fillText(t("score").toUpperCase() + ": " + score, 5, 4);

    // Wave — center
    ctx.textAlign = "center";
    ctx.fillText(t("wave").toUpperCase() + ": " + wave, CANVAS_W / 2, 4);

    // Lives — right (red hearts)
    ctx.textAlign = "right";
    ctx.fillStyle = "#ff0040";
    ctx.fillText(t("lives").toUpperCase() + ": ", CANVAS_W - 5 - lives * 12, 4);
    for (var i = 0; i < lives; i++) {
      var hx = CANVAS_W - 5 - (lives - i) * 12;
      ctx.fillStyle = "#ff0040";
      ctx.font = "12px 'Courier New', Consolas, monospace";
      ctx.fillText("\u2665", hx, 4);
    }

    // Separator line
    ctx.strokeStyle = "rgba(0,255,65,0.2)";
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(CANVAS_W, 20);
    ctx.stroke();

    // Active powerup loadbar + label
    if (activePowerup) {
      var barY = 22;
      var barH = 4;
      var barW = CANVAS_W - 10;
      var barX = 5;
      var puColor = "#00ccff";
      var puText = "";
      var ratio = 0;
      if (activePowerup.type === "tripleshot") {
        puColor = "#00ff41";
        puText = "TRIPLE SHOT";
        ratio = Math.max(0, activePowerup.timer / TRIPLESHOT_DURATION);
      } else if (activePowerup.type === "missile") {
        puColor = "#00ccff";
        puText = "|||  MISSILE";
        ratio = Math.max(0, activePowerup.timer / POWERUP_DURATION_MS);
      }
      if (puText) {
        // Bar background
        ctx.fillStyle = "#222";
        ctx.fillRect(barX, barY, barW, barH);
        // Bar fill
        ctx.fillStyle = puColor;
        ctx.fillRect(barX, barY, barW * ratio, barH);
        // Bar border
        ctx.strokeStyle = puColor;
        ctx.strokeRect(barX, barY, barW, barH);
        // Label
        ctx.fillStyle = puColor;
        ctx.font = "bold 8px 'Courier New', Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(puText, CANVAS_W / 2, barY + barH + 1);
      }
    }
  }

  function drawCenteredText(text, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = "bold " + size + "px 'Courier New', Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, CANVAS_W / 2, y);
  }

  // ── Idle screen ──────────────────────────────────────────────────────────
  function drawIdleScreen() {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawStars();

    // Title
    drawCenteredText("SPACE INVADERS", CANVAS_H / 2 - 75, 21, "#00ff41");

    // Decorative alien sprites
    drawSprite("squidA", CANVAS_W / 2 - 36, CANVAS_H / 2 - 40, "#ff00ff", 10);
    drawSprite("crabA", CANVAS_W / 2 - 5, CANVAS_H / 2 - 40, "#ffcc00", 10);
    drawSprite("octopusA", CANVAS_W / 2 + 24, CANVAS_H / 2 - 40, "#00ff41", 10);

    // Score table
    ctx.font = "10px 'Courier New', Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#ff00ff";
    ctx.fillText(
      "= 30 " + t("points").toUpperCase(),
      CANVAS_W / 2 - 30,
      CANVAS_H / 2 - 11,
    );
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(
      "= 20 " + t("points").toUpperCase(),
      CANVAS_W / 2,
      CANVAS_H / 2 + 1,
    );
    ctx.fillStyle = "#00ff41";
    ctx.fillText(
      "= 10 " + t("points").toUpperCase(),
      CANVAS_W / 2 + 30,
      CANVAS_H / 2 + 13,
    );

    // Instructions
    drawCenteredText(
      t("pressStart").toUpperCase(),
      CANVAS_H / 2 + 42,
      10,
      "#00ccff",
    );
    drawCenteredText(
      "A/\u2190 \u2192/D MOVE  SPACE FIRE  P PAUSE",
      CANVAS_H / 2 + 58,
      7,
      "rgba(0,255,65,0.5)",
    );
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────
  init();
})();
