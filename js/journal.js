/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Enchanted Field Journal & HUD Manager
   ========================================================================== */

class FieldJournalUI {
    constructor() {
        this.gridEl = document.getElementById('discovered-nodes-grid');
        this.nodeCountEl = document.getElementById('journal-node-count');
        this.currentNodeNameEl = document.getElementById('hud-current-node-name');
        this.explorationStateEl = document.getElementById('hud-exploration-state');
        this.currentNodeDetailsEl = document.getElementById('current-node-details');
        this.bottomHintEl = document.getElementById('bottom-hint-text');
        this.logContainerEl = document.getElementById('journal-log-container');
        this.stackContainerEl = document.getElementById('dfs-stack-container');
        this.stackBadgeEl = document.getElementById('stack-depth-badge');
        this.timerDisplayEl = document.getElementById('hud-timer-display');

        this.initGrid();
    }

    initGrid() {
        this.updateNodeCount(1);
    }

    updateNodeCount(count) {
        if (this.nodeCountEl) {
            this.nodeCountEl.textContent = `${count} / ${MAZE_NODES.length}`;
        }
    }

    renderGraphTrackerCanvas(dfsEngine) {
        const canvas = document.getElementById('graph-tracker-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(4, 12, 7, 0.95)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(37, 53, 44, 0.3)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 25) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 25) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const mapX = (x) => 25 + ((x - 150) / (1300 - 150)) * (w - 50);
        const mapY = (y) => 25 + ((y - 200) / (950 - 200)) * (h - 50);

        const visitedSet = dfsEngine ? dfsEngine.visitedNodes : new Set(['N0']);
        const deadEndSet = dfsEngine ? dfsEngine.deadEndNodes : new Set();
        const stack = dfsEngine ? dfsEngine.dfsStack : ['N0'];
        const currentNodeId = dfsEngine ? dfsEngine.currentNodeId : 'N0';

        const revealedNodes = new Set();
        visitedSet.forEach(id => {
            revealedNodes.add(id);
            const node = getNodeById(id);
            if (node) {
                node.neighbors.forEach(nId => revealedNodes.add(nId));
            }
        });

        // 1. Draw Edges
        for (const node of MAZE_NODES) {
            for (const nId of node.neighbors) {
                const nTarget = getNodeById(nId);
                if (!nTarget || node.id > nId) continue;

                const x1 = mapX(node.x);
                const y1 = mapY(node.y);
                const x2 = mapX(nTarget.x);
                const y2 = mapY(nTarget.y);

                const isBothVisited = visitedSet.has(node.id) && visitedSet.has(nId);
                const isRevealed = revealedNodes.has(node.id) && revealedNodes.has(nId);

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);

                const edgeState = dfsEngine ? dfsEngine.getEdgeState(node.id, nId) : 'UNEXPLORED';

                if (edgeState === 'ACTIVE_STACK') {
                    ctx.lineWidth = 3.5;
                    ctx.strokeStyle = '#e5c158';
                    ctx.shadowColor = '#e5c158';
                    ctx.shadowBlur = 6;
                    ctx.stroke();
                } else if (edgeState === 'TRAVERSED' || isBothVisited) {
                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = '#3a855a';
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                } else if (isRevealed) {
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = 'rgba(60, 90, 70, 0.4)';
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // 2. Draw Backtrack arrow if in backtrack/deadend state
        if (dfsEngine && (dfsEngine.state === 'DEAD_END' || dfsEngine.state === 'BACKTRACK' || dfsEngine.state === 'BACKTRACKING')) {
            const cNode = getNodeById(dfsEngine.currentNodeId);
            const pNode = getNodeById(dfsEngine.previousNodeId || (stack.length >= 2 ? stack[stack.length - 2] : null));
            if (cNode && pNode) {
                const cx = mapX(cNode.x);
                const cy = mapY(cNode.y);
                const px = mapX(pNode.x);
                const py = mapY(pNode.y);

                ctx.save();
                ctx.strokeStyle = '#ff9d00';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 3. Draw Nodes
        for (const node of MAZE_NODES) {
            if (!revealedNodes.has(node.id)) continue;

            const nx = mapX(node.x);
            const ny = mapY(node.y);
            const isCurrent = node.id === currentNodeId;
            const isVisited = visitedSet.has(node.id);
            const isDeadEnd = deadEndSet.has(node.id);
            const isInStack = stack.includes(node.id);
            const isTarget = node.id === 'N12';

            ctx.save();
            ctx.beginPath();
            ctx.arc(nx, ny, isCurrent ? 9 : 7, 0, Math.PI * 2);

            if (isTarget && (isVisited || dfsEngine.isTargetReached)) {
                ctx.fillStyle = '#e5c158';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
            } else if (isCurrent) {
                ctx.fillStyle = '#7de0a8';
                ctx.strokeStyle = '#e5c158';
                ctx.lineWidth = 2.5;
            } else if (isDeadEnd) {
                ctx.fillStyle = '#b83232';
                ctx.strokeStyle = '#ff4d4d';
                ctx.lineWidth = 1.5;
            } else if (isInStack) {
                ctx.fillStyle = '#3a855a';
                ctx.strokeStyle = '#7de0a8';
                ctx.lineWidth = 1.5;
            } else if (isVisited) {
                ctx.fillStyle = '#1b4d2c';
                ctx.strokeStyle = '#3a855a';
                ctx.lineWidth = 1.5;
            } else {
                ctx.fillStyle = '#142a1c';
                ctx.strokeStyle = '#25352c';
                ctx.lineWidth = 1;
            }

            ctx.fill();
            ctx.stroke();

            ctx.font = isCurrent ? 'bold 9px "Fira Code", monospace' : '8px "Fira Code", monospace';
            ctx.fillStyle = isCurrent ? '#e5c158' : (isDeadEnd ? '#ff8888' : (isVisited ? '#d8e5dc' : '#6b7d72'));
            ctx.textAlign = 'center';
            ctx.fillText(node.id, nx, ny - 10);

            ctx.restore();
        }
    }

    renderJourneyGraphCanvas(dfsEngine) {
        const canvas = document.getElementById('journey-graph-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(4, 12, 7, 0.95)';
        ctx.fillRect(0, 0, w, h);

        const mapX = (x) => 30 + ((x - 150) / (1300 - 150)) * (w - 60);
        const mapY = (y) => 25 + ((y - 200) / (950 - 200)) * (h - 50);

        const visitedSet = dfsEngine ? dfsEngine.visitedNodes : new Set();
        const deadEndSet = dfsEngine ? dfsEngine.deadEndNodes : new Set();

        // Draw All Edges
        for (const node of MAZE_NODES) {
            for (const nId of node.neighbors) {
                const nTarget = getNodeById(nId);
                if (!nTarget || node.id > nId) continue;

                const x1 = mapX(node.x);
                const y1 = mapY(node.y);
                const x2 = mapX(nTarget.x);
                const y2 = mapY(nTarget.y);

                const isTraversed = dfsEngine.traversalSequence.some(
                    t => (t.from === node.id && t.to === nId) || (t.from === nId && t.to === node.id)
                );

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);

                if (isTraversed) {
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#e5c158';
                    ctx.shadowColor = '#e5c158';
                    ctx.shadowBlur = 4;
                } else {
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#25352c';
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw Nodes
        for (const node of MAZE_NODES) {
            const nx = mapX(node.x);
            const ny = mapY(node.y);
            const isVisited = visitedSet.has(node.id);
            const isDeadEnd = deadEndSet.has(node.id);
            const isTarget = node.id === 'N12';

            ctx.save();
            ctx.beginPath();
            ctx.arc(nx, ny, isTarget ? 10 : 8, 0, Math.PI * 2);

            if (isTarget) {
                ctx.fillStyle = '#e5c158';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
            } else if (isDeadEnd) {
                ctx.fillStyle = '#b83232';
                ctx.strokeStyle = '#ff4d4d';
                ctx.lineWidth = 1.5;
            } else if (isVisited) {
                ctx.fillStyle = '#1b4d2c';
                ctx.strokeStyle = '#3a855a';
                ctx.lineWidth = 1.5;
            } else {
                ctx.fillStyle = '#142a1c';
                ctx.strokeStyle = '#25352c';
                ctx.lineWidth = 1;
            }

            ctx.fill();
            ctx.stroke();

            ctx.font = '9px "Fira Code", monospace';
            ctx.fillStyle = isTarget ? '#e5c158' : (isDeadEnd ? '#ff8888' : (isVisited ? '#d8e5dc' : '#4c5d54'));
            ctx.textAlign = 'center';
            ctx.fillText(node.id, nx, ny - 12);

            ctx.restore();
        }
    }

    /**
     * Update Global Timer Display in Top HUD
     */
    updateTimer(remainingSeconds) {
        if (!this.timerDisplayEl) return;

        const sec = Math.max(0, Math.ceil(remainingSeconds));
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        this.timerDisplayEl.textContent = timeStr;

        if (sec <= 15) {
            this.timerDisplayEl.className = 'stat-value text-red timer-critical';
        } else if (sec <= 30) {
            this.timerDisplayEl.className = 'stat-value text-gold timer-warning';
        } else {
            this.timerDisplayEl.className = 'stat-value text-gold';
        }
    }

    /**
     * Update full Journal & Tracker interface when DFSEngine emits a state event.
     */
    updateState(dfsEngine, eventInfo) {
        if (!dfsEngine) return;

        const currentNode = getNodeById(dfsEngine.currentNodeId);
        const state = dfsEngine.state;

        // 1. Update Discovered Node Chips Grid
        for (const n of MAZE_NODES) {
            const chip = document.getElementById(`chip-${n.id}`);
            if (chip) {
                const isCurrent = n.id === dfsEngine.currentNodeId;
                const isVisited = dfsEngine.visitedNodes.has(n.id);
                const isDeadEnd = dfsEngine.deadEndNodes.has(n.id);
                const isTarget = n.id === 'N12' && dfsEngine.isTargetReached;

                let chipClass = 'node-chip';
                if (isTarget) chipClass += ' target';
                else if (isCurrent) chipClass += ' current';
                else if (isDeadEnd) chipClass += ' dead-end';
                else if (isVisited) chipClass += ' visited';

                chip.className = chipClass;
            }
        }

        this.updateNodeCount(dfsEngine.visitedNodes.size);
        this.renderGraphTrackerCanvas(dfsEngine);

        // 2. Update Top HUD Bar
        if (currentNode && this.currentNodeNameEl) {
            this.currentNodeNameEl.textContent = currentNode.name;
        }

        if (this.explorationStateEl) {
            let stateLabel = 'Exploring';
            let stateClass = 'text-emerald';

            switch (state) {
                case 'NEW_NODE':
                    stateLabel = 'New Node Visited';
                    stateClass = 'text-emerald';
                    break;
                case 'GOING_DEEPER':
                    stateLabel = 'Going Deeper';
                    stateClass = 'text-emerald';
                    break;
                case 'DEAD_END':
                    stateLabel = 'DEAD END!';
                    stateClass = 'text-red';
                    break;
                case 'BACKTRACK':
                case 'BACKTRACKING':
                    stateLabel = 'Backtracking';
                    stateClass = 'text-gold';
                    break;
                case 'NEW_BRANCH':
                    stateLabel = 'New Branch';
                    stateClass = 'text-emerald';
                    break;
                case 'TARGET_FOUND':
                    stateLabel = 'TARGET FOUND!';
                    stateClass = 'text-gold';
                    break;
            }
            this.explorationStateEl.textContent = stateLabel;
            this.explorationStateEl.className = `stat-value ${stateClass}`;
        }

        if (this.currentNodeDetailsEl && currentNode) {
            const unvisitedCount = dfsEngine.getUnvisitedNeighbors(currentNode.id).length;
            this.currentNodeDetailsEl.textContent = `Location: ${currentNode.id} (${currentNode.type}) | Unvisited Branches: ${unvisitedCount}`;
        }

        // 3. Update DFS Stack Display Panel
        this.renderDFSStack(dfsEngine);

        // 4. Update Bottom Hint & Log Container
        if (eventInfo && eventInfo.message) {
            if (this.bottomHintEl) {
                this.bottomHintEl.textContent = eventInfo.message;
            }

            let logType = 'info';
            if (state === 'DEAD_END') logType = 'warning';
            else if (state === 'BACKTRACKING' || state === 'BACKTRACK') logType = 'hint';
            else if (state === 'TARGET_FOUND') logType = 'success';

            this.addLogEntry(eventInfo.message, logType);
        }
    }

    getLiveTraversalString(dfsEngine) {
        if (!dfsEngine || !dfsEngine.traversalSequence) return 'N0';
        const steps = ['N0'];
        for (let i = 1; i < dfsEngine.traversalSequence.length; i++) {
            const step = dfsEngine.traversalSequence[i];
            if (step.action === 'BACKTRACK' || step.action === 'BACKTRACKING' || step.action === 'NEW_BRANCH') {
                steps.push(`↩ ${step.to}`);
            } else {
                steps.push(`→ ${step.to}`);
            }
        }
        return steps.join(' ');
    }

    renderDFSStack(dfsEngine) {
        const stack = Array.isArray(dfsEngine) ? dfsEngine : (dfsEngine ? dfsEngine.dfsStack : ['N0']);
        if (this.stackBadgeEl) {
            this.stackBadgeEl.textContent = `DEPTH: ${stack.length}`;
        }

        if (!this.stackContainerEl) return;

        const liveTraversal = typeof dfsEngine === 'object' ? this.getLiveTraversalString(dfsEngine) : stack.join(' → ');

        let stackHTML = `
            <div class="dfs-stack-visual">
                <div class="stack-header-row" style="margin-bottom: 0.5rem;">
                    <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--gold-bright); font-weight: bold; line-height: 1.4;">
                        LIVE TRAVERSAL: <span style="color: #ffffff;">${liveTraversal}</span>
                    </div>
                    <div class="stack-title" style="margin-top: 0.3rem;">ACTIVE STACK: [ ${stack.join(' → ')} ]</div>
                </div>
                <div class="stack-items-list">
        `;

        for (let i = stack.length - 1; i >= 0; i--) {
            const nodeId = stack[i];
            const node = getNodeById(nodeId);
            const isTop = (i === stack.length - 1);

            stackHTML += `
                <div class="stack-item ${isTop ? 'stack-top' : ''}">
                    <span class="stack-index">${i}</span>
                    <span class="stack-node-id">${nodeId}</span>
                    <span class="stack-node-name">${node ? node.name : ''}</span>
                    ${isTop ? '<span class="stack-badge-top">TOP</span>' : ''}
                </div>
            `;
        }

        stackHTML += `
                </div>
            </div>
        `;

        this.stackContainerEl.innerHTML = stackHTML;
    }

    addLogEntry(message, type = 'info') {
        if (!this.logContainerEl) return;

        const now = new Date();
        const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const entry = document.createElement('div');
        entry.className = `log-entry log-entry-${type}`;
        entry.innerHTML = `
            <span class="log-time">${timeStr}</span>
            <span class="log-msg">${message}</span>
        `;

        this.logContainerEl.appendChild(entry);

        // Keep maximum 7 recent items visible in log
        while (this.logContainerEl.children.length > 7) {
            this.logContainerEl.removeChild(this.logContainerEl.firstChild);
        }

        this.logContainerEl.scrollTop = this.logContainerEl.scrollHeight;
    }
}
