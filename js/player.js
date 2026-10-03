/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Wizard Player Character & Movement Physics Engine
   ========================================================================== */

class WizardPlayer {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.radius = CONFIG.PLAYER.RADIUS;
        this.speed = CONFIG.PLAYER.SPEED;

        // Facing direction: 'down', 'up', 'left', 'right'
        this.facing = 'down';
        
        // Motion & Animation states
        this.isMoving = false;
        this.animTimer = 0;
        this.footstepTimer = 0;
        
        // Input state map
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };
    }

    resetPosition(x, y) {
        this.x = x;
        this.y = y;
        this.isMoving = false;
        this.facing = 'down';
    }

    handleKeyDown(e) {
        const code = typeof e === 'string' ? e : e.code;
        const key = (e && e.key) ? e.key.toLowerCase() : '';

        if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
            this.keys.up = true;
        }
        if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
            this.keys.down = true;
        }
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
            this.keys.left = true;
        }
        if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
            this.keys.right = true;
        }
    }

    handleKeyUp(e) {
        const code = typeof e === 'string' ? e : e.code;
        const key = (e && e.key) ? e.key.toLowerCase() : '';

        if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
            this.keys.up = false;
        }
        if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
            this.keys.down = false;
        }
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
            this.keys.left = false;
        }
        if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
            this.keys.right = false;
        }
    }

    resetKeys() {
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.isMoving = false;
    }

    update(dt, maze, dfsEngine = null) {
        // 1. Calculate raw direction vector from input keys
        let dx = 0;
        let dy = 0;

        if (this.keys.up) dy -= 1;
        if (this.keys.down) dy += 1;
        if (this.keys.left) dx -= 1;
        if (this.keys.right) dx += 1;

        this.isMoving = (dx !== 0 || dy !== 0);

        if (this.isMoving) {
            // Update facing direction
            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? 'right' : 'left';
            } else {
                this.facing = dy > 0 ? 'down' : 'up';
            }

            // Normalize diagonal movement speed vector
            if (dx !== 0 && dy !== 0) {
                const invSqrt2 = 0.70710678;
                dx *= invSqrt2;
                dy *= invSqrt2;
            }

            // Delta-time step movement distance
            const moveDistX = dx * this.speed * dt;
            const moveDistY = dy * this.speed * dt;

            // 2. Axis-Separated Sliding Collision Resolution
            if (moveDistX !== 0) {
                const nextX = this.x + moveDistX;
                const colX = maze.checkCollision(nextX, this.y, this.radius, dfsEngine);
                if (!colX.collided) {
                    this.x = nextX;
                } else {
                    this.x = nextX + colX.pushX;
                }
            }

            if (moveDistY !== 0) {
                const nextY = this.y + moveDistY;
                const colY = maze.checkCollision(this.x, nextY, this.radius, dfsEngine);
                if (!colY.collided) {
                    this.y = nextY;
                } else {
                    this.y = nextY + colY.pushY;
                }
            }

            // Keep strictly within logical outer hedge bounds
            this.x = Math.max(105, Math.min(1345, this.x));
            this.y = Math.max(115, Math.min(975, this.y));

            // Advance walking animation & footstep audio trigger
            this.animTimer += dt * 10;
            this.footstepTimer += dt;
            if (this.footstepTimer >= 0.32) {
                audioEngine.playFootstep();
                this.footstepTimer = 0;
            }
        } else {
            // Idle breathing cycle
            this.animTimer += dt * 3;
            this.footstepTimer = 0;
        }
    }

    render(ctx) {
        ctx.save();

        const walkCycle = Math.sin(this.animTimer);
        const walkBob = this.isMoving ? Math.abs(walkCycle) * 2.5 : Math.sin(this.animTimer * 0.8) * 0.8;
        const px = this.x;
        const py = this.y - walkBob;

        // 1. Soft Ambient Shadow on Cobblestone Floor
        ctx.fillStyle = 'rgba(2, 8, 4, 0.55)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 14, 16 + (walkBob * 0.5), 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Animated Boots / Walking Gait (Visible legs under robe)
        const stride = this.isMoving ? walkCycle * 5 : 0;
        ctx.fillStyle = '#0a1710';
        // Left foot
        ctx.beginPath();
        ctx.arc(px - 5, this.y + 12 + (this.facing === 'up' || this.facing === 'down' ? stride : 0), 3.5, 0, Math.PI * 2);
        ctx.fill();
        // Right foot
        ctx.beginPath();
        ctx.arc(px + 5, this.y + 12 - (this.facing === 'up' || this.facing === 'down' ? stride : 0), 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Dark Magical School Robe / Cloak Body
        ctx.fillStyle = '#0e2617'; // Deep dark forest green clothing
        ctx.strokeStyle = '#d4af37'; // Muted gold details & trim
        ctx.lineWidth = 1.5;

        // Flared Robe Hem & Shoulders
        ctx.beginPath();
        ctx.moveTo(px - 14, py + 12);
        ctx.bezierCurveTo(px - 16, py, px - 12, py - 8, px, py - 10);
        ctx.bezierCurveTo(px + 12, py - 8, px + 16, py, px + 14, py + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner School Tunic & Gold Trim Scarf/Collar
        ctx.fillStyle = '#1b3b27';
        ctx.fillRect(px - 5, py - 6, 10, 14);

        ctx.strokeStyle = '#e5c158'; // Muted gold collar accent
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 6, py - 6);
        ctx.lineTo(px, py - 1);
        ctx.lineTo(px + 6, py - 6);
        ctx.stroke();

        // 4. Arms & Sleeves
        ctx.fillStyle = '#0a1c11';
        ctx.strokeStyle = '#295438';
        ctx.lineWidth = 1.2;

        // Left arm sleeve
        ctx.beginPath();
        ctx.ellipse(px - 13, py, 4.5, 7, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right arm sleeve (Wand Hand)
        ctx.beginPath();
        ctx.ellipse(px + 13, py, 4.5, 7, -Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 5. Head, Face & Hair (Young Wizard Student)
        // Skin / Face area
        ctx.fillStyle = '#ebd2b8'; // Warm skin tone
        ctx.beginPath();
        ctx.arc(px, py - 10, 8.5, 0, Math.PI * 2);
        ctx.fill();

        // Dark Messy Student Hair
        ctx.fillStyle = '#1a1410'; // Dark brown/black hair
        ctx.beginPath();
        if (this.facing === 'up') {
            // Hair covers back of head
            ctx.arc(px, py - 11, 9.5, 0, Math.PI * 2);
        } else {
            // Front hair with bangs & sides
            ctx.arc(px, py - 12, 9, Math.PI * 0.8, Math.PI * 2.2);
            ctx.lineTo(px + 8, py - 8);
            ctx.lineTo(px + 5, py - 6);
            ctx.lineTo(px, py - 8);
            ctx.lineTo(px - 5, py - 6);
            ctx.lineTo(px - 8, py - 8);
        }
        ctx.fill();

        // Face Details based on Facing Direction
        if (this.facing === 'down' || this.facing === 'left' || this.facing === 'right') {
            ctx.fillStyle = '#2b1c10'; // Eyes
            let eyeOffsetX = 0;
            if (this.facing === 'right') eyeOffsetX = 2;
            if (this.facing === 'left') eyeOffsetX = -2;

            if (this.facing !== 'up') {
                ctx.fillRect(px - 4 + eyeOffsetX, py - 10, 2, 2.5);
                ctx.fillRect(px + 2 + eyeOffsetX, py - 10, 2, 2.5);
            }
        }

        // 6. Magic Wand & Glowing Tip
        let wandStartX = px + 12;
        let wandStartY = py + 1;
        let wandTipX = px + 20;
        let wandTipY = py - 4;

        switch (this.facing) {
            case 'right':
                wandTipX = px + 24;
                wandTipY = py;
                break;
            case 'left':
                wandStartX = px - 12;
                wandTipX = px - 24;
                wandTipY = py;
                break;
            case 'up':
                wandTipX = px + 16;
                wandTipY = py - 14;
                break;
            case 'down':
                wandTipX = px + 16;
                wandTipY = py + 10;
                break;
        }

        // Wooden Wand Shaft
        ctx.strokeStyle = '#5a3d28';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(wandStartX, wandStartY);
        ctx.lineTo(wandTipX, wandTipY);
        ctx.stroke();

        // Glowing Wand Crystal Tip
        ctx.fillStyle = '#7de0a8';
        ctx.beginPath();
        ctx.arc(wandTipX, wandTipY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Magical Emerald Ambient Glow
        const gemGlow = ctx.createRadialGradient(
            wandTipX, wandTipY, 1,
            wandTipX, wandTipY, 14
        );
        gemGlow.addColorStop(0, 'rgba(125, 224, 168, 0.9)');
        gemGlow.addColorStop(0.5, 'rgba(125, 224, 168, 0.35)');
        gemGlow.addColorStop(1, 'rgba(125, 224, 168, 0)');
        ctx.fillStyle = gemGlow;
        ctx.beginPath();
        ctx.arc(wandTipX, wandTipY, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
