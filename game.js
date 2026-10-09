// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Clase Ball (Pelota)
class Ball {
  constructor(x, y, radius, speedX, speedY, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speedX = speedX;
    this.speedY = speedY;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  move() {
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
      newColor = `hsl(${hue}, 100%, 55%)`;
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
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
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
      new Ball(canvas.width / 2, canvas.height / 2, 10, 4, 4, 'white'),
      new Ball(canvas.width / 2, canvas.height / 2, 15, -3, 5, 'cyan'),
      new Ball(canvas.width / 2, canvas.height / 2, 8, 5, -3, 'orange'),
      new Ball(canvas.width / 2, canvas.height / 2, 12, -4, -4, 'blue'),
      new Ball(canvas.width / 2, canvas.height / 2, 6, 3, 6, 'gray')
    ];

    // Paleta del jugador (izquierda): verde y de 200px de alto
    this.paddle1 = new Paddle(0, canvas.height / 2 - 100, 10, 200, 'green', true);

    // Paleta de la CPU (derecha): roja y de 100px de alto
    this.paddle2 = new Paddle(canvas.width - 10, canvas.height / 2 - 50, 10, 100, 'red');

    this.keys = {};
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

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar todas las pelotas
    this.balls.forEach(ball => ball.draw());

    // Dibujar paletas
    this.paddle1.draw();
    this.paddle2.draw();
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
      }

      // Cuando la pelota sale del área de juego: reaparece con otro color y tamaño
      if (
        ball.x - ball.radius <= 0 ||
        ball.x + ball.radius >= canvas.width
      ) {
        ball.reset();
      }
    });
  }
}

// Captura de teclas para el control de la paleta
document.addEventListener('keydown', (e) => {
  game.keys[e.key] = true;
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