/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Core DFS Algorithm State Machine & Traversal Engine
   ========================================================================== */

class DFSEngine {
    constructor(nodes) {
        this.nodes = nodes;
        this.adjacencyMap = new Map();
        
        for (const n of nodes) {
            this.adjacencyMap.set(n.id, n.neighbors);
        }

        // Callback hooks initialized once per DFSEngine instance
        this.hooks = {
            onDeadEnd: null,
            onBacktrackSuccess: null,
            onNewBranch: null,
            onTargetFound: null,
            onTimeCostApplied: null,
            onStateChange: null
        };

        this.reset();
    }

    reset() {
        this.currentNodeId = 'N0';
        this.previousNodeId = null;
        
        this.visitedNodes = new Set(['N0']);
        this.deadEndNodes = new Set();
        this.collectedKeys = new Set();
        this.deadEndEncounterCompleted = new Set();
        this.dfsStack = ['N0']; // Active DFS exploration stack
        
        this.state = 'EXPLORING'; // EXPLORING, NEW_NODE, GOING_DEEPER, DEAD_END, BACKTRACK, NEW_BRANCH, TARGET_FOUND
        
        this.traversalSequence = [
            { type: 'START', node: 'N0', state: 'EXPLORING', timestamp: Date.now() }
        ];

        this.backtrackCount = 0;
        this.successfulBacktracks = 0;
        this.isTargetReached = false;
        this.totalTravelCostCharged = 0;

        // Statistics collector for summary screen
        this.stats = {
            initialTime: CONFIG.GAME_DURATION,
            remainingTime: CONFIG.GAME_DURATION,
            timeUsed: 0,
            nodesVisited: 1,
            deadEndsEncountered: 0,
            successfulBacktracks: 0,
            traversalSequence: this.traversalSequence
        };
    }

    getUnvisitedNeighbors(nodeId) {
        const neighbors = this.adjacencyMap.get(nodeId) || [];
        return neighbors.filter(id => {
            if (this.visitedNodes.has(id)) return false;
            if (nodeId === 'N1' && id === 'N2' && (!this.visitedNodes.has('N9') || !this.collectedKeys.has('N9'))) return false;
            if (nodeId === 'N3' && id === 'N5' && (!this.visitedNodes.has('N4') || !this.collectedKeys.has('N4'))) return false;
            if (nodeId === 'N5' && id === 'N7' && (!this.visitedNodes.has('N6') || !this.collectedKeys.has('N6'))) return false;
            if (nodeId === 'N7' && id === 'N12' && (!this.visitedNodes.has('N11') || !this.collectedKeys.has('N11') || this.collectedKeys.size < 4 || this.visitedNodes.size < 12)) return false;
            return true;
        });
    }

    hasUnvisitedNeighbors(nodeId) {
        return this.getUnvisitedNeighbors(nodeId).length > 0;
    }

    /**
     * Determines whether an edge (fromId -> toId) is currently unlocked according to DFS progression rules.
     */
    isEdgeAllowed(fromId, toId) {
        if (!fromId || !toId) return false;

        const isN1_N2 = (fromId === 'N1' && toId === 'N2') || (fromId === 'N2' && toId === 'N1');
        const isN3_N5 = (fromId === 'N3' && toId === 'N5') || (fromId === 'N5' && toId === 'N3');
        const isN5_N7 = (fromId === 'N5' && toId === 'N7') || (fromId === 'N7' && toId === 'N5');
        const isN7_N12 = (fromId === 'N7' && toId === 'N12') || (fromId === 'N12' && toId === 'N7');

        // Gate N1-N2 requires N9 visited AND key at N9 collected
        if (isN1_N2) {
            if (!this.visitedNodes.has('N9') || !this.collectedKeys.has('N9')) {
                return false;
            }
        }

        // Gate N3-N5 requires N4 visited AND key at N4 collected
        if (isN3_N5) {
            if (!this.visitedNodes.has('N4') || !this.collectedKeys.has('N4')) {
                return false;
            }
        }

        // Gate N5-N7 requires N6 visited AND key at N6 collected
        if (isN5_N7) {
            if (!this.visitedNodes.has('N6') || !this.collectedKeys.has('N6')) {
                return false;
            }
        }

        // Target node N12 requires ALL 4 keys collected and ALL 12 prior nodes visited
        if (isN7_N12) {
            if (this.collectedKeys.size < 4 || this.visitedNodes.size < 12) {
                return false;
            }
        }

        // 1. Both nodes already visited -> ALLOWED
        if (this.visitedNodes.has(fromId) && this.visitedNodes.has(toId)) {
            return true;
        }

        // 2. Active backtrack edge along stack -> ALLOWED
        if (this.dfsStack.length >= 2 &&
            ((this.dfsStack[this.dfsStack.length - 1] === fromId && this.dfsStack[this.dfsStack.length - 2] === toId) ||
             (this.dfsStack[this.dfsStack.length - 1] === toId && this.dfsStack[this.dfsStack.length - 2] === fromId))) {
            return true;
        }

        // 3. First unvisited neighbor of current active stack top -> ALLOWED
        const activeNodeId = this.currentNodeId;
        if (fromId === activeNodeId) {
            const unvisited = this.getUnvisitedNeighbors(fromId);
            if (unvisited.length > 0 && unvisited[0] === toId) {
                return true;
            }
        } else if (toId === activeNodeId) {
            const unvisited = this.getUnvisitedNeighbors(toId);
            if (unvisited.length > 0 && unvisited[0] === fromId) {
                return true;
            }
        }

        return false;
    }

    triggerDementorIfEligible(nodeId) {
        if (!nodeId || this.isTargetReached) return false;
        const node = typeof getNodeById === 'function' ? getNodeById(nodeId) : null;
        const isPhysicalDeadEnd = node && node.type === 'DEAD_END';

        if (isPhysicalDeadEnd && 
            this.currentNodeId === nodeId && 
            this.collectedKeys.has(nodeId) && 
            !this.deadEndEncounterCompleted.has(nodeId)) {
            
            this.deadEndNodes.add(nodeId);
            this.state = 'DEAD_END';
            this.stats.deadEndsEncountered++;
            
            if (this.hooks.onDeadEnd) {
                this.hooks.onDeadEnd(nodeId);
            }
            return true;
        }
        return false;
    }

    /**
     * Main physical traversal event processor.
     * Triggered when player physically steps into a node region.
     */
    onPlayerEnterNode(nodeId) {
        if (nodeId === this.currentNodeId || this.isTargetReached) {
            return null;
        }

        const prevNodeId = this.currentNodeId;
        this.previousNodeId = prevNodeId;
        this.currentNodeId = nodeId;

        // Calculate and apply route travel cost for this edge
        const cost = getEdgeCost(prevNodeId, nodeId);
        this.totalTravelCostCharged += cost;

        if (this.hooks.onTimeCostApplied) {
            this.hooks.onTimeCostApplied(cost, prevNodeId, nodeId);
        }

        let eventType = 'MOVE';
        let message = '';

        const node = typeof getNodeById === 'function' ? getNodeById(nodeId) : null;
        const isPhysicalDeadEnd = node && node.type === 'DEAD_END';

        // ------------------------------------------------------------------
        // CASE 1: TARGET NODE REACHED
        // ------------------------------------------------------------------
        if (nodeId === 'N12') {
            if (this.visitedNodes.size < 12 || this.collectedKeys.size < 4) {
                this.currentNodeId = prevNodeId;
                return null;
            }
            this.visitedNodes.add(nodeId);
            if (!this.dfsStack.includes(nodeId)) {
                this.dfsStack.push(nodeId);
            }
            this.isTargetReached = true;
            this.state = 'TARGET_FOUND';
            eventType = 'TARGET_FOUND';
            message = 'TARGET FOUND: DFS reached the Sanctum of the Relic!';

            if (this.hooks.onTargetFound) this.hooks.onTargetFound(nodeId);
        }
        // ------------------------------------------------------------------
        // CASE 2: DISCOVERING A NEW UNVISITED NODE
        // ------------------------------------------------------------------
        else if (!this.visitedNodes.has(nodeId)) {
            this.visitedNodes.add(nodeId);
            this.dfsStack.push(nodeId);

            if (isPhysicalDeadEnd) {
                this.deadEndNodes.add(nodeId);
                this.state = 'DEAD_END';
                eventType = 'DEAD_END';
                message = `DEAD END at ${nodeId}: Physical dead end discovered! BACKTRACK!`;

                this.triggerDementorIfEligible(nodeId);
            } else if (this.dfsStack.length > 2) {
                this.state = 'GOING_DEEPER';
                eventType = 'GOING_DEEPER';
                message = `GOING DEEPER: DFS explores branch ${prevNodeId} → ${nodeId}.`;
            } else {
                this.state = 'NEW_NODE';
                eventType = 'NEW_NODE';
                message = `VISIT ${nodeId}: DFS explores root branch ${prevNodeId} → ${nodeId}.`;
            }
        }
        // ------------------------------------------------------------------
        // CASE 3: GENUINE DFS BACKTRACKING ALONG ACTIVE STACK
        // ------------------------------------------------------------------
        else if (this.dfsStack.length >= 2 && this.dfsStack[this.dfsStack.length - 2] === nodeId) {
            const poppedNode = this.dfsStack.pop();
            this.backtrackCount++;
            this.successfulBacktracks++;
            this.stats.successfulBacktracks++;
            
            if (poppedNode) {
                const poppedObj = typeof getNodeById === 'function' ? getNodeById(poppedNode) : null;
                // Only mark deadEndEncounterCompleted if popped node is a physical DEAD_END and its key was collected
                if (poppedObj && poppedObj.type === 'DEAD_END' && this.collectedKeys.has(poppedNode)) {
                    this.deadEndEncounterCompleted.add(poppedNode);
                }
            }

            const hasBranches = this.hasUnvisitedNeighbors(nodeId);
            
            if (hasBranches) {
                this.state = 'NEW_BRANCH';
                eventType = 'NEW_BRANCH';
                message = `NEXT BRANCH: Returned to ${nodeId}. Next unvisited branch unlocked!`;
                if (this.hooks.onNewBranch) this.hooks.onNewBranch(nodeId);
            } else {
                this.state = 'BACKTRACK';
                eventType = 'BACKTRACK';
                message = `BACKTRACK: DFS returns along stack to ${nodeId}.`;
            }

            if (this.hooks.onBacktrackSuccess) this.hooks.onBacktrackSuccess(poppedNode, nodeId);
        }
        // ------------------------------------------------------------------
        // CASE 4: REVISITING PREVIOUSLY DISCOVERED PATH OR EXPLORED DEAD END
        // ------------------------------------------------------------------
        else {
            if (isPhysicalDeadEnd && !this.deadEndEncounterCompleted.has(nodeId) && this.collectedKeys.has(nodeId)) {
                if (!this.dfsStack.includes(nodeId)) {
                    this.dfsStack.push(nodeId);
                }
                this.state = 'DEAD_END';
                eventType = 'DEAD_END';
                message = `DEAD END at ${nodeId}: Physical dead end! BACKTRACK!`;

                this.triggerDementorIfEligible(nodeId);
            } else {
                this.state = 'EXPLORING';
                eventType = 'EXPLORING';
                message = `EXPLORING: Re-traversing known path to node ${nodeId}.`;
            }
        }

        // Update statistics
        this.stats.nodesVisited = this.visitedNodes.size;

        // Record Traversal Entry
        const record = {
            action: eventType,
            from: prevNodeId,
            to: nodeId,
            cost: cost,
            state: this.state,
            stack: [...this.dfsStack],
            timestamp: Date.now(),
            message: message
        };
        this.traversalSequence.push(record);

        if (this.hooks.onStateChange) {
            this.hooks.onStateChange(this.state, record);
        }

        return record;
    }

    getEdgeState(nodeA, nodeB) {
        const inStackA = this.dfsStack.indexOf(nodeA);
        const inStackB = this.dfsStack.indexOf(nodeB);

        if (inStackA !== -1 && inStackB !== -1 && Math.abs(inStackA - inStackB) === 1) {
            return 'ACTIVE_STACK';
        }

        const wasTraversed = this.traversalSequence.some(
            t => (t.from === nodeA && t.to === nodeB) || (t.from === nodeB && t.to === nodeA)
        );

        if (wasTraversed) {
            return 'TRAVERSED';
        }

        return 'UNEXPLORED';
    }
}
