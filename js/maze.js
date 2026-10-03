/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Magical Hedge Maze Renderer, Dementor & Dark Lord Threat Renderer
   ========================================================================== */

class MagicalMaze {
    constructor() {
        this.nodes = MAZE_NODES;
        
        // Precise solid hedge wall bounding boxes {x, y, w, h}
        // Perfectly fitted around all 12 graph corridors with ~120px clear corridor width
        this.walls = [
            // Outer Boundary Hedges
            { x: 0, y: 0, w: 1400, h: 100 },
            { x: 0, y: 990, w: 1400, h: 50 },
            { x: 0, y: 0, w: 90, h: 1040 },
            { x: 1360, y: 0, w: 50, h: 1040 },

            // Interior Hedge Blocks
            { x: 90, y: 100, w: 200, h: 690 },     // Block A: Left of N1-N2
            { x: 90, y: 910, w: 200, h: 80 },      // Block B: Below N0-N1
            { x: 410, y: 100, w: 130, h: 340 },    // Block C: Between N1-N2 and N3-N4
            { x: 660, y: 100, w: 380, h: 340 },    // Block D: Right of N3-N4, Above N3-N5
            { x: 410, y: 560, w: 380, h: 330 },    // Block E: Below N2-N3 & N3-N5, Right of N1-N2
            { x: 910, y: 560, w: 130, h: 330 },    // Block F: Right of N5-N6, Below N5-N7
            { x: 1160, y: 100, w: 200, h: 90 },    // Block G: Above N10-N11
            { x: 1160, y: 310, w: 200, h: 130 },   // Block H: Between N10-N11 and N7-N12
            { x: 1160, y: 560, w: 200, h: 430 },   // Block I: Below N7-N12

            // Dead-End Physical Wall Caps (Ensures physical maze matches DFS graph dead-ends)
            { x: 540, y: 100, w: 120, h: 50 },     // N4 Dead-End Cap (North past N4)
            { x: 790, y: 850, w: 120, h: 40 },     // N6 Dead-End Cap (South past N6)
            { x: 910, y: 890, w: 250, h: 100 },    // N9 Dead-End Cap (East past N9)
            { x: 1340, y: 190, w: 20, h: 120 }     // N11 Dead-End Cap (East past N11)
        ];

        this.torches = [
            { x: 150, y: 800, flamePhase: 0 },
            { x: 350, y: 800, flamePhase: 1.2 },
            { x: 350, y: 450, flamePhase: 2.5 },
            { x: 600, y: 450, flamePhase: 0.8 },
            { x: 600, y: 150, flamePhase: 3.1 },
            { x: 850, y: 450, flamePhase: 1.9 },
            { x: 850, y: 850, flamePhase: 0.4 },
            { x: 1100, y: 450, flamePhase: 2.1 },
            { x: 850, y: 890, flamePhase: 1.7 },
            { x: 1300, y: 200, flamePhase: 2.9 },
            { x: 1300, y: 450, flamePhase: 0.2 },
        ];

        this.particles = [];
        for (let i = 0; i < 55; i++) {
            this.particles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: Math.random() * CONFIG.CANVAS_HEIGHT,
                radius: Math.random() * 2 + 0.8,
                speedY: -(Math.random() * 18 + 6),
                speedX: (Math.random() - 0.5) * 12,
                alpha: Math.random() * 0.7 + 0.2,
                phase: Math.random() * Math.PI * 2
            });
        }

        this.fogPatches = [
            { x: 200, y: 300, r: 190, speed: 8 },
            { x: 700, y: 700, r: 230, speed: -6 },
            { x: 1100, y: 350, r: 210, speed: 10 },
            { x: 500, y: 850, r: 200, speed: -7 }
        ];

        // Reverse backtrack trail animation timer
        this.backtrackAnimTimer = 0;

        // Floating travel cost text particles & cues
        this.floatingCostTexts = [];
        this.floatingCues = [];

        // Threat animation timers & state flags
        this.relicTimer = 0;
        this.threatTimer = 0;
        this.inDeadEndDanger = false;
        this.dementorNodeId = null;
        this.deadEndTimer = 0;
        this.inVoldemortTimeout = false;

        // Node discovery pulse timers map
        this.nodePulseTimers = {};
    }

    triggerNodePulse(nodeId) {
        if (!this.nodePulseTimers) this.nodePulseTimers = {};
        this.nodePulseTimers[nodeId] = 1.2;
    }

    spawnFloatingCost(cost, x, y) {
        this.floatingCostTexts.push({
            text: `-${cost}s`,
            x: x,
            y: y - 20,
            alpha: 1.0,
            life: 1.2
        });
    }

    spawnFloatingCue(text, x, y, color = '#e5c158') {
        this.floatingCues.push({
            text: text,
            x: x,
            y: y - 40,
            color: color,
            alpha: 1.0,
            life: 2.2
        });
    }

    getLockedGates(dfsEngine) {
        if (!dfsEngine) return [];
        const candidateGates = [
            { fromId: 'N1', toId: 'N2', x: 300, y: 720, w: 100, h: 40 },
            { fromId: 'N3', toId: 'N5', x: 700, y: 450, w: 40, h: 100 },
            { fromId: 'N5', toId: 'N7', x: 950, y: 450, w: 40, h: 100 },
            { fromId: 'N7', toId: 'N12', x: 1180, y: 450, w: 40, h: 100 }
        ];

        return candidateGates.filter(g => !dfsEngine.isEdgeAllowed(g.fromId, g.toId));
    }

    checkCollision(x, y, radius, dfsEngine = null) {
        // 1. Outer & Interior Solid Hedge Walls
        for (const wall of this.walls) {
            const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.w));
            const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.h));

            const distX = x - closestX;
            const distY = y - closestY;
            const distanceSquared = (distX * distX) + (distY * distY);

            if (distanceSquared < radius * radius) {
                const distance = Math.sqrt(distanceSquared);
                if (distance === 0) {
                    const distLeft = Math.abs(x - wall.x);
                    const distRight = Math.abs((wall.x + wall.w) - x);
                    const distTop = Math.abs(y - wall.y);
                    const distBottom = Math.abs((wall.y + wall.h) - y);
                    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

                    let pushX = 0, pushY = 0;
                    if (minDist === distLeft) pushX = -distLeft - radius;
                    else if (minDist === distRight) pushX = distRight + radius;
                    else if (minDist === distTop) pushY = -distTop - radius;
                    else pushY = distBottom + radius;

                    return { collided: true, pushX, pushY };
                }
                const overlap = radius - distance;
                return {
                    collided: true,
                    pushX: (distX / distance) * overlap,
                    pushY: (distY / distance) * overlap
                };
            }
        }

        // 2. Locked DFS Branch Gates Collision
        if (dfsEngine) {
            const gates = this.getLockedGates(dfsEngine);
            for (const gate of gates) {
                const closestX = Math.max(gate.x, Math.min(x, gate.x + gate.w));
                const closestY = Math.max(gate.y, Math.min(y, gate.y + gate.h));
                const distX = x - closestX;
                const distY = y - closestY;
                const distanceSquared = (distX * distX) + (distY * distY);

                if (distanceSquared < radius * radius) {
                    const distance = Math.sqrt(distanceSquared);
                    const overlap = radius - (distance || 1);
                    const pushX = distance === 0 ? 0 : (distX / distance) * overlap;
                    const pushY = distance === 0 ? -radius : (distY / distance) * overlap;

                    if (!this.lastGateCueTime || Date.now() - this.lastGateCueTime > 2200) {
                        this.lastGateCueTime = Date.now();
                        const isTarget = gate.toId === 'N12';
                        const msg = isTarget ? 
                            'THE PATH IS NOT YET COMPLETE — Continue the DFS exploration.' : 
                            `BRANCH LOCKED — Explore current DFS branch first!`;
                        this.spawnFloatingCue(msg, gate.x + gate.w / 2, gate.y + gate.h / 2, isTarget ? '#e5c158' : '#ff9d00');
                    }

                    return { collided: true, pushX, pushY };
                }
            }
        }

        return { collided: false, pushX: 0, pushY: 0 };
    }

    getCurrentNode(playerX, playerY, threshold = CONFIG.PLAYER.TRIGGER_RADIUS) {
        for (const node of this.nodes) {
            const dx = playerX - node.x;
            const dy = playerY - node.y;
            if ((dx * dx + dy * dy) <= threshold * threshold) {
                return node;
            }
        }
        return null;
    }

    update(dt, dfsEngine = null, playerX = null, playerY = null) {
        this.relicTimer += dt;
        this.threatTimer += dt;
        this.backtrackAnimTimer += dt * 4;

        if (this.nodePulseTimers) {
            for (const id in this.nodePulseTimers) {
                this.nodePulseTimers[id] -= dt;
                if (this.nodePulseTimers[id] <= 0) delete this.nodePulseTimers[id];
            }
        }

        // Key collection check
        if (dfsEngine && playerX !== null && playerY !== null) {
            const keyNodes = ['N9', 'N4', 'N6', 'N11'];
            for (const id of keyNodes) {
                if (!dfsEngine.collectedKeys.has(id)) {
                    const node = getNodeById(id);
                    if (node) {
                        const dx = playerX - node.x;
                        const dy = playerY - node.y;
                        if ((dx * dx + dy * dy) <= 40 * 40) {
                            dfsEngine.collectedKeys.add(id);
                            if (typeof audioEngine !== 'undefined') audioEngine.playBacktrackSuccess();
                            this.spawnFloatingCue('🔑 DFS KEY COLLECTED!', node.x, node.y, '#e5c158');

                            if (dfsEngine.triggerDementorIfEligible) {
                                dfsEngine.triggerDementorIfEligible(id);
                            }
                        }
                    }
                }
            }
        }

        // Update Floating Cost Texts
        for (let i = this.floatingCostTexts.length - 1; i >= 0; i--) {
            const fc = this.floatingCostTexts[i];
            fc.y -= 25 * dt;
            fc.life -= dt;
            fc.alpha = Math.max(0, fc.life / 1.2);
            if (fc.life <= 0) {
                this.floatingCostTexts.splice(i, 1);
            }
        }

        // Update Floating DFS Cues
        for (let i = this.floatingCues.length - 1; i >= 0; i--) {
            const fc = this.floatingCues[i];
            fc.y -= 16 * dt;
            fc.life -= dt;
            fc.alpha = Math.max(0, Math.min(1.0, fc.life / 0.6));
            if (fc.life <= 0) {
                this.floatingCues.splice(i, 1);
            }
        }

        // Atmosphere Particles
        for (const p of this.particles) {
            p.y += p.speedY * dt;
            p.x += p.speedX * dt;
            p.phase += dt * 2;
            p.alpha = 0.3 + 0.4 * Math.sin(p.phase);

            if (p.y < 0) p.y = CONFIG.CANVAS_HEIGHT;
            if (p.x < 0) p.x = CONFIG.CANVAS_WIDTH;
            if (p.x > CONFIG.CANVAS_WIDTH) p.x = 0;
        }

        // Fog
        for (const fog of this.fogPatches) {
            fog.x += fog.speed * dt;
            if (fog.x > CONFIG.CANVAS_WIDTH + fog.r) fog.x = -fog.r;
            if (fog.x < -fog.r) fog.x = CONFIG.CANVAS_WIDTH + fog.r;
        }

        // Torch flames
        for (const t of this.torches) {
            t.flamePhase += dt * 8;
        }
    }

    render(ctx, dfsEngine, playerX, playerY) {
        ctx.save();

        // Environment Background - Deep Dark Forest Night Floor
        ctx.fillStyle = CONFIG.COLORS.BG_VOID;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Ancient Stone Labyrinth Ground
        ctx.fillStyle = CONFIG.COLORS.STONE_FLOOR;
        ctx.fillRect(90, 100, 1270, 890);

        // Paths & Traversal Edge Highlights
        this.renderPaths(ctx, dfsEngine);

        // Reverse Backtrack Glowing Trail (Signature Visual Moment)
        if (dfsEngine) {
            this.renderReverseBacktrackTrail(ctx, dfsEngine);
        }

        // Graph Nodes
        this.renderNodes(ctx, dfsEngine);

        // Target Relic Goblet
        this.renderTargetRelic(ctx, dfsEngine ? dfsEngine.isTargetReached : false);

        // Magical DFS Keys & Locked Branch Gates
        this.renderKeys(ctx, dfsEngine);
        this.renderLockedGates(ctx, dfsEngine);

        // Tall Layered Hedge Walls
        this.renderHedges(ctx);

        // Magical Torches & Dynamic Lighting
        this.renderTorches(ctx);

        // Fog & Atmospheric Ember Particles
        this.renderAtmosphere(ctx);

        // Floating Cost Texts
        this.renderFloatingCostTexts(ctx);

        // Floating Event Cues
        this.renderFloatingCues(ctx);

        // Render Dementor Threat when at a Dead End
        if (this.inDeadEndDanger && this.dementorNodeId) {
            const deadEndNode = getNodeById(this.dementorNodeId);
            if (deadEndNode) {
                // Calculate Dementor approach position towards player or junction
                const progress = Math.min(1.0, (CONFIG.DEAD_END_ESCAPE_TIME - this.deadEndTimer) / CONFIG.DEAD_END_ESCAPE_TIME);
                let targetX = playerX || deadEndNode.x;
                let targetY = playerY || deadEndNode.y;
                let demX = deadEndNode.x + (targetX - deadEndNode.x) * (progress * 0.45);
                let demY = deadEndNode.y + (targetY - deadEndNode.y) * (progress * 0.45);

                this.renderDementor(ctx, demX, demY);
            }
            this.renderDementorVignette(ctx);
        }

        // Render Dark Lord Presence on Timeout
        if (this.inVoldemortTimeout) {
            this.renderVoldemort(ctx, playerX, playerY);
            this.renderVoldemortVignette(ctx);
        }

        // Debug Overlay if enabled
        if (CONFIG.DEBUG) {
            this.renderDebugOverlay(ctx, dfsEngine);
        }

        ctx.restore();
    }

    renderPaths(ctx, dfsEngine) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw Base Cobblestone Corridor Tracks (Width 90px)
        ctx.lineWidth = 90;
        ctx.strokeStyle = CONFIG.COLORS.STONE_GRID;
        for (const node of this.nodes) {
            for (const neighborId of node.neighbors) {
                const targetNode = getNodeById(neighborId);
                if (targetNode) {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(targetNode.x, targetNode.y);
                    ctx.stroke();
                }
            }
        }

        // Draw Edge Traversal Lines
        for (const node of this.nodes) {
            for (const neighborId of node.neighbors) {
                const targetNode = getNodeById(neighborId);
                if (!targetNode) continue;

                const edgeState = dfsEngine ? dfsEngine.getEdgeState(node.id, targetNode.id) : 'UNEXPLORED';

                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(targetNode.x, targetNode.y);

                if (edgeState === 'ACTIVE_STACK') {
                    ctx.lineWidth = 8;
                    ctx.strokeStyle = CONFIG.COLORS.RELIC_GOLD;
                    ctx.shadowColor = CONFIG.COLORS.RELIC_GOLD;
                    ctx.shadowBlur = 14;
                    ctx.stroke();
                } else if (edgeState === 'TRAVERSED') {
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = CONFIG.COLORS.HEDGE_LEAF_LIGHT;
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                } else {
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = CONFIG.COLORS.PATH_LINE;
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    /**
     * ABSOLUTE MANDATORY FEATURE:
     * Render Reverse-Moving Magical Glowing Trail along the backtrack path
     */
    renderReverseBacktrackTrail(ctx, dfsEngine) {
        if (!dfsEngine || (dfsEngine.state !== 'DEAD_END' && dfsEngine.state !== 'BACKTRACK' && dfsEngine.state !== 'BACKTRACKING')) {
            return;
        }

        const stack = dfsEngine.dfsStack;
        const currentNode = getNodeById(dfsEngine.currentNodeId);
        let prevNodeId = dfsEngine.previousNodeId;

        if (!prevNodeId && stack.length >= 2) {
            prevNodeId = stack[stack.length - 2];
        }

        const prevNode = getNodeById(prevNodeId);
        if (!currentNode || !prevNode) return;

        ctx.save();
        // Animated Dashed Backtrack Edge (flowing backward from currentNode -> prevNode)
        ctx.beginPath();
        ctx.moveTo(currentNode.x, currentNode.y);
        ctx.lineTo(prevNode.x, prevNode.y);

        ctx.lineWidth = 9;
        ctx.strokeStyle = '#ff9d00';
        ctx.shadowColor = '#ff9d00';
        ctx.shadowBlur = 16;
        ctx.setLineDash([16, 12]);
        ctx.lineDashOffset = -this.backtrackAnimTimer * 12;
        ctx.stroke();

        // Pulsing Reverse Energy Particles moving along line segment
        const dist = Math.hypot(prevNode.x - currentNode.x, prevNode.y - currentNode.y);
        const steps = Math.floor(dist / 40);

        for (let i = 0; i < steps; i++) {
            const phase = ((this.backtrackAnimTimer * 0.4 + (i / steps)) % 1.0);
            const px = currentNode.x + (prevNode.x - currentNode.x) * phase;
            const py = currentNode.y + (prevNode.y - currentNode.y) * phase;

            ctx.fillStyle = '#ffe89c';
            ctx.shadowColor = '#ff9d00';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(px, py, 6 + Math.sin(phase * Math.PI) * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Floating Backtrack Directional Label
        const midX = (currentNode.x + prevNode.x) / 2;
        const midY = (currentNode.y + prevNode.y) / 2;

        ctx.font = 'bold 12px "Cinzel", serif';
        ctx.fillStyle = '#ffea9f';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(`↩ BACKTRACK TO ${prevNode.id}`, midX, midY - 12);

        ctx.restore();
    }

    renderNodes(ctx, dfsEngine) {
        ctx.save();

        const currentNodeId = dfsEngine ? dfsEngine.currentNodeId : null;
        const visitedSet = dfsEngine ? dfsEngine.visitedNodes : new Set();
        const deadEndSet = dfsEngine ? dfsEngine.deadEndNodes : new Set();
        const dfsStack = dfsEngine ? dfsEngine.dfsStack : [];

        for (const node of this.nodes) {
            const isCurrent = node.id === currentNodeId;
            const isVisited = visitedSet.has(node.id);
            const isDeadEnd = deadEndSet.has(node.id);
            const isInStack = dfsStack.includes(node.id);

            // Outer Pulse / Aura
            ctx.beginPath();
            ctx.arc(node.x, node.y, isCurrent ? 28 : 22, 0, Math.PI * 2);

            if (isCurrent) {
                ctx.fillStyle = 'rgba(229, 193, 88, 0.35)';
                ctx.strokeStyle = CONFIG.COLORS.RELIC_GOLD;
                ctx.lineWidth = 3.5;
            } else if (isDeadEnd) {
                ctx.fillStyle = 'rgba(184, 50, 50, 0.35)';
                ctx.strokeStyle = CONFIG.COLORS.DEAD_END_RED;
                ctx.lineWidth = 2.5;
            } else if (isInStack) {
                ctx.fillStyle = 'rgba(125, 224, 168, 0.25)';
                ctx.strokeStyle = CONFIG.COLORS.MAGIC_EMERALD;
                ctx.lineWidth = 2.5;
            } else if (isVisited) {
                ctx.fillStyle = 'rgba(24, 62, 37, 0.4)';
                ctx.strokeStyle = CONFIG.COLORS.HEDGE_TOP;
                ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = 'rgba(10, 20, 14, 0.5)';
                ctx.strokeStyle = '#25352c';
                ctx.lineWidth = 1.5;
            }
            ctx.fill();
            ctx.stroke();

            // Inner Core Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);

            if (isCurrent) {
                ctx.fillStyle = CONFIG.COLORS.RELIC_GOLD;
            } else if (isDeadEnd) {
                ctx.fillStyle = CONFIG.COLORS.DEAD_END_RED;
            } else if (isVisited) {
                ctx.fillStyle = CONFIG.COLORS.MAGIC_EMERALD;
            } else {
                ctx.fillStyle = '#18241d';
            }
            ctx.fill();

            // Node ID Typography Label
            ctx.font = isCurrent ? 'bold 12px "Fira Code", monospace' : '11px "Fira Code", monospace';
            ctx.fillStyle = isCurrent ? CONFIG.COLORS.RELIC_GOLD : (isDeadEnd ? '#ff6b6b' : (isVisited ? '#a8d5b5' : '#6b7d72'));
            ctx.textAlign = 'center';
            ctx.fillText(node.id, node.x, node.y - 30);

            if (isDeadEnd) {
                ctx.font = 'bold 9px "Fira Code", monospace';
                ctx.fillStyle = '#ff4d4d';
                ctx.fillText('DEAD END', node.x, node.y + 35);
            }

            // Node Discovery Dynamic Shockwave Pulse Ring
            if (this.nodePulseTimers && this.nodePulseTimers[node.id]) {
                const timer = this.nodePulseTimers[node.id];
                const progress = (1.2 - timer) / 1.2;
                const pulseRadius = 22 + progress * 40;
                const pulseAlpha = Math.max(0, 1 - progress);

                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(229, 193, 88, ${pulseAlpha})`;
                ctx.lineWidth = 3.5;
                ctx.shadowColor = '#e5c158';
                ctx.shadowBlur = 18;
                ctx.stroke();
                ctx.restore();
            }
        }
        ctx.restore();
    }

    renderTargetRelic(ctx, isReached) {
        const targetNode = getNodeById('N12');
        if (!targetNode) return;

        const pulse = Math.sin(this.relicTimer * (isReached ? 6 : 3)) * 6;
        
        ctx.save();
        const gradient = ctx.createRadialGradient(
            targetNode.x, targetNode.y, 5,
            targetNode.x, targetNode.y, 55 + pulse
        );
        gradient.addColorStop(0, isReached ? 'rgba(255, 240, 160, 0.95)' : 'rgba(255, 230, 130, 0.8)');
        gradient.addColorStop(0.5, 'rgba(229, 193, 88, 0.4)');
        gradient.addColorStop(1, 'rgba(229, 193, 88, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(targetNode.x, targetNode.y, 60 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Altar Base
        ctx.fillStyle = '#2a2010';
        ctx.strokeStyle = CONFIG.COLORS.RELIC_GOLD;
        ctx.lineWidth = 2;
        ctx.fillRect(targetNode.x - 18, targetNode.y - 10, 36, 20);
        ctx.strokeRect(targetNode.x - 18, targetNode.y - 10, 36, 20);

        // Enchanted Goblet Cup
        ctx.fillStyle = CONFIG.COLORS.RELIC_GOLD;
        ctx.beginPath();
        ctx.moveTo(targetNode.x - 12, targetNode.y - 24);
        ctx.lineTo(targetNode.x + 12, targetNode.y - 24);
        ctx.lineTo(targetNode.x + 7, targetNode.y - 12);
        ctx.lineTo(targetNode.x - 7, targetNode.y - 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(targetNode.x - 3, targetNode.y - 12, 6, 6);
        ctx.fillRect(targetNode.x - 10, targetNode.y - 6, 20, 3);
        ctx.restore();
    }

    renderKeys(ctx, dfsEngine) {
        if (!dfsEngine) return;
        const keyNodes = ['N9', 'N4', 'N6', 'N11'];

        for (const nodeId of keyNodes) {
            if (dfsEngine.collectedKeys && dfsEngine.collectedKeys.has(nodeId)) continue;

            const node = getNodeById(nodeId);
            if (!node) continue;

            const floatY = Math.sin(this.relicTimer * 4 + node.x) * 5;
            const kx = node.x;
            const ky = node.y + floatY;

            ctx.save();
            // Warm Golden Aura Glow
            const auraGrad = ctx.createRadialGradient(kx, ky, 2, kx, ky, 22);
            auraGrad.addColorStop(0, 'rgba(255, 230, 120, 0.8)');
            auraGrad.addColorStop(0.5, 'rgba(229, 193, 88, 0.35)');
            auraGrad.addColorStop(1, 'rgba(229, 193, 88, 0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(kx, ky, 22, 0, Math.PI * 2);
            ctx.fill();

            // Antique Gold Key Drawing
            ctx.strokeStyle = '#e5c158';
            ctx.fillStyle = '#eed588';
            ctx.lineWidth = 2;

            // Key Bow Ring
            ctx.beginPath();
            ctx.arc(kx, ky - 8, 6, 0, Math.PI * 2);
            ctx.stroke();

            // Key Stem
            ctx.beginPath();
            ctx.moveTo(kx, ky - 2);
            ctx.lineTo(kx, ky + 10);
            ctx.stroke();

            // Key Bit Teeth
            ctx.fillRect(kx, ky + 4, 5, 2);
            ctx.fillRect(kx, ky + 8, 4, 2);

            ctx.restore();
        }
    }

    renderLockedGates(ctx, dfsEngine) {
        if (!dfsEngine) return;
        const gates = this.getLockedGates(dfsEngine);

        for (const gate of gates) {
            const isTarget = gate.toId === 'N12';
            ctx.save();

            // Soft glowing barrier fill
            const fillStyle = isTarget ? 'rgba(229, 193, 88, 0.25)' : 'rgba(30, 65, 48, 0.5)';
            const strokeStyle = isTarget ? '#e5c158' : '#3c865c';
            ctx.fillStyle = fillStyle;
            ctx.fillRect(gate.x, gate.y, gate.w, gate.h);

            // Barrier border & vine runes
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(gate.x + 2, gate.y + 2, gate.w - 4, gate.h - 4);

            // Lock Symbol / Rune Icon
            ctx.font = 'bold 14px "Cinzel", serif';
            ctx.fillStyle = isTarget ? '#ffe89c' : '#7de0a8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isTarget ? '🔒' : '🌿', gate.x + gate.w / 2, gate.y + gate.h / 2);

            ctx.restore();
        }
    }

    renderHedges(ctx) {
        ctx.save();
        for (const w of this.walls) {
            // Drop Shadow on Floor
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(w.x + 5, w.y + 7, w.w, w.h);

            // Deep Dark Hedge Base
            ctx.fillStyle = CONFIG.COLORS.HEDGE_BASE;
            ctx.fillRect(w.x, w.y, w.w, w.h);

            // Dense Mossy Green Top Canopy
            ctx.fillStyle = CONFIG.COLORS.HEDGE_TOP;
            ctx.fillRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);

            // Textured Foliage Edges & Highlights
            ctx.strokeStyle = CONFIG.COLORS.HEDGE_LEAF_LIGHT;
            ctx.lineWidth = 1.8;
            ctx.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
        }
        ctx.restore();
    }

    renderTorches(ctx) {
        ctx.save();
        for (const t of this.torches) {
            const flicker = Math.sin(t.flamePhase) * 5 + Math.cos(t.flamePhase * 2.3) * 2.5;
            const radius = 115 + flicker;

            // Soft Ambient Torch Light Halo
            const lightGrad = ctx.createRadialGradient(
                t.x, t.y, 5,
                t.x, t.y, radius
            );
            lightGrad.addColorStop(0, 'rgba(255, 180, 60, 0.42)');
            lightGrad.addColorStop(0.4, 'rgba(255, 120, 0, 0.2)');
            lightGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Wall Sconce Mount
            ctx.fillStyle = '#111';
            ctx.fillRect(t.x - 3, t.y - 4, 6, 12);

            // Flame Core
            ctx.fillStyle = CONFIG.COLORS.TORCH_ORANGE;
            ctx.beginPath();
            ctx.arc(t.x, t.y - 6 + (flicker * 0.2), 5.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = CONFIG.COLORS.TORCH_CORE;
            ctx.beginPath();
            ctx.arc(t.x, t.y - 7 + (flicker * 0.2), 2.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderAtmosphere(ctx) {
        ctx.save();
        // Rolling Fog Patches
        for (const fog of this.fogPatches) {
            const fogGrad = ctx.createRadialGradient(
                fog.x, fog.y, 10,
                fog.x, fog.y, fog.r
            );
            fogGrad.addColorStop(0, 'rgba(30, 65, 48, 0.14)');
            fogGrad.addColorStop(0.6, 'rgba(15, 38, 28, 0.07)');
            fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = fogGrad;
            ctx.beginPath();
            ctx.arc(fog.x, fog.y, fog.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Floating Emerald Magic Embers
        for (const p of this.particles) {
            ctx.fillStyle = `rgba(125, 224, 168, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderFloatingCostTexts(ctx) {
        ctx.save();
        ctx.font = 'bold 15px "Fira Code", monospace';
        ctx.textAlign = 'center';

        for (const fc of this.floatingCostTexts) {
            ctx.fillStyle = `rgba(255, 123, 123, ${fc.alpha})`;
            ctx.fillText(fc.text, fc.x, fc.y);
        }
        ctx.restore();
    }

    renderFloatingCues(ctx) {
        ctx.save();
        ctx.font = 'bold 14px "Cinzel", serif';
        ctx.textAlign = 'center';

        for (const fc of this.floatingCues) {
            ctx.fillStyle = fc.color;
            ctx.globalAlpha = fc.alpha;
            ctx.fillText(fc.text, fc.x, fc.y);
        }
        ctx.restore();
    }

    /**
     * MAJOR EVENT: Render Dementor Hooded Spectral Wraith gliding down corridor
     * 2.5x the visual mass of the wizard player character
     */
    renderDementor(ctx, x, y) {
        const floatOffsetY = Math.sin(this.threatTimer * 3.5) * 8;
        const dx = x;
        const dy = y - 50 + floatOffsetY;

        ctx.save();

        // Freezing Icy Aura
        const auraGrad = ctx.createRadialGradient(dx, dy + 25, 15, dx, dy + 25, 110);
        auraGrad.addColorStop(0, 'rgba(12, 38, 28, 0.95)');
        auraGrad.addColorStop(0.5, 'rgba(6, 20, 15, 0.75)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(dx, dy + 25, 110, 0, Math.PI * 2);
        ctx.fill();

        // Massive Hooded Spectral Cloak (2.5x player mass)
        ctx.fillStyle = '#050f0a';
        ctx.strokeStyle = '#1b402c';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(dx, dy - 45); // Deep hood peak
        ctx.bezierCurveTo(dx - 38, dy - 25, dx - 42, dy + 40, dx - 30, dy + 90);
        ctx.lineTo(dx - 18, dy + 75);
        ctx.lineTo(dx, dy + 100);
        ctx.lineTo(dx + 18, dy + 75);
        ctx.lineTo(dx + 30, dy + 90);
        ctx.bezierCurveTo(dx + 42, dy + 40, dx + 38, dy - 25, dx, dy - 45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Void Hood Interior & Cold Spectral Eye Slits
        ctx.fillStyle = '#010503';
        ctx.beginPath();
        ctx.ellipse(dx, dy - 12, 14, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#a6f7cc';
        ctx.shadowColor = '#7de0a8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(dx - 5, dy - 12, 2.5, 0, Math.PI * 2);
        ctx.arc(dx + 5, dy - 12, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderDementorVignette(ctx) {
        ctx.save();
        const w = CONFIG.CANVAS_WIDTH;
        const h = CONFIG.CANVAS_HEIGHT;
        const vignette = ctx.createRadialGradient(
            w * 0.5, h * 0.5, h * 0.25,
            w * 0.5, h * 0.5, h * 0.7
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(2, 18, 12, 0.88)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    /**
     * GLOBAL TIMEOUT EVENT: Render Voldemort Dark Lord Apparition
     */
    renderVoldemort(ctx, playerX, playerY) {
        ctx.save();
        const vx = playerX || CONFIG.CANVAS_WIDTH * 0.5;
        const vy = (playerY || CONFIG.CANVAS_HEIGHT * 0.5) - 60;

        // Ominous Dark Crimson Energy Background Wave
        const crimsonGrad = ctx.createRadialGradient(vx, vy, 20, vx, vy, 450);
        crimsonGrad.addColorStop(0, 'rgba(180, 20, 20, 0.48)');
        crimsonGrad.addColorStop(0.5, 'rgba(80, 10, 10, 0.3)');
        crimsonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = crimsonGrad;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Dark Wizard Tall Threatening Silhouette
        ctx.fillStyle = '#050203';
        ctx.strokeStyle = '#800c0c';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(vx, vy - 70);
        ctx.bezierCurveTo(vx - 45, vy - 45, vx - 55, vy + 70, vx - 38, vy + 140);
        ctx.lineTo(vx + 38, vy + 140);
        ctx.bezierCurveTo(vx + 55, vy + 70, vx + 45, vy - 45, vx, vy - 70);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    renderVoldemortVignette(ctx) {
        ctx.save();
        const w = CONFIG.CANVAS_WIDTH;
        const h = CONFIG.CANVAS_HEIGHT;
        const vignette = ctx.createRadialGradient(
            w * 0.5, h * 0.5, h * 0.2,
            w * 0.5, h * 0.5, h * 0.75
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(70, 5, 5, 0.9)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    renderDebugOverlay(ctx, dfsEngine) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.8)';
        ctx.setLineDash([4, 4]);

        for (const node of this.nodes) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, CONFIG.PLAYER.TRIGGER_RADIUS, 0, Math.PI * 2);
            ctx.stroke();

            ctx.font = '10px "Fira Code", monospace';
            ctx.fillStyle = '#ffe853';
            ctx.fillText(`(${node.x},${node.y})`, node.x, node.y + 15);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(10, 10, 280, 140);
        ctx.strokeStyle = CONFIG.COLORS.RELIC_GOLD;
        ctx.strokeRect(10, 10, 280, 140);

        ctx.font = '11px "Fira Code", monospace';
        ctx.fillStyle = '#7de0a8';
        ctx.fillText(`[DEBUG MODE ACTIVE]`, 20, 28);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`State: ${dfsEngine ? dfsEngine.state : 'N/A'}`, 20, 48);
        ctx.fillText(`Current: ${dfsEngine ? dfsEngine.currentNodeId : 'N/A'}`, 20, 66);
        ctx.fillText(`Stack: [${dfsEngine ? dfsEngine.dfsStack.join(', ') : ''}]`, 20, 84);
        ctx.fillText(`Visited: ${dfsEngine ? dfsEngine.visitedNodes.size : 0} nodes`, 20, 102);
        ctx.fillText(`DeadEnds: ${dfsEngine ? Array.from(dfsEngine.deadEndNodes).join(', ') : 'None'}`, 20, 120);

        ctx.restore();
    }
}
