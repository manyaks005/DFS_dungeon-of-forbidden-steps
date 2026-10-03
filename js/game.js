/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Main Game Engine, Educational DFS Layer & Complete Flow Manager
   ========================================================================== */

class GameEngine {
    constructor() {
        this.state = 'MENU'; // MENU, STORY, TUTORIAL, PLAYING, WIN, JOURNEY, LEARN_SUMMARY

        this.mazeCanvas = document.getElementById('maze-canvas');
        this.mazeCtx = this.mazeCanvas ? this.mazeCanvas.getContext('2d') : null;

        this.titleCanvas = document.getElementById('title-bg-canvas');
        this.titleCtx = this.titleCanvas ? this.titleCanvas.getContext('2d') : null;

        // Subsystems
        this.dfsEngine = new DFSEngine(MAZE_NODES);
        this.maze = new MagicalMaze();
        this.player = new WizardPlayer(150, 850);
        this.journal = new FieldJournalUI();
        this.tutorialEngine = new DFSTutorialEngine('tutorial-graph-canvas', 'tutorial-caption');

        // Timers & State Flags
        this.remainingTime = CONFIG.GAME_DURATION;
        this.deadEndTimer = 0;
        this.isGameOver = false;
        this.gameResolved = false; // Outcome lock to prevent race conditions between Win & Loss

        // First-time educational concept tracker
        this.explainedConcepts = new Set();

        // Loop Timing & Card Timeouts
        this.lastTime = performance.now();
        this.animationFrameId = null;
        this.bannerTimeout = null;
        this.cardTimeout = null;

        this.titleParticles = [];
        this.initTitleParticles();

        this.initDFSCallbacks();
        this.initEventListeners();
        this.resizeTitleCanvas();
        this.startTitleLoop();
    }

    initDFSCallbacks() {
        this.dfsEngine.hooks.onTimeCostApplied = (cost, fromNodeId, toNodeId) => {
            const targetNode = getNodeById(toNodeId);
            if (targetNode) {
                this.maze.spawnFloatingCost(cost, targetNode.x, targetNode.y);
            }
        };

        this.dfsEngine.hooks.onDeadEnd = (nodeId) => {
            if (this.gameResolved || this.dfsEngine.isTargetReached) return;

            this.maze.inDeadEndDanger = true;
            this.maze.dementorNodeId = nodeId;
            this.deadEndTimer = CONFIG.DEAD_END_ESCAPE_TIME;
            this.maze.deadEndTimer = this.deadEndTimer;

            audioEngine.playDementorHiss();

            this.showDFSInActionCard('DEAD_END', {
                nodeId: nodeId,
                prevNodeId: this.dfsEngine.previousNodeId || 'N3'
            });
        };

        this.dfsEngine.hooks.onBacktrackSuccess = (poppedNode, currentNode) => {
            if (this.maze.inDeadEndDanger) {
                this.maze.inDeadEndDanger = false;
                this.maze.dementorNodeId = null;
                this.deadEndTimer = 0;
                this.maze.deadEndTimer = 0;

                audioEngine.playBacktrackSuccess();
                this.showBannerCue('BACKTRACK_SUCCESS', {
                    message: `✨ BACKTRACK SUCCESSFUL: Returned to ${currentNode}. Dementor retreats!`
                });
            }
        };

        this.dfsEngine.hooks.onStateChange = (state, record) => {
            if (record && (record.to || record.node)) {
                this.maze.triggerNodePulse(record.to || record.node);
            }
            this.journal.updateState(this.dfsEngine, record);

            // Trigger Educational Card for first occurrences or major events
            if (state === 'NEW_NODE') {
                if (!this.explainedConcepts.has('NEW_NODE')) {
                    this.showDFSInActionCard('NEW_NODE', record);
                } else {
                    this.showBannerCue('NEW_NODE', record);
                }
            } else if (state === 'GOING_DEEPER') {
                if (!this.explainedConcepts.has('GOING_DEEPER')) {
                    this.showDFSInActionCard('GOING_DEEPER', record);
                } else {
                    this.showBannerCue('GOING_DEEPER', record);
                }
            } else if (state === 'BACKTRACK' || state === 'BACKTRACKING') {
                if (!this.explainedConcepts.has('BACKTRACKING')) {
                    this.showDFSInActionCard('BACKTRACKING', record);
                } else {
                    this.showBannerCue('BACKTRACK', record);
                }
            } else if (state === 'NEW_BRANCH') {
                if (!this.explainedConcepts.has('NEW_BRANCH')) {
                    this.showDFSInActionCard('NEW_BRANCH', record);
                } else {
                    this.showBannerCue('NEW_BRANCH', record);
                }
            }
        };

        // TARGET FOUND VICTORY HOOK
        this.dfsEngine.hooks.onTargetFound = (nodeId) => {
            if (this.gameResolved) return;
            this.gameResolved = true;
            this.isGameOver = true;
            this.player.resetKeys();

            this.maze.inDeadEndDanger = false;
            this.deadEndTimer = 0;
            this.maze.deadEndTimer = 0;
            audioEngine.playBacktrackSuccess();

            this.showDFSInActionCard('TARGET_FOUND', { nodeId: nodeId });
            this.showBannerCue('TARGET_FOUND', { message: '🏆 TARGET FOUND: DFS reached the Relic Sanctum!' });

            // 1.5s Payoff before transitioning away from playable maze
            setTimeout(() => {
                this.switchState('WIN');
            }, 1500);
        };
    }

    /**
     * Contextual DFS IN ACTION Teaching Card Manager
     */
    showDFSInActionCard(conceptKey, data) {
        const cardEl = document.getElementById('dfs-in-action-card');
        const titleEl = document.getElementById('dfs-card-concept-title');
        const descEl = document.getElementById('dfs-card-concept-desc');
        const detailCurrEl = document.getElementById('card-curr-node');

        if (!cardEl || !titleEl || !descEl) return;

        this.explainedConcepts.add(conceptKey);

        let title = 'DFS IN ACTION';
        let desc = '';
        let detailText = `Node: ${this.dfsEngine.currentNodeId}`;

        switch (conceptKey) {
            case 'ROOT_NODE':
                title = 'ROOT NODE';
                desc = 'DFS begins graph exploration at a starting node called the root.';
                detailText = `Current Node: ${this.dfsEngine.currentNodeId} (START)`;
                break;
            case 'NEW_NODE':
                title = 'NEW NODE VISITED';
                desc = 'A node is a location in our graph. DFS marks each newly entered node as VISITED.';
                detailText = `Current: ${data.to || 'N1'} | Previous: ${data.from || 'N0'}`;
                break;
            case 'EDGE':
                title = 'EDGE EXPLORED';
                desc = 'A path connecting two nodes is called an edge. DFS traverses edges to move between nodes.';
                detailText = `Edge: ${data.from} → ${data.to}`;
                break;
            case 'GOING_DEEPER':
                title = 'GOING DEEPER (DEPTH +1)';
                desc = 'DFS explores as far as possible down one branch before attempting alternatives.';
                detailText = `Traversing Edge: ${data.from} → ${data.to}`;
                break;
            case 'DEAD_END':
                title = '⚠ DEAD END (0 UNVISITED NEIGHBORS)';
                desc = 'Current node has 0 unvisited neighbors remaining. DFS cannot continue deeper!';
                detailText = `DEAD END at ${data.nodeId}. MUST BACKTRACK TO ${data.prevNodeId}`;
                break;
            case 'BACKTRACKING':
                title = '↩ BACKTRACKING';
                desc = 'When stuck at a dead end, DFS retracts along its path to a previous node.';
                detailText = `Retracting: ${data.from || 'N4'} ↩ ${data.to || 'N3'}`;
                break;
            case 'NEW_BRANCH':
                title = 'NEW BRANCH AVAILABLE';
                desc = "Returned to previous node. Since an unvisited neighbor exists, DFS explores that new branch!";
                detailText = `Current: ${data.to} | Exploring Next Branch`;
                break;
            case 'TARGET_FOUND':
                title = 'TARGET FOUND';
                desc = 'DFS successfully traversed the graph to find the exit target!';
                detailText = `Target Node: ${data.nodeId || 'N12'} (SANCTUM)`;
                break;
        }

        titleEl.textContent = title;
        descEl.textContent = desc;
        if (detailCurrEl) detailCurrEl.textContent = detailText;

        // Dynamic left/right positioning to keep player, key, Dementor & escape route visible
        const targetNodeId = data.nodeId || data.to || (this.dfsEngine ? this.dfsEngine.currentNodeId : 'N0');
        const targetNode = typeof getNodeById === 'function' ? getNodeById(targetNodeId) : null;
        if (targetNode && targetNode.x > 700) {
            cardEl.style.left = '1.5rem';
            cardEl.style.right = 'auto';
        } else {
            cardEl.style.right = '1.5rem';
            cardEl.style.left = 'auto';
        }

        cardEl.classList.remove('card-hidden');

        if (this.cardTimeout) clearTimeout(this.cardTimeout);
        this.cardTimeout = setTimeout(() => {
            cardEl.classList.add('card-hidden');
        }, conceptKey === 'DEAD_END' ? 4500 : 3200);
    }

    showBannerCue(state, record) {
        const bannerEl = document.getElementById('dfs-event-banner');
        const titleEl = document.getElementById('banner-title');
        const textEl = document.getElementById('banner-text');
        const iconEl = document.getElementById('banner-icon');

        if (!bannerEl || !titleEl || !textEl) return;

        let icon = '📜';
        let title = 'DFS TRAVERSAL';
        let text = record ? record.message : '';
        let cueColor = '#e5c158';

        switch (state) {
            case 'NEW_NODE':
                icon = '🔎';
                title = 'NEW NODE DISCOVERED';
                text = "You've reached somewhere DFS hasn't explored yet.";
                cueColor = '#7de0a8';
                break;
            case 'GOING_DEEPER':
                icon = '🧭';
                title = 'GOING DEEPER';
                text = 'DFS explores one branch deeply before moving to another.';
                cueColor = '#7de0a8';
                break;
            case 'DEAD_END':
                icon = '💀';
                title = 'DEAD END!';
                text = `There are no unexplored paths here. ↩ BACKTRACK! Dementor approaching!`;
                cueColor = '#ff4d4d';
                break;
            case 'BACKTRACK':
            case 'BACKTRACKING':
                icon = '↩️';
                title = 'BACKTRACK';
                text = 'DFS returns along the stack toward the previous node.';
                cueColor = '#e5c158';
                break;
            case 'BACKTRACK_SUCCESS':
                icon = '✨';
                title = 'BACKTRACK SUCCESSFUL';
                text = 'Returned to previous junction! Dementor retreated into smoke.';
                cueColor = '#7de0a8';
                break;
            case 'NEW_BRANCH':
                icon = '🌿';
                title = 'TRY ANOTHER BRANCH';
                text = "We've returned to the previous node. Now DFS explores another unexplored path.";
                cueColor = '#7de0a8';
                break;
            case 'TARGET_FOUND':
                icon = '🏆';
                title = 'TARGET FOUND';
                text = 'THE MAZE IS CONQUERED! Transitioning to victory summary...';
                cueColor = '#e5c158';
                break;
            case 'TIMEOUT':
                icon = '⚡';
                title = 'THE DARK LORD FOUND YOU';
                text = 'Time ran out before the target was reached.';
                cueColor = '#ff3333';
                break;
            default:
                return;
        }

        if (iconEl) iconEl.textContent = icon;
        titleEl.textContent = title;
        textEl.textContent = text;

        bannerEl.classList.add('banner-visible');

        const currNode = getNodeById(this.dfsEngine.currentNodeId);
        if (currNode) {
            this.maze.spawnFloatingCue(title, currNode.x, currNode.y, cueColor);
        }

        if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
        this.bannerTimeout = setTimeout(() => {
            bannerEl.classList.remove('banner-visible');
        }, 3000);
    }

    initTitleParticles() {
        this.titleParticles = [];
        for (let i = 0; i < 60; i++) {
            this.titleParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                r: Math.random() * 2 + 1,
                speedY: -(Math.random() * 20 + 8),
                speedX: (Math.random() - 0.5) * 12,
                alpha: Math.random() * 0.6 + 0.2,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    resizeTitleCanvas() {
        if (this.titleCanvas) {
            this.titleCanvas.width = window.innerWidth;
            this.titleCanvas.height = window.innerHeight;
        }
    }

    hideGameOverModal() {
        const modal = document.getElementById('overlay-gameover');
        if (modal) {
            modal.classList.add('modal-hidden');
            modal.style.display = '';
            modal.style.opacity = '';
            modal.style.visibility = '';
        }

        const instModal = document.getElementById('overlay-instructions');
        if (instModal) {
            instModal.classList.add('modal-hidden');
            instModal.style.display = '';
            instModal.style.opacity = '';
            instModal.style.visibility = '';
        }

        const actionCard = document.getElementById('dfs-in-action-card');
        if (actionCard) {
            actionCard.classList.add('card-hidden');
        }

        const banner = document.getElementById('dfs-event-banner');
        if (banner) {
            banner.classList.remove('banner-visible');
        }

        if (this.maze) {
            this.maze.inDeadEndDanger = false;
            this.maze.dementorNodeId = null;
            this.maze.inVoldemortTimeout = false;
            this.maze.deadEndTimer = 0;
        }
        this.deadEndTimer = 0;
        this.isGameOver = false;
        this.gameResolved = false;
    }

    switchState(newState) {
        console.log(`Transitioning state: ${this.state} → ${newState}`);
        this.state = newState;

        this.hideGameOverModal();

        const screens = {
            MENU: document.getElementById('screen-menu'),
            STORY: document.getElementById('screen-story'),
            TUTORIAL: document.getElementById('screen-tutorial'),
            PLAYING: document.getElementById('screen-playing'),
            WIN: document.getElementById('screen-victory'),
            JOURNEY: document.getElementById('screen-journey'),
            LEARN_SUMMARY: document.getElementById('screen-learn-summary')
        };

        for (const key in screens) {
            if (screens[key]) {
                screens[key].classList.add('screen-hidden');
                screens[key].classList.remove('screen-active');
            }
        }

        const targetScreen = screens[newState];
        if (targetScreen) {
            targetScreen.classList.remove('screen-hidden');
            targetScreen.classList.add('screen-active');
        }

        if (newState === 'TUTORIAL') {
            this.tutorialEngine.start();
        } else {
            this.tutorialEngine.stop();
        }

        if (newState === 'PLAYING') {
            this.resetGameRun();
            this.lastTime = performance.now();
            this.startGameLoop();
            // Trigger initial ROOT NODE explanation card
            setTimeout(() => {
                this.showDFSInActionCard('ROOT_NODE', {});
            }, 600);
        } else if (newState === 'WIN') {
            this.stopGameLoop();
            this.populateVictoryScreen();
        } else if (newState === 'JOURNEY') {
            this.stopGameLoop();
            this.renderVictoryTraversalFlow();
            this.journal.renderJourneyGraphCanvas(this.dfsEngine);
        } else if (newState === 'LEARN_SUMMARY') {
            this.stopGameLoop();
            this.populateLearningSummary();
        } else {
            this.stopGameLoop();
        }
    }

    populateVictoryScreen() {
        const stats = this.dfsEngine.stats;

        const timeEl = document.getElementById('vstat-time');
        const nodesEl = document.getElementById('vstat-nodes');
        const deadEndsEl = document.getElementById('vstat-deadends');
        const backtracksEl = document.getElementById('vstat-backtracks');

        if (timeEl) timeEl.textContent = `${Math.floor(stats.timeUsed)}s`;
        if (nodesEl) nodesEl.textContent = `${stats.nodesVisited} / ${MAZE_NODES.length}`;
        if (deadEndsEl) deadEndsEl.textContent = `${stats.deadEndsEncountered}`;
        if (backtracksEl) backtracksEl.textContent = `${stats.successfulBacktracks}`;

        this.renderVictoryTraversalFlow();
    }

    renderVictoryTraversalFlow() {
        const container = document.getElementById('victory-traversal-sequence');
        if (!container) return;

        container.innerHTML = '';
        const seq = this.dfsEngine.traversalSequence;

        // Display string format: N0 → N1 → N8 → N9 ↩️ N8 ...
        let traversalStrParts = [];
        seq.forEach((step, idx) => {
            const nodeName = step.to || step.node || step.from;
            if (idx === 0) {
                traversalStrParts.push(nodeName);
            } else if (step.action === 'BACKTRACK' || step.action === 'BACKTRACKING' || step.action === 'NEW_BRANCH') {
                traversalStrParts.push(`↩️ ${nodeName}`);
            } else {
                traversalStrParts.push(`→ ${nodeName}`);
            }
        });

        const strBlock = document.createElement('div');
        strBlock.style.cssText = 'width: 100%; font-family: "Fira Code", monospace; font-size: 14px; font-weight: bold; color: #7de0a8; background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; border: 1px solid #2b4034; margin-bottom: 12px; text-align: center; word-wrap: break-word; line-height: 1.8;';
        strBlock.innerHTML = `<span style="color: #e5c158; margin-right: 8px;">MY DFS TRAVERSAL:</span> ${traversalStrParts.join(' ')}`;
        container.appendChild(strBlock);

        const chipsWrapper = document.createElement('div');
        chipsWrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%;';

        seq.forEach((step) => {
            const chip = document.createElement('div');
            let icon = '↓';
            let chipType = 'forward';

            if (step.action === 'START') {
                icon = '🎬';
                chipType = 'forward';
            } else if (step.action === 'BACKTRACK' || step.action === 'BACKTRACKING' || step.action === 'NEW_BRANCH') {
                icon = '↩';
                chipType = 'backtrack';
            } else if (step.action === 'DEAD_END') {
                icon = '⚠ DEAD END';
                chipType = 'dead-end';
            } else if (step.to === 'N12' || step.state === 'TARGET_FOUND') {
                icon = '🏆';
                chipType = 'target';
            }

            chip.className = `tflow-chip ${chipType}`;
            chip.innerHTML = `<span class="tflow-arrow">${icon}</span> ${step.to || step.node || step.from}`;
            chipsWrapper.appendChild(chip);
        });

        container.appendChild(chipsWrapper);
    }

    populateLearningSummary() {
        const container = document.getElementById('learn-summary-list');
        if (!container) return;

        const seq = this.dfsEngine.traversalSequence;
        const deadEnds = Array.from(this.dfsEngine.deadEndNodes);
        const firstDeadEnd = deadEnds.length > 0 ? deadEnds[0] : 'N4';

        container.innerHTML = `
            <div class="learning-step-item">
                <span class="step-num">1</span>
                <div class="step-desc">
                    <strong>START AT A ROOT NODE:</strong> Traversal began at node <kbd>N0</kbd> (Entrance Archway). DFS always initiates from a root node.
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">2</span>
                <div class="step-desc">
                    <strong>VISIT A NODE:</strong> Each newly reached junction was marked as <strong>VISITED</strong> (${this.dfsEngine.visitedNodes.size} / 13 nodes discovered).
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">3</span>
                <div class="step-desc">
                    <strong>FOLLOW AN EDGE:</strong> Moving between junctions explored graph edges (e.g. <kbd>N0 → N1</kbd>).
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">4</span>
                <div class="step-desc">
                    <strong>GO DEEPER:</strong> DFS continued as far as possible down one branch before trying alternatives.
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">5</span>
                <div class="step-desc">
                    <strong>REACH A DEAD END:</strong> Exploration halted when node <kbd>${firstDeadEnd}</kbd> had <strong>0 unvisited neighbors</strong> (represented by the Dementor encounter).
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">6</span>
                <div class="step-desc">
                    <strong>BACKTRACK:</strong> You physically returned to an earlier node. DFS retracted along its stack to find unexplored branches.
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">7</span>
                <div class="step-desc">
                    <strong>TRY ANOTHER BRANCH:</strong> Upon returning, DFS entered the next available unvisited branch.
                </div>
            </div>
            <div class="learning-step-item">
                <span class="step-num">8</span>
                <div class="step-desc">
                    <strong>CONTINUE UNTIL TARGET:</strong> Repeated the cycle until target node <kbd>N12</kbd> (Sanctum) was reached!
                </div>
            </div>
        `;
    }

    resetGameRun() {
        this.remainingTime = CONFIG.GAME_DURATION;
        this.deadEndTimer = 0;
        this.isGameOver = false;
        this.gameResolved = false;

        this.explainedConcepts.clear();

        this.maze.inDeadEndDanger = false;
        this.maze.dementorNodeId = null;
        this.maze.inVoldemortTimeout = false;
        this.maze.nodePulseTimers = {};

        this.dfsEngine.reset();
        this.player.resetPosition(150, 850);
        this.player.resetKeys();
        this.journal.updateState(this.dfsEngine);
        this.journal.updateTimer(this.remainingTime);

        this.hideGameOverModal();
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.resizeTitleCanvas());

        window.addEventListener('keydown', (e) => {
            const keyLower = e.key ? e.key.toLowerCase() : '';
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
                ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(keyLower)) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || keyLower.startsWith('arrow')) {
                    e.preventDefault();
                }
            }

            audioEngine.ensureContext();
            if (this.state === 'PLAYING' && !this.isGameOver && !this.gameResolved) {
                this.player.handleKeyDown(e);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.state === 'PLAYING') {
                this.player.handleKeyUp(e);
            }
        });

        window.addEventListener('blur', () => {
            if (this.player) {
                this.player.resetKeys();
            }
        });

        // ==================================================================
        // BUTTON EVENT HANDLERS AUDIT
        // ==================================================================
        document.getElementById('btn-enter-maze')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('STORY');
        });

        document.getElementById('btn-story-continue')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('TUTORIAL');
        });

        document.getElementById('btn-tutorial-understand')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('PLAYING');
        });

        document.getElementById('btn-replay-tutorial')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.tutorialEngine.reset();
        });

        const modalInfo = document.getElementById('modal-info');
        const modalBody = modalInfo ? modalInfo.querySelector('.modal-body') : null;
        const modalTitle = modalInfo ? modalInfo.querySelector('.modal-header h3') : null;

        const openHowToPlayModal = () => {
            audioEngine.playButtonClick();
            if (modalTitle) modalTitle.textContent = 'How To Play';
            if (modalBody) {
                modalBody.innerHTML = `
                    <h4>Gameplay & Controls</h4>
                    <ul style="text-align:left; line-height:1.6; margin-left: 15px; color: #a8d5b5;">
                        <li>Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to move your wizard.</li>
                        <li>Follow the currently unlocked magical path.</li>
                        <li>Collect the magical keys in the maze.</li>
                        <li>A Dementor appears when you complete a new dead-end branch.</li>
                        <li>Backtrack quickly to escape it!</li>
                        <li>New DFS branches unlock as you progress.</li>
                        <li>Complete the required exploration and reach the final door before time runs out.</li>
                        <li>The Dark Lord catches you if the timer reaches zero.</li>
                        <li>Watch the live graph while you explore.</li>
                    </ul>
                `;
            }
            modalInfo?.classList.remove('modal-hidden');
        };

        const openLearnDFSModal = () => {
            audioEngine.playButtonClick();
            if (modalTitle) modalTitle.textContent = 'Learn DFS Algorithm';
            if (modalBody) {
                modalBody.innerHTML = `
                    <p style="color: #a8d5b5;"><strong>Depth First Search (DFS)</strong> explores a graph by going as deep as possible along one branch before trying another.</p>
                    <div style="background: rgba(0,0,0,0.4); border-left: 3px solid #7de0a8; padding: 10px; margin: 12px 0; text-align: center; font-family: 'Fira Code', monospace; line-height: 1.5; color: #7de0a8;">
                        START<br>↓<br>Visit an unvisited neighbour<br>↓<br>Go deeper<br>↓<br>No unvisited neighbour?<br>↓<br>Backtrack<br>↓<br>Try the next unvisited branch<br>↓<br>Repeat
                    </div>
                    <p style="color: #a8d5b5;">In this game, the maze is a graph. Junctions are nodes and paths are edges.</p>
                    <p style="color: #a8d5b5;">The live graph shows the same DFS traversal that you perform inside the maze.</p>
                    <p style="color: #a8d5b5;">DFS does not automatically choose the shortest or fastest route.</p>
                `;
            }
            modalInfo?.classList.remove('modal-hidden');
        };

        const closeModal = () => {
            audioEngine.playButtonClick();
            modalInfo?.classList.add('modal-hidden');
        };

        document.getElementById('btn-how-to-play')?.addEventListener('click', openHowToPlayModal);
        document.getElementById('btn-learn-dfs')?.addEventListener('click', openLearnDFSModal);
        document.getElementById('btn-modal-close')?.addEventListener('click', closeModal);
        document.getElementById('btn-modal-ok')?.addEventListener('click', closeModal);

        document.getElementById('btn-hud-reset')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.resetGameRun();
            this.journal.addLogEntry('Reset wizard and maze state to Entrance Archway (N0).', 'hint');
        });

        document.getElementById('btn-hud-menu')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('MENU');
        });

        // Game Over Overlay Actions
        document.getElementById('btn-gameover-retry')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('PLAYING');
        });

        document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('MENU');
        });

        // Victory Screen Actions
        document.getElementById('btn-victory-journey')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('JOURNEY');
        });

        document.getElementById('btn-victory-learn')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('LEARN_SUMMARY');
        });

        document.getElementById('btn-victory-replay')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('PLAYING');
        });

        document.getElementById('btn-victory-menu')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('MENU');
        });

        // Journey Screen Actions
        document.getElementById('btn-journey-learn')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('LEARN_SUMMARY');
        });

        document.getElementById('btn-journey-replay')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('PLAYING');
        });

        document.getElementById('btn-journey-menu')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('MENU');
        });

        // Learn Summary Screen Actions
        document.getElementById('btn-learn-back')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('JOURNEY');
        });

        document.getElementById('btn-learn-replay')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('PLAYING');
        });

        document.getElementById('btn-learn-menu')?.addEventListener('click', () => {
            audioEngine.playButtonClick();
            this.switchState('MENU');
        });

        document.getElementById('audio-toggle')?.addEventListener('click', () => {
            const isMuted = audioEngine.toggleMute();
            const el = document.getElementById('audio-toggle');
            if (el) {
                el.textContent = isMuted ? '🔇 Audio: Off' : '🔊 Audio: On';
            }
        });
    }

    startTitleLoop() {
        const renderTitle = () => {
            if (this.state === 'MENU' && this.titleCtx) {
                this.renderTitleBackground();
            }
            requestAnimationFrame(renderTitle);
        };
        requestAnimationFrame(renderTitle);
    }

    renderTitleBackground() {
        const ctx = this.titleCtx;
        const w = this.titleCanvas.width;
        const h = this.titleCanvas.height;

        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#040d07');
        bgGrad.addColorStop(0.6, '#081c10');
        bgGrad.addColorStop(1, '#020703');

        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const glowGrad = ctx.createRadialGradient(
            w * 0.5, h * 0.6, 10,
            w * 0.5, h * 0.6, h * 0.5
        );
        glowGrad.addColorStop(0, 'rgba(255, 140, 0, 0.15)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, w, h);

        for (const p of this.titleParticles) {
            p.y += p.speedY * 0.016;
            p.x += p.speedX * 0.016;
            p.phase += 0.03;
            p.alpha = 0.2 + 0.5 * Math.sin(p.phase);

            if (p.y < 0) p.y = h;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;

            ctx.fillStyle = `rgba(229, 193, 88, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#030a05';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h - 160);
        ctx.quadraticCurveTo(w * 0.25, h - 220, w * 0.5, h - 170);
        ctx.quadraticCurveTo(w * 0.75, h - 240, w, h - 180);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
    }

    startGameLoop() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        const loop = (now) => {
            if (this.state !== 'PLAYING') return;

            const dt = Math.min(0.05, (now - this.lastTime) / 1000);
            this.lastTime = now;

            this.update(dt);
            this.render();

            this.animationFrameId = requestAnimationFrame(loop);
        };

        this.animationFrameId = requestAnimationFrame(loop);
    }

    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    update(dt) {
        if (this.isGameOver || this.gameResolved) {
            this.maze.update(dt);
            return;
        }

        // 1. Update Global Timer
        if (!this.dfsEngine.isTargetReached) {
            this.remainingTime -= dt;
            this.dfsEngine.stats.remainingTime = this.remainingTime;
            this.dfsEngine.stats.timeUsed = CONFIG.GAME_DURATION - this.remainingTime;

            this.journal.updateTimer(this.remainingTime);

            if (this.remainingTime <= 0) {
                this.triggerGlobalTimeout();
                return;
            }
        }

        // 2. Update Dead End Escape Local Countdown
        if (this.maze.inDeadEndDanger) {
            this.deadEndTimer -= dt;
            this.maze.deadEndTimer = this.deadEndTimer;

            const bannerText = document.getElementById('banner-text');
            if (bannerText) {
                bannerText.textContent = `DEAD END! Dementor striking in ${Math.max(0, Math.ceil(this.deadEndTimer))}s! Turn around and BACKTRACK!`;
            }

            if (this.deadEndTimer <= 0) {
                this.triggerDeadEndFailure();
                return;
            }
        }

        // 3. Update Player & Maze
        this.player.update(dt, this.maze, this.dfsEngine);
        this.maze.update(dt, this.dfsEngine, this.player.x, this.player.y);

        // Detect node entry
        const currentNode = this.maze.getCurrentNode(this.player.x, this.player.y);
        if (currentNode) {
            this.dfsEngine.onPlayerEnterNode(currentNode.id);
        }
    }

    triggerDeadEndFailure() {
        if (this.isGameOver || this.gameResolved) return;
        this.isGameOver = true;
        this.gameResolved = true;

        this.maze.inDeadEndDanger = true;
        this.player.isMoving = false;

        audioEngine.playNodeChime(true);

        this.showGameOverModal(
            '💀',
            'THE DEMENTOR CAUGHT YOU',
            'At a dead end, DFS must backtrack to continue exploring.'
        );
    }

    triggerGlobalTimeout() {
        if (this.isGameOver || this.gameResolved) return;
        this.isGameOver = true;
        this.gameResolved = true;

        this.maze.inDeadEndDanger = false;
        this.maze.inVoldemortTimeout = true;
        this.player.isMoving = false;

        audioEngine.playVoldemortRumble();

        this.showBannerCue('TIMEOUT', {
            message: 'THE DARK LORD FOUND YOU: Time ran out before the target was reached.'
        });

        // 2.5s Cinematic Reveal of the Dark Lord Apparition before modal overlay
        setTimeout(() => {
            this.showGameOverModal(
                '⚡',
                'THE DARK LORD FOUND YOU',
                'Time ran out before the target was reached.'
            );
        }, 2500);
    }

    showGameOverModal(icon, headline, subtext) {
        const modal = document.getElementById('overlay-gameover');
        const iconEl = document.getElementById('gameover-icon');
        const headlineEl = document.getElementById('gameover-headline');
        const subtextEl = document.getElementById('gameover-subtext');
        const statsEl = document.getElementById('gameover-stats');

        if (!modal) return;

        if (iconEl) iconEl.textContent = icon;
        if (headlineEl) headlineEl.textContent = headline;
        if (subtextEl) subtextEl.textContent = subtext;

        if (statsEl) {
            const s = this.dfsEngine.stats;
            statsEl.innerHTML = `
                <div><span class="stat-item-label">Time Used:</span> <span class="stat-item-val">${Math.floor(s.timeUsed)}s</span></div>
                <div><span class="stat-item-label">Nodes Visited:</span> <span class="stat-item-val">${s.nodesVisited} / ${MAZE_NODES.length}</span></div>
                <div><span class="stat-item-label">Dead Ends:</span> <span class="stat-item-val">${s.deadEndsEncountered}</span></div>
                <div><span class="stat-item-label">Backtracks:</span> <span class="stat-item-val">${s.successfulBacktracks}</span></div>
            `;
        }

        modal.classList.remove('modal-hidden');
    }

    render() {
        if (!this.mazeCtx) return;

        this.maze.render(this.mazeCtx, this.dfsEngine, this.player.x, this.player.y);
        this.player.render(this.mazeCtx);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
});
