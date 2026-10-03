# DFS – Dungeon of Forbidden Steps 🏰✨
> **A Magical Maze Algorithm Browser Game**

An atmospheric dark fantasy educational browser game that teaches **Depth-First Search (DFS)** through interactive physical maze exploration.

---

## 📖 Overview

**DFS – Dungeon of Forbidden Steps** combines retro dungeon crawling with data structures and algorithms education. Players navigate through algorithmic labyrinths, experiencing firsthand how the Depth-First Search algorithm explores paths, handles dead ends, and uses backtracking to find target objectives.

---

## 🌟 Features

- 🎮 **Interactive Maze Exploration**: Move through procedurally generated mazes using `WASD` or `Arrow Keys`.
- ⚡ **Algorithmic Visualization**: Learn how Depth-First Search works step-by-step with real-time feedback and state tracking.
- 📜 **Interactive Journal & Tutorial**: Comprehensive built-in guide explaining the stack data structure, recursion, and traversal logic.
- 🎵 **Atmospheric Audio & Sound Effects**: Built-in sound toggle and ambient audio cues to enhance gameplay.
- 🎨 **Dark Fantasy Design**: Custom dark-mode UI styled with glowing glassmorphism and smooth animations.
- 🚀 **Zero Dependencies**: Pure HTML5, CSS3, and Vanilla JavaScript—no external frameworks required!

---

## 🛠️ Getting Started

### Option 1: Using Node.js (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/manyaks005/DFS_dungeon-of-forbidden-steps.git
   cd DFS_dungeon-of-forbidden-steps
   ```

2. Start the local server:
   ```bash
   node server.js
   ```

3. Open your browser and navigate to:
   ```text
   http://localhost:8080
   ```

### Option 2: Direct Browser Launch

Simply double-click `index.html` or open it directly in any modern web browser.

---

## 📁 Project Structure

```text
DFS_dungeon-of-forbidden-steps/
├── index.html          # Main application entry point
├── style.css           # Styling, animations, and dark fantasy theme
├── server.js          # Pure Node.js HTTP static server (zero dependencies)
├── js/
│   ├── audio.js        # Sound effects and ambient audio controller
│   ├── config.js       # Game constants and configuration
│   ├── dfs.js          # Depth-First Search algorithm implementation
│   ├── game.js         # Core game loop and state management
│   ├── journal.js      # Educational journal UI & content
│   ├── maze.js         # Maze generation and grid rendering
│   ├── player.js       # Player controls and movement physics
│   └── tutorial.js     # Step-by-step game tutorial system
└── README.md           # Project documentation
```

---

## 🎮 Controls

| Action | Controls |
| :--- | :--- |
| Move Up | <kbd>W</kbd> or <kbd>↑</kbd> |
| Move Left | <kbd>A</kbd> or <kbd>←</kbd> |
| Move Down | <kbd>S</kbd> or <kbd>↓</kbd> |
| Move Right | <kbd>D</kbd> or <kbd>→</kbd> |
| Audio Toggle | Click 🔊 in footer |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/manyaks005/DFS_dungeon-of-forbidden-steps/issues).

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
