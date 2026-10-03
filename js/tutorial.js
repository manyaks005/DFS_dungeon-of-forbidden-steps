/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Mini DFS Graph Animated Tutorial Engine
   ========================================================================== */

class DFSTutorialEngine {
    constructor(canvasId, captionId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.captionEl = document.getElementById(captionId);

        // Define tutorial graph nodes
        this.nodes = {
            START: { id: 'START', label: 'START', x: 300, y: 60, state: 'unvisited' },
            A: { id: 'A', label: 'A', x: 180, y: 170, state: 'unvisited' },
            B: { id: 'B', label: 'B', x: 420, y: 170, state: 'unvisited' },
            C: { id: 'C', label: 'C (DEAD END)', x: 180, y: 270, state: 'unvisited' }
        };

        // Graph edges
        this.edges = [
            { from: 'START', to: 'A', state: 'normal' },
            { from: 'START', to: 'B', state: 'normal' },
            { from: 'A', to: 'C', state: 'normal' }
        ];

        // Animated token position
        this.token = { x: 300, y: 60, active: true };

        this.step = 0;
        this.stepTimer = 0;
        this.isRunning = false;
        this.animationFrameId = null;
    }

    start() {
        this.reset();
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    reset() {
        this.step = 0;
        this.stepTimer = 0;
        this.token.x = this.nodes.START.x;
        this.token.y = this.nodes.START.y;

        for (const k in this.nodes) {
            this.nodes[k].state = 'unvisited';
        }
        for (const e of this.edges) {
            e.state = 'normal';
        }
        this.nodes.START.state = 'current';
        this.updateCaption('Initializing DFS simulation...');
    }

    updateCaption(text) {
        if (this.captionEl) {
            this.captionEl.textContent = text;
        }
    }

    loop() {
        if (!this.isRunning) return;

        this.stepTimer += 0.016; // ~60fps
        this.updateSequence();
        this.render();

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    updateSequence() {
        // Step timing controller
        if (this.stepTimer > 2.2) {
            this.stepTimer = 0;
            this.step = (this.step + 1) % 8;

            audioEngine.playNodeChime(this.step === 3);
        }

        const t = Math.min(1, this.stepTimer / 1.8);

        switch (this.step) {
            case 0: // Start Node
                this.token.x = this.nodes.START.x;
                this.token.y = this.nodes.START.y;
                this.nodes.START.state = 'current';
                this.updateCaption('1. DFS begins traversal at START.');
                break;

            case 1: // START -> A
                this.nodes.START.state = 'visited';
                this.nodes.A.state = 'current';
                this.token.x = this.lerp(this.nodes.START.x, this.nodes.A.x, t);
                this.token.y = this.lerp(this.nodes.START.y, this.nodes.A.y, t);
                this.getEdge('START', 'A').state = 'active';
                this.updateCaption('2. DFS goes deeper into branch A.');
                break;

            case 2: // A -> C
                this.nodes.A.state = 'visited';
                this.nodes.C.state = 'current';
                this.token.x = this.lerp(this.nodes.A.x, this.nodes.C.x, t);
                this.token.y = this.lerp(this.nodes.A.y, this.nodes.C.y, t);
                this.getEdge('A', 'C').state = 'active';
                this.updateCaption('3. DFS reaches C — deeper down the path!');
                break;

            case 3: // Dead End at C
                this.nodes.C.state = 'dead_end';
                this.updateCaption('4. DEAD END encountered at Node C!');
                break;

            case 4: // Backtrack C -> A
                this.token.x = this.lerp(this.nodes.C.x, this.nodes.A.x, t);
                this.token.y = this.lerp(this.nodes.C.y, this.nodes.A.y, t);
                this.getEdge('A', 'C').state = 'backtrack';
                this.nodes.A.state = 'current';
                this.updateCaption('5. DFS BACKTRACKS: Retracting from C back to A.');
                break;

            case 5: // Backtrack A -> START
                this.token.x = this.lerp(this.nodes.A.x, this.nodes.START.x, t);
                this.token.y = this.lerp(this.nodes.A.y, this.nodes.START.y, t);
                this.getEdge('START', 'A').state = 'backtrack';
                this.nodes.START.state = 'current';
                this.updateCaption('6. DFS BACKTRACKS: Returning to START.');
                break;

            case 6: // START -> B
                this.nodes.B.state = 'current';
                this.token.x = this.lerp(this.nodes.START.x, this.nodes.B.x, t);
                this.token.y = this.lerp(this.nodes.START.y, this.nodes.B.y, t);
                this.getEdge('START', 'B').state = 'active';
                this.updateCaption('7. Now DFS explores the unvisited branch to Node B!');
                break;

            case 7: // Summary
                this.nodes.B.state = 'visited';
                this.updateCaption('✓ DFS Summary: Explore deep first → Backtrack when stuck → Try next branch.');
                break;
        }
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    getEdge(from, to) {
        return this.edges.find(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
    }

    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        ctx.fillStyle = '#050d08';
        ctx.fillRect(0, 0, w, h);

        // Draw Edges
        for (const e of this.edges) {
            const n1 = this.nodes[e.from];
            const n2 = this.nodes[e.to];

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);

            if (e.state === 'active') {
                ctx.strokeStyle = CONFIG.COLORS.RELIC_GOLD;
                ctx.lineWidth = 4;
            } else if (e.state === 'backtrack') {
                ctx.strokeStyle = '#d95c00';
                ctx.lineWidth = 4;
                ctx.setLineDash([6, 6]);
            } else {
                ctx.strokeStyle = '#25352c';
                ctx.lineWidth = 3;
            }

            ctx.stroke();
            ctx.restore();
        }

        // Draw Nodes
        for (const k in this.nodes) {
            const n = this.nodes[k];
            ctx.save();

            ctx.beginPath();
            ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);

            if (n.state === 'current') {
                ctx.fillStyle = CONFIG.COLORS.RELIC_GOLD;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
            } else if (n.state === 'dead_end') {
                ctx.fillStyle = '#9e2a2b';
                ctx.strokeStyle = '#ff4d4d';
                ctx.lineWidth = 3;
            } else if (n.state === 'visited') {
                ctx.fillStyle = CONFIG.COLORS.HEDGE_EMERALD;
                ctx.strokeStyle = CONFIG.COLORS.MAGIC_EMERALD;
                ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = '#142a1c';
                ctx.strokeStyle = '#385244';
                ctx.lineWidth = 2;
            }

            ctx.fill();
            ctx.stroke();

            // Label text inside or next to node
            ctx.font = 'bold 12px "Cinzel", serif';
            ctx.fillStyle = n.state === 'current' ? '#040906' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.id === 'C' ? 'C' : n.id, n.x, n.y);

            // Sub-label for Dead End
            if (n.id === 'C') {
                ctx.font = '10px "Fira Code", monospace';
                ctx.fillStyle = '#ff7b00';
                ctx.fillText('DEAD END', n.x, n.y + 35);
            }

            ctx.restore();
        }

        // Draw Active Animated Token
        ctx.save();
        ctx.fillStyle = CONFIG.COLORS.MAGIC_EMERALD;
        ctx.beginPath();
        ctx.arc(this.token.x, this.token.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}
