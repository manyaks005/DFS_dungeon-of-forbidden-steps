/* ==========================================================================
   DFS – Dungeon of Forbidden Steps
   Config & Constants Module (Phase 3 Integration)
   ========================================================================== */

const CONFIG = {
    // Developer Debug Flag
    DEBUG: false,

    // Gameplay Timers (Seconds)
    GAME_DURATION: 90,          // Authoritative global timer for the maze (90 seconds / 01:30)
    DEAD_END_ESCAPE_TIME: 5,    // Local escape countdown before Dementor strikes

    // Canvas dimensions
    CANVAS_WIDTH: 1400,
    CANVAS_HEIGHT: 1000,

    // Player settings
    PLAYER: {
        RADIUS: 14,
        SPEED: 250,
        TRIGGER_RADIUS: 55,
        ROTATION_SPEED: 12,
        COLOR_CLOAK: '#1a3323',
        COLOR_TRIM: '#d4af37',
        COLOR_SKIN: '#ebd2b8',
        COLOR_HAT: '#0d2115',
        COLOR_STAFF_GEM: '#7de0a8',
    },

    // Audio volume controls
    AUDIO: {
        MASTER_VOLUME: 0.35,
        SFX_VOLUME: 0.5,
        MUSIC_VOLUME: 0.25,
    },

    // Color Palette
    COLORS: {
        BG_VOID: '#020704',
        HEDGE_BASE: '#091c10',
        HEDGE_TOP: '#1b4d2c',
        HEDGE_SHADOW: '#040d07',
        HEDGE_LEAF_LIGHT: '#3a855a',
        STONE_FLOOR: '#18241d',
        STONE_GRID: '#25352c',
        PATH_LINE: '#2b4034',
        TORCH_ORANGE: '#ff9d00',
        TORCH_CORE: '#ffe89c',
        MAGIC_EMERALD: '#7de0a8',
        RELIC_GOLD: '#e5c158',
        RELIC_GLOW: 'rgba(229, 193, 88, 0.4)',
        DEAD_END_RED: '#b83232',
        BACKTRACK_ORANGE: '#d95c00',
        CRIMSON_DARK: '#800c0c',
    }
};

/**
 * Predefined Route Costs (Seconds deducted per completed corridor traversal)
 * Note: Costs represent travel effort for gameplay time pressure.
 * THEY NEVER INFLUENCE DFS BRANCH SELECTION!
 */
const EDGE_COSTS = {
    'N0-N1': 4,
    'N1-N2': 5,
    'N1-N8': 5,
    'N2-N3': 5,
    'N3-N4': 4,
    'N3-N5': 5,
    'N5-N6': 4,
    'N5-N7': 6,
    'N7-N10': 5,
    'N10-N11': 4,
    'N7-N12': 6,
    'N8-N9': 5,
};

/**
 * Helper to get bidirectional edge travel cost between two node IDs
 */
function getEdgeCost(nodeA, nodeB) {
    const key1 = `${nodeA}-${nodeB}`;
    const key2 = `${nodeB}-${nodeA}`;
    return EDGE_COSTS[key1] || EDGE_COSTS[key2] || 4;
}

/**
 * Predefined 13-Node Graph for DFS Engine Integration.
 */
const MAZE_NODES = [
    {
        id: 'N0',
        name: 'Entrance Archway',
        type: 'START',
        x: 150,
        y: 850,
        neighbors: ['N1'],
        description: 'The dark southern gates into the Forbidden Maze.'
    },
    {
        id: 'N1',
        name: 'Willow Junction',
        type: 'JUNCTION',
        x: 350,
        y: 850,
        neighbors: ['N0', 'N8', 'N2'],
        description: 'An ancient weeping willow overhangs a split path.'
    },
    {
        id: 'N2',
        name: 'Mossy Fork North',
        type: 'JUNCTION',
        x: 350,
        y: 500,
        neighbors: ['N1', 'N3'],
        description: 'Moist moss-covered stone pillars point deeper north.'
    },
    {
        id: 'N3',
        name: 'Forgotten Arch',
        type: 'JUNCTION',
        x: 600,
        y: 500,
        neighbors: ['N2', 'N4', 'N5'],
        description: 'A broken stone archway leading into dense hedges.'
    },
    {
        id: 'N4',
        name: 'Owl Grotto',
        type: 'DEAD_END',
        x: 600,
        y: 200,
        neighbors: ['N3'],
        description: 'A secluded alcove enclosed by towering hedges. DEAD END.'
    },
    {
        id: 'N5',
        name: 'Shadow Passage',
        type: 'JUNCTION',
        x: 850,
        y: 500,
        neighbors: ['N3', 'N6', 'N7'],
        description: 'Narrow gloomy corridor surrounded by rustling leaves.'
    },
    {
        id: 'N6',
        name: 'Ivy Vault',
        type: 'DEAD_END',
        x: 850,
        y: 800,
        neighbors: ['N5'],
        description: 'An ivy-choked dead end courtyard with stone basin. DEAD END.'
    },
    {
        id: 'N7',
        name: 'Emerald Chamber',
        type: 'JUNCTION',
        x: 1100,
        y: 500,
        neighbors: ['N5', 'N10', 'N12'],
        description: 'A broad clearing illuminated by strange glowing moss.'
    },
    {
        id: 'N8',
        name: 'Sunken Corridor',
        type: 'JUNCTION',
        x: 350,
        y: 950,
        neighbors: ['N1', 'N9'],
        description: 'A damp stone passage sloping downhill to the south.'
    },
    {
        id: 'N9',
        name: 'Crypt of Whispers',
        type: 'DEAD_END',
        x: 850,
        y: 950,
        neighbors: ['N8'],
        description: 'An eerie dead-end tomb with faint whispering wind. DEAD END.'
    },
    {
        id: 'N10',
        name: 'Elder Hedge Fork',
        type: 'JUNCTION',
        x: 1100,
        y: 250,
        neighbors: ['N7', 'N11'],
        description: 'Thick elderberry hedges twisting into a tight bend.'
    },
    {
        id: 'N11',
        name: 'Thorn Grove',
        type: 'DEAD_END',
        x: 1300,
        y: 250,
        neighbors: ['N10'],
        description: 'Impenetrable wall of razor-sharp thorns. DEAD END.'
    },
    {
        id: 'N12',
        name: 'Sanctum of the Relic',
        type: 'TARGET',
        x: 1300,
        y: 500,
        neighbors: ['N7'],
        description: 'The golden altar holding the enchanted Relic Goblet.'
    }
];

function getNodeById(id) {
    return MAZE_NODES.find(n => n.id === id) || null;
}
