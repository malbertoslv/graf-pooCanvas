// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Utilidad: rectángulo con esquinas redondeadas
function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// Clase Particle (chispas al chocar o al perder una pelota)
class Particle {
  constructor(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 3 + 1.5;
    this.life = 1;
    this.decay = Math.random() * 0.03 + 0.02;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= this.decay;
  }

  draw() {
    ctx.globalAlpha = Math.max(this.life, 0);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

// Clase Ball (Pelota)
class Ball {
  constructor(x, y, radius, speedX, speedY, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speedX = speedX;
    this.speedY = speedY;
    this.color = color;
    this.trail = []; // estela de posiciones anteriores
  }

  draw() {
    // Estela con degradado de opacidad
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const progress = (i + 1) / this.trail.length;
      ctx.globalAlpha = progress * 0.35;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * progress, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pelota con resplandor
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Brillo interior
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  move() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.shift();

    this.x += this.speedX;
    this.y += this.speedY;

    // Colisión con la parte superior e inferior
    if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
      this.speedY = -this.speedY;
    }
  }

  reset() {
    // Reaparece en el centro y cambia de dirección
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.speedX = -this.speedX;
    this.trail = [];

    // Nuevo tamaño (entre 5 y 20), distinto al actual
    let newRadius;
    do {
      newRadius = Math.floor(Math.random() * 16) + 5;
    } while (Math.abs(newRadius - this.radius) < 3);
    this.radius = newRadius;

    // Nuevo color aleatorio, distinto al actual
    let newColor;
    do {
      const hue = Math.floor(Math.random() * 360);
      newColor = `hsl(${hue}, 100%, 60%)`;
    } while (newColor === this.color);
    this.color = newColor;
  }
}

// Clase Paddle (Paleta)
class Paddle {
  constructor(x, y, width, height, color, isPlayerControlled = false) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.isPlayerControlled = isPlayerControlled;
    this.speed = 5;
    this.flash = 0; // intensidad del destello al golpear
  }

  draw() {
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15 + this.flash * 30;

    const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
    ctx.fillStyle = gradient;

    roundedRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    // Destello blanco al golpear
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.8;
      ctx.fillStyle = '#ffffff';
      roundedRect(this.x, this.y, this.width, this.height, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.flash -= 0.06;
      if (this.flash < 0) this.flash = 0;
    }

    ctx.shadowBlur = 0;
  }

  move(direction) {
    if (direction == 'up' && this.y > 0) {
      this.y -= this.speed;
    } else if (direction == 'down' && this.y + this.height < canvas.height) {
      this.y += this.speed;
    }
  }

  // Movimiento de la paleta automática (IA)
  autoMove(ball) {
    if (ball.y < this.y + this.height / 2) {
      this.y -= this.speed;
    } else if (ball.y > this.y + this.height / 2) {
      this.y += this.speed;
    }
  }

  // Alinea el centro de la paleta con la pelota (sin salirse del canvas)
  alignTo(ball) {
    this.y = ball.y - this.height / 2;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
  }
}

// Clase Game (Controla el juego)
class Game {
  constructor() {
    // Crear 5 pelotas con diferente tamaño, color y velocidad
    this.balls = [
      new Ball(canvas.width / 2, canvas.height / 2, 10, 4, 4, '#ffffff'),
      new Ball(canvas.width / 2, canvas.height / 2, 15, -3, 5, '#00e5ff'),
      new Ball(canvas.width / 2, canvas.height / 2, 8, 5, -3, '#ff9100'),
      new Ball(canvas.width / 2, canvas.height / 2, 12, -4, -4, '#448aff'),
      new Ball(canvas.width / 2, canvas.height / 2, 6, 3, 6, '#b0bec5')
    ];

    // Paleta del jugador (izquierda): verde y de 200px de alto
    this.paddle1 = new Paddle(0, canvas.height / 2 - 100, 10, 200, '#00e676', true);

    // Paleta de la CPU (derecha): roja y de 100px de alto
    this.paddle2 = new Paddle(canvas.width - 10, canvas.height / 2 - 50, 10, 100, '#ff1744');

    this.keys = {};

    // Efectos visuales
    this.particles = [];
    this.rings = [];
    this.shake = 0;
    this.time = 0;

    // Marcadores
    this.playerHits = 0;
    this.cpuHits = 0;
    this.lostBalls = 0;

    // Estrellas de fondo
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 0.4 + 0.1,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // Genera una explosión de partículas
  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  // Devuelve la pelota que llegará primero a la paleta de la CPU
  getMostUrgentBall() {
    let urgent = null;
    let minTime = Infinity;

    this.balls.forEach(ball => {
      if (ball.speedX <= 0) return; // ignora las que se alejan de la CPU
      const time = (this.paddle2.x - ball.x) / ball.speedX;
      if (time >= 0 && time < minTime) {
        minTime = time;
        urgent = ball;
      }
    });

    return urgent;
  }

  drawBackground() {
    // Degradado oscuro de fondo
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0b0f2b');
    bg.addColorStop(0.5, '#1a1040');
    bg.addColorStop(1, '#0a1a2f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrellas que parpadean y se desplazan lentamente
    this.stars.forEach(star => {
      star.x -= star.speed;
      if (star.x < 0) star.x = canvas.width;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 0.03 + star.phase));
      ctx.globalAlpha = twinkle * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Línea central animada
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 14]);
    ctx.lineDashOffset = -this.time * 0.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Círculo central
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawHUD() {
    ctx.textAlign = 'center';

    // Marcadores grandes y translúcidos
    ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(0, 230, 118, 0.35)';
    ctx.fillText(this.playerHits, canvas.width / 4, 80);
    ctx.fillStyle = 'rgba(255, 23, 68, 0.35)';
    ctx.fillText(this.cpuHits, (canvas.width * 3) / 4, 80);

    // Etiquetas
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText('JUGADOR', canvas.width / 4, 106);
    ctx.fillText('CPU', (canvas.width * 3) / 4, 106);

    // Pelotas perdidas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('PELOTAS PERDIDAS: ' + this.lostBalls, canvas.width / 2, canvas.height - 18);
  }

  draw() {
    this.time++;

    ctx.save();

    // Sacudida de pantalla al perder una pelota
    if (this.shake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
      this.shake *= 0.88;
    } else {
      this.shake = 0;
    }

    this.drawBackground();

    // Ondas expansivas en el centro
    this.rings.forEach(ring => {
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Dibujar todas las pelotas
    this.balls.forEach(ball => ball.draw());

    // Dibujar paletas
    this.paddle1.draw();
    this.paddle2.draw();

    // Partículas
    this.particles.forEach(p => p.draw());

    this.drawHUD();

    ctx.restore();
  }

  update() {
    // Movimiento de la paleta 1 (Jugador) controlado por teclas
    if (this.keys['ArrowUp']) {
      this.paddle1.move('up');
    }
    if (this.keys['ArrowDown']) {
      this.paddle1.move('down');
    }

    // La IA sigue a la pelota más urgente (la que llegará primero)
    const urgentBall = this.getMostUrgentBall();
    if (urgentBall) {
      this.paddle2.autoMove(urgentBall);
    }

    // Actualizar cada pelota
    this.balls.forEach(ball => {
      ball.move();

      // Colisión con la paleta 1 (Jugador)
      if (
        ball.x - ball.radius <= this.paddle1.x + this.paddle1.width &&
        ball.x + ball.radius >= this.paddle1.x &&
        ball.y + ball.radius >= this.paddle1.y &&
        ball.y - ball.radius <= this.paddle1.y + this.paddle1.height
      ) {
        ball.speedX = -ball.speedX;
        ball.x = this.paddle1.x + this.paddle1.width + ball.radius;
        this.paddle1.flash = 1;
        this.playerHits++;
        this.burst(ball.x, ball.y, this.paddle1.color, 12);
      }

      // GARANTÍA: si una pelota llega a la zona de la CPU, la paleta se alinea con ella
      if (ball.speedX > 0 && ball.x + ball.radius >= this.paddle2.x) {
        this.paddle2.alignTo(ball);
      }

      // Colisión con la paleta 2 (CPU)
      if (
        ball.x + ball.radius >= this.paddle2.x &&
        ball.x - ball.radius <= this.paddle2.x + this.paddle2.width &&
        ball.y + ball.radius >= this.paddle2.y &&
        ball.y - ball.radius <= this.paddle2.y + this.paddle2.height
      ) {
        ball.speedX = -ball.speedX;
        ball.x = this.paddle2.x - ball.radius;
        this.paddle2.flash = 1;
        this.cpuHits++;
        this.burst(ball.x, ball.y, this.paddle2.color, 12);
      }

      // Cuando la pelota sale del área de juego: reaparece con otro color y tamaño
      if (
        ball.x - ball.radius <= 0 ||
        ball.x + ball.radius >= canvas.width
      ) {
        // Explosión en el punto de salida
        this.burst(ball.x, ball.y, ball.color, 30);
        this.shake = 14;
        this.lostBalls++;

        ball.reset();

        // Onda expansiva donde reaparece
        this.rings.push({
          x: ball.x,
          y: ball.y,
          radius: ball.radius,
          alpha: 1,
          color: ball.color
        });
      }
    });

    // Actualizar partículas y ondas
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.rings.forEach(r => {
      r.radius += 3;
      r.alpha -= 0.025;
    });
    this.rings = this.rings.filter(r => r.alpha > 0);
  }
}

// Captura de teclas para el control de la paleta
document.addEventListener('keydown', (e) => {
  game.keys[e.key] = true;
  // Evita que las flechas hagan scroll en la página
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
});

document.addEventListener('keyup', (e) => {
  game.keys[e.key] = false;
});

// Inicializar el juego
const game = new Game();

// Bucle de animación
function gameLoop() {
  game.draw();
  game.update();
  requestAnimationFrame(gameLoop);
}

gameLoop();