const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');

const court = {
  width: canvas.width,
  height: canvas.height,
};

const keys = {
  left: false,
  right: false,
  up: false,
};

const state = {
  score: 0,
  combo: 1,
  timeLeft: 45,
  running: false,
  lastTime: 0,
  shotCooldown: 0,
  shotPower: 0,
  shotCharge: false,
  pointer: { x: 0, y: 0 },
  message: 'CLICK TO START',
};

const player = {
  x: 150,
  y: 480,
  w: 42,
  h: 92,
  vx: 0,
  vy: 0,
  speed: 6,
  jumpPower: 14,
  grounded: true,
};

const defender = {
  x: 670,
  y: 470,
  w: 40,
  h: 90,
  vx: 0,
  dir: -1,
};

const hoop = {
  x: 760,
  y: 180,
  width: 120,
  height: 94,
  rimY: 200,
}

const ball = {
  x: player.x + 32,
  y: player.y - 10,
  radius: 14,
  vx: 0,
  vy: 0,
  inHand: true,
  shotActive: false,
  lastTouch: 'player',
};

function resetPlayer() {
  player.x = 150;
  player.y = 480;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
}

function resetBall() {
  ball.x = player.x + 30;
  ball.y = player.y - 6;
  ball.vx = 0;
  ball.vy = 0;
  ball.inHand = true;
  ball.shotActive = false;
  ball.lastTouch = 'player';
}

function updateHud() {
  scoreEl.textContent = state.score;
  comboEl.textContent = `x${state.combo}`;
  timerEl.textContent = Math.max(0, Math.ceil(state.timeLeft));
}

function startGame() {
  state.running = true;
  state.score = 0;
  state.combo = 1;
  state.timeLeft = 45;
  state.shotCooldown = 0;
  state.message = 'PLAY!';
  resetPlayer();
  resetBall();
  updateHud();
}

function endGame() {
  state.running = false;
  state.message = 'GAME OVER';
  startBtn.textContent = 'Play Again';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function handlesInput() {
  if (!state.running) return;

  if (keys.left) player.vx = -player.speed;
  else if (keys.right) player.vx = player.speed;
  else player.vx = 0;

  if (keys.up && player.grounded) {
    player.vy = -player.jumpPower;
    player.grounded = false;
  }

  player.x += player.vx;
  player.x = clamp(player.x, 36, court.width - 50);

  player.vy += 0.65;
  player.y += player.vy;

  if (player.y >= 480) {
    player.y = 480;
    player.vy = 0;
    player.grounded = true;
  }
}

function updateDefender() {
  defender.vx = defender.dir * 2.1;
  defender.x += defender.vx;

  if (defender.x < 540 || defender.x > 820) {
    defender.dir *= -1;
  }
}

function aimBallFromPointer() {
  if (ball.inHand && state.running) {
    const dx = state.pointer.x - (ball.x + 8);
    const dy = state.pointer.y - ball.y;
    const distance = Math.hypot(dx, dy) || 1;
    const aimX = dx / distance;
    const aimY = dy / distance;

    const power = clamp(Math.hypot(dx, dy) * 0.08, 6, 18);
    state.shotPower = power;

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + aimX * 42, ball.y + aimY * 42);
    ctx.stroke();
  }
}

function shootBall() {
  if (!ball.inHand || !state.running || state.shotCooldown > 0) return;

  const dx = state.pointer.x - ball.x;
  const dy = state.pointer.y - ball.y;
  const length = Math.hypot(dx, dy) || 1;

  const power = clamp(length * 0.14, 8, 18);

  ball.vx = (dx / length) * power;
  ball.vy = (dy / length) * power - 2;
  ball.inHand = false;
  ball.shotActive = true;
  ball.lastTouch = 'player';
  state.shotCooldown = 600;
}

function updateBall() {
  if (!ball.inHand && state.running) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy += 0.2;

    if (ball.x < 10) {
      ball.x = 10;
      ball.vx *= -0.6;
    }

    if (ball.x > court.width - 10) {
      ball.x = court.width - 10;
      ball.vx *= -0.6;
    }

    if (ball.y > court.height - 16) {
      ball.y = court.height - 16;
      ball.vy *= -0.68;
      ball.vx *= 0.92;
      if (Math.abs(ball.vy) < 1) {
        ball.vy = 0;
      }
    }

    const isTouchingDefender =
      Math.abs(ball.x - defender.x) < 30 &&
      Math.abs(ball.y - defender.y) < 35;

    if (isTouchingDefender && ball.lastTouch !== 'defender') {
      ball.vx *= -0.8;
      ball.vy -= 1.4;
      ball.lastTouch = 'defender';
    }

    const hoopLeft = hoop.x;
    const hoopRight = hoop.x + hoop.width;
    const hoopTop = hoop.y;
    const hoopBottom = hoop.y + 60;

    const inHoopZone =
      ball.x > hoopLeft + 18 &&
      ball.x < hoopRight - 18 &&
      ball.y > hoopTop - 8 &&
      ball.y < hoopBottom + 5;

    if (inHoopZone && ball.vy > 0.8) {
      const rimY = hoop.rimY;
      const rimXLeft = hoop.x + 18;
      const rimXRight = hoop.x + hoop.width - 18;

      if (ball.x > rimXLeft && ball.x < rimXRight && ball.y > rimY - 8 && ball.y < rimY + 12) {
        scoreShot();
      }
    }

    if (ball.y > court.height + 40) {
      resetBall();
    }
  } else {
    ball.x = player.x + 30;
    ball.y = player.y - 6;
  }

  if (state.shotCooldown > 0) state.shotCooldown -= 1;
}

function scoreShot() {
  state.score += 2 * state.combo;
  state.combo = Math.min(8, state.combo + 1);
  updateHud();
  ball.inHand = true;
  ball.shotActive = false;
  ball.vx = 0;
  ball.vy = 0;
  ball.x = player.x + 30;
  ball.y = player.y - 6;
  state.timeLeft = Math.min(45, state.timeLeft + 0.8);
}

function checkTimer() {
  if (!state.running) return;
  state.timeLeft -= 1 / 60;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endGame();
  }
  updateHud();
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  state.pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener('pointerdown', (event) => {
  if (!state.running) return;
  shootBall();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
  if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') keys.up = true;
  if (event.code === 'Space') {
    event.preventDefault();
    shootBall();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
  if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') keys.up = false;
});

startBtn.addEventListener('click', () => {
  startGame();
});

function drawBackground() {
  ctx.clearRect(0, 0, court.width, court.height);

  ctx.fillStyle = '#88d0ff';
  ctx.fillRect(0, 0, court.width, 260);

  ctx.fillStyle = '#6fd372';
  ctx.fillRect(0, 260, court.width, court.height - 260);

  ctx.fillStyle = '#f3f7ff';
  ctx.fillRect(0, 260, court.width, 12);

  ctx.fillStyle = '#dfeaf5';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(45 + i * 90, 470, 40, 90);
  }

  ctx.fillStyle = '#f1f9ff';
  ctx.fillRect(70, 220, 120, 200);

  ctx.fillStyle = '#2f475c';
  ctx.fillRect(hoop.x, hoop.y, hoop.width, 12);
  ctx.fillRect(hoop.x + 22, hoop.y + 12, 18, 56);
  ctx.fillRect(hoop.x + 88, hoop.y + 12, 18, 56);

  ctx.strokeStyle = '#f6cf45';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hoop.x + 20, hoop.y + 10);
  ctx.lineTo(hoop.x + 20, hoop.y + 80);
  ctx.moveTo(hoop.x + hoop.width - 20, hoop.y + 10);
  ctx.lineTo(hoop.x + hoop.width - 20, hoop.y + 80);
  ctx.stroke();

  ctx.strokeStyle = '#f7d96a';
  ctx.beginPath();
  ctx.arc(hoop.x + hoop.width / 2, hoop.y + 26, 38, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#f6cf45';
  ctx.beginPath();
  ctx.arc(hoop.x + hoop.width / 2, hoop.y + 30, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  ctx.fillStyle = '#f0b76b';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 25, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e7f6ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 8);
  ctx.lineTo(player.x, player.y + 28);
  ctx.moveTo(player.x - 12, player.y + 10);
  ctx.lineTo(player.x - 18, player.y + 42);
  ctx.moveTo(player.x + 12, player.y + 10);
  ctx.lineTo(player.x + 18, player.y + 42);
  ctx.moveTo(player.x - 10, player.y + 25);
  ctx.lineTo(player.x - 22, player.y + 56);
  ctx.moveTo(player.x + 10, player.y + 25);
  ctx.lineTo(player.x + 22, player.y + 56);
  ctx.stroke();

  ctx.fillStyle = '#ff5c6a';
  ctx.fillRect(player.x - 22, player.y - 6, 44, 24);
}

function drawDefender() {
  ctx.fillStyle = '#f7c06b';
  ctx.beginPath();
  ctx.arc(defender.x, defender.y - 25, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(defender.x, defender.y - 8);
  ctx.lineTo(defender.x, defender.y + 28);
  ctx.moveTo(defender.x - 12, defender.y + 10);
  ctx.lineTo(defender.x - 18, defender.y + 42);
  ctx.moveTo(defender.x + 12, defender.y + 10);
  ctx.lineTo(defender.x + 18, defender.y + 42);
  ctx.moveTo(defender.x - 10, defender.y + 25);
  ctx.lineTo(defender.x - 22, defender.y + 56);
  ctx.moveTo(defender.x + 10, defender.y + 25);
  ctx.lineTo(defender.x + 22, defender.y + 56);
  ctx.stroke();

  ctx.fillStyle = '#ff7f50';
  ctx.fillRect(defender.x - 22, defender.y - 6, 44, 24);
}

function drawBall() {
  ctx.fillStyle = '#f8d633';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8e5e00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawAimLine() {
  if (!ball.inHand || !state.running) return;
  const dx = state.pointer.x - ball.x;
  const dy = state.pointer.y - ball.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(ball.x + nx * 60, ball.y + ny * 60);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMessage() {
  ctx.fillStyle = 'rgba(7, 20, 33, 0.48)';
  ctx.fillRect(310, 30, 350, 52);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, canvas.width / 2, 64);
}

function gameLoop(timestamp) {
  const delta = (timestamp - state.lastTime) / 1000 || 0;
  state.lastTime = timestamp;

  if (state.running) {
    handlesInput();
    updateDefender();
    updateBall();
    checkTimer();
  }

  drawBackground();
  drawPlayer();
  drawDefender();
  drawBall();
  drawAimLine();
  drawMessage();

  requestAnimationFrame(gameLoop);
}

updateHud();
resetPlayer();
resetBall();
requestAnimationFrame(gameLoop);
