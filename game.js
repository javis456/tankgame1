// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TANK_SPEED = 3;
const TANK_SIZE = 32;  // 1 unit
// Calculate diagonal length of tank for corridor size (√2 * TANK_SIZE)
const CORRIDOR_SIZE = Math.ceil(TANK_SIZE * 1.5); // Minimum space needed for tank rotation
const BULLET_SPEED = 5;
const ROTATION_SPEED = Math.PI / 32; // Rotation speed in radians (about 5.625 degrees per press)
const BRICK_SIZE = 32;
const MAX_ENEMIES = 4;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Event listeners for keyboard controls
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {
        shoot(player);
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Game state
let score = 0;
let lives = 3;
let gameLoop;
let keys = {};
let enemies = [];
let gameOver = false;
let walls = [];
let flags = {
    player: { x: BRICK_SIZE * 24, y: BRICK_SIZE * 7, health: 100 },
    enemy: { x: BRICK_SIZE * 3, y: BRICK_SIZE * 3, health: 100 }
};

// Map layout (1: wall, 0: empty, 2: player flag, 3: enemy flag)
// Each corridor is now 6 units wide (192 pixels) to ensure plenty of space for tanks
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0,0,1],
    [1,0,0,1,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1],
    [1,0,0,1,0,1,0,0,0,0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,0,1,0,0,0,0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,0,1,0,0,0,0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,0,0,1,0,0,0,1],
    [1,0,0,1,0,1,0,0,0,0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,0,0,1,0,0,0,1],
    [1,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,1,0,0,0,1],
    [1,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Initialize walls from map with proper spacing
function initializeMap() {
    walls = [];
    for(let y = 0; y < MAP.length; y++) {
        for(let x = 0; x < MAP[y].length; x++) {
            if(MAP[y][x] === 1) {
                walls.push({
                    x: x * BRICK_SIZE,
                    y: y * BRICK_SIZE,
                    width: BRICK_SIZE,
                    height: BRICK_SIZE
                });
            }
        }
    }
}

// Player tank - start facing upward
const player = {
    x: BRICK_SIZE * 20 + BRICK_SIZE/2, // Center in the wider corridor
    y: BRICK_SIZE * 9 + BRICK_SIZE/2,  // Start in bottom lane
    width: TANK_SIZE,
    height: TANK_SIZE,
    speed: TANK_SPEED,
    direction: -Math.PI / 2,
    bullets: [],
    health: 100
};

function createEnemy(x, y) {
    return {
        x: x,
        y: y,
        width: TANK_SIZE,
        height: TANK_SIZE,
        speed: TANK_SPEED,
        direction: Math.PI,
        bullets: [],
        health: 100,
        lastShot: 0
    };
}

function initializeEnemies() {
    enemies = [];
    const positions = [
        { x: BRICK_SIZE * 2 + BRICK_SIZE/2, y: BRICK_SIZE * 1 + BRICK_SIZE/2 },    // Left lane
        { x: BRICK_SIZE * 11 + BRICK_SIZE/2, y: BRICK_SIZE * 1 + BRICK_SIZE/2 },   // Middle-left lane
        { x: BRICK_SIZE * 19 + BRICK_SIZE/2, y: BRICK_SIZE * 1 + BRICK_SIZE/2 },   // Middle-right lane
        { x: BRICK_SIZE * 27 + BRICK_SIZE/2, y: BRICK_SIZE * 1 + BRICK_SIZE/2 }    // Right lane
    ];
    
    for(let i = 0; i < MAX_ENEMIES; i++) {
        enemies.push(createEnemy(positions[i].x, positions[i].y));
    }
}

function checkWallCollision(object, newX, newY) {
    const newPos = {
        x: newX,
        y: newY,
        width: object.width,
        height: object.height
    };
    
    return walls.some(wall => checkCollision(newPos, wall));
}

function updatePlayer() {
    if (gameOver) return;

    // Store current position
    let newX = player.x;
    let newY = player.y;

    // Rotate tank
    if (keys['ArrowLeft']) {
        player.direction -= ROTATION_SPEED;
    }
    if (keys['ArrowRight']) {
        player.direction += ROTATION_SPEED;
    }

    // Move forward/backward based on current rotation
    if (keys['ArrowUp']) {
        newX += Math.cos(player.direction) * player.speed;
        newY += Math.sin(player.direction) * player.speed;
    }
    if (keys['ArrowDown']) {
        newX -= Math.cos(player.direction) * player.speed;
        newY -= Math.sin(player.direction) * player.speed;
    }

    // Check wall collisions before updating position
    if (!checkWallCollision(player, newX, player.y)) {
        player.x = newX;
    }
    if (!checkWallCollision(player, player.x, newY)) {
        player.y = newY;
    }

    // Keep player within playable area (one brick width from the boundary)
    player.x = Math.max(BRICK_SIZE + 1, Math.min(CANVAS_WIDTH - BRICK_SIZE - player.width - 1, player.x));
    player.y = Math.max(BRICK_SIZE + 1, Math.min(CANVAS_HEIGHT - BRICK_SIZE - player.height - 1, player.y));
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        // More sophisticated AI: patrol and attack
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        // Update enemy direction to face the player
        enemy.direction = Math.atan2(dy, dx);
        
        if (distanceToPlayer < 200) { // If player is close, try to maintain distance
            let newX = enemy.x;
            let newY = enemy.y;
            
            // Move perpendicular to player direction to circle around
            newX += Math.cos(enemy.direction + Math.PI/2) * enemy.speed;
            newY += Math.sin(enemy.direction + Math.PI/2) * enemy.speed;
            
            // Check wall collisions and update position
            if (!checkWallCollision(enemy, newX, enemy.y)) {
                enemy.x = newX;
            }
            if (!checkWallCollision(enemy, enemy.x, newY)) {
                enemy.y = newY;
            }
            
            // Shoot more frequently when close
            const currentTime = Date.now();
            if (currentTime - enemy.lastShot > 1000) { // Shoot every 1 second when close
                shoot(enemy);
                enemy.lastShot = currentTime;
            }
        } else { // If player is far, move towards them
            let newX = enemy.x + Math.cos(enemy.direction) * enemy.speed;
            let newY = enemy.y + Math.sin(enemy.direction) * enemy.speed;
            
            // Check wall collisions and update position
            if (!checkWallCollision(enemy, newX, enemy.y)) {
                enemy.x = newX;
            }
            if (!checkWallCollision(enemy, enemy.x, newY)) {
                enemy.y = newY;
            }
            
            // Shoot less frequently when far
            const currentTime = Date.now();
            if (currentTime - enemy.lastShot > 2000) { // Shoot every 2 seconds when far
                shoot(enemy);
                enemy.lastShot = currentTime;
            }
        }

        // Keep enemy within canvas bounds
        enemy.x = Math.max(0, Math.min(CANVAS_WIDTH - enemy.width, enemy.x));
        enemy.y = Math.max(0, Math.min(CANVAS_HEIGHT - enemy.height, enemy.y));
        
        // Update enemy bullets
        updateBullets(enemy);
    });
}

function drawWalls() {
    ctx.fillStyle = '#8B4513'; // Brown color for walls
    walls.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
}

function drawFlags() {
    // Draw player flag
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(flags.player.x, flags.player.y, BRICK_SIZE, BRICK_SIZE);
    
    // Draw enemy flag
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(flags.enemy.x, flags.enemy.y, BRICK_SIZE, BRICK_SIZE);
}

function checkFlagCollision(bullet) {
    // Check collision with player flag
    if (checkCollision(bullet, flags.player)) {
        flags.player.health -= 10;
        return true;
    }
    // Check collision with enemy flag
    if (checkCollision(bullet, flags.enemy)) {
        flags.enemy.health -= 10;
        return true;
    }
    return false;
}

function gameUpdate() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update game state
    updatePlayer();
    updateEnemies();
    updateBullets(player);

    // Draw game elements
    drawWalls();
    drawFlags();
    drawPlayer();
    drawEnemies();
    drawBullets();

    // Check win conditions
    if (flags.enemy.health <= 0) {
        gameOver = true;
        drawGameOver("Player Wins!");
    } else if (flags.player.health <= 0) {
        gameOver = true;
        drawGameOver("Enemy Wins!");
    }
}

// Initialize the game
function startGame() {
    initializeMap();
    initializeEnemies();
    gameLoop = setInterval(gameUpdate, 1000 / 60); // 60 FPS
}

// Start the game
startGame();

function shoot(shooter) {
    const cannonLength = shooter.width * 0.8; // Match the visual cannon length
    const bulletStartX = shooter.x + shooter.width/2 + Math.cos(shooter.direction) * cannonLength;
    const bulletStartY = shooter.y + shooter.height/2 + Math.sin(shooter.direction) * cannonLength;
    
    const bullet = {
        x: bulletStartX,
        y: bulletStartY,
        width: 6,
        height: 6,
        speed: BULLET_SPEED,
        direction: shooter.direction,
        isEnemy: shooter !== player
    };
    shooter.bullets.push(bullet);
}

function updateBullets(shooter) {
    for (let i = shooter.bullets.length - 1; i >= 0; i--) {
        const bullet = shooter.bullets[i];
        
        // Move bullet in the direction it was shot
        bullet.x += Math.cos(bullet.direction) * bullet.speed;
        bullet.y += Math.sin(bullet.direction) * bullet.speed;

        // Check collision with walls
        if (checkWallCollision(bullet, bullet.x, bullet.y)) {
            shooter.bullets.splice(i, 1);
            continue;
        }

        // Check collision with flags
        if (checkFlagCollision(bullet)) {
            shooter.bullets.splice(i, 1);
            continue;
        }

        // Check collision with tanks
        if (bullet.isEnemy) {
            if (checkCollision(bullet, player)) {
                player.health -= 10;
                shooter.bullets.splice(i, 1);
                if (player.health <= 0) {
                    gameOver = true;
                }
            }
        } else {
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (checkCollision(bullet, enemies[j])) {
                    enemies[j].health -= 25;
                    shooter.bullets.splice(i, 1);
                    if (enemies[j].health <= 0) {
                        enemies.splice(j, 1);
                        score += 100;
                    }
                    break;
                }
            }
        }

        // Remove bullets that are off screen
        if (bullet.y < 0 || bullet.y > CANVAS_HEIGHT || 
            bullet.x < 0 || bullet.x > CANVAS_WIDTH) {
            shooter.bullets.splice(i, 1);
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.direction);
    
    // Draw tank body (slightly smaller than the hit box)
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(-player.width / 2.5, -player.height / 2.5, player.width * 0.8, player.height * 0.8);
    
    // Draw tank tracks
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width / 4, player.height); // Left track
    ctx.fillRect(player.width / 4, -player.height / 2, player.width / 4, player.height); // Right track
    
    // Draw tank turret (circle)
    ctx.beginPath();
    ctx.arc(0, 0, player.width / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#388E3C';
    ctx.fill();
    
    // Draw tank cannon (longer and more visible)
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, -3, player.width * 0.8, 6); // Horizontal gun barrel
    
    ctx.restore();
    
    // Draw health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(player.x, player.y - 10, player.width * (player.health / 100), 5);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.rotate(enemy.direction);
        
        // Draw tank body (slightly smaller than the hit box)
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-enemy.width / 2.5, -enemy.height / 2.5, enemy.width * 0.8, enemy.height * 0.8);
        
        // Draw tank tracks
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width / 4, enemy.height); // Left track
        ctx.fillRect(enemy.width / 4, -enemy.height / 2, enemy.width / 4, enemy.height); // Right track
        
        // Draw tank turret (circle)
        ctx.beginPath();
        ctx.arc(0, 0, enemy.width / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#d32f2f';
        ctx.fill();
        
        // Draw tank cannon (longer and more visible)
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(0, -3, enemy.width * 0.8, 6); // Horizontal gun barrel
        
        ctx.restore();
        
        // Draw health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * (enemy.health / 100), 5);
    });
}

function drawBullets() {
    // Draw player bullets
    ctx.fillStyle = '#FFD700';
    player.bullets.forEach(bullet => {
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, 
                    bullet.width, bullet.height);
    });
    
    // Draw enemy bullets
    ctx.fillStyle = '#ff0000';
    enemies.forEach(enemy => {
        enemy.bullets.forEach(bullet => {
            ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, 
                        bullet.width, bullet.height);
        });
    });
}

function drawGameOver(message) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
} 