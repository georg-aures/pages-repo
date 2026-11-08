# Georg's Arcade

A static JavaScript arcade for GitHub Pages. The homepage offers two games: classic-style Pac-Man and Dino Run, a pixel-art endless runner.

## Play

Open **https://georg-aures.github.io/pages-repo/** and choose **Let's play** for Pac-Man or **Let's run** for Dino Run. Browser Back, Escape, or **All games** returns to the collection. Switching games stops the previous game's simulation. Both games pause when the browser loses focus.

### Pac-Man

Direct link: **https://georg-aures.github.io/pages-repo/#pacman**.

- **Move:** arrow keys or WASD. On a phone, tap the direction pad or swipe the maze. A turn entered early is kept until the next available junction.
- **Pause/resume:** P, Space while the maze has focus, or the Pause button. Switching tabs also pauses the game.
- **All games:** Escape or the All games button. Browser Back returns from the game to the selection screen.
- **Restart:** the circular arrow button. Sound starts muted and can be enabled with the music-note button.

Clear all 244 dots to advance. Dots score 10 points and power pellets score 50. While ghosts are blue, eating them scores 200, 400, 800, then 1,600 points. Cherries appear twice per maze and score 100 × the level (up to 1,000). The run starts with three lives and awards one extra life at 10,000 points. Levels gradually become faster with shorter power-pellet duration.

### Dino Run

Direct link: **https://georg-aures.github.io/pages-repo/#dino**.

- **Start/jump:** Space, up arrow, W, the Jump button, or tap the desert. Hold to jump higher; release for a shorter hop. There is no midair double jump.
- **Duck:** hold down arrow, S, or the Duck button. Ducking in midair brings the dinosaur down sooner. Keyboard activation of the Duck button toggles ducking for assistive technology users.
- **Pause/resume:** P or the Pause button. The run waits for your first jump, so there is time to read the controls.
- **Restart:** the circular arrow, R, or Enter while the desert has focus. After a collision, choose **Run again** or jump to try again immediately.

Jump over single cacti and clusters. Birds appear after fifteen seconds; duck under low birds or stay on the ground beneath high birds. Score increases with distance and speed rises gradually to a cap. On smaller screens, the maximum speed preserves visible reaction time. A collision ends the current run.

Each game stores a separate personal best in the current browser. Sound is shared across the arcade, starts muted, and can be enabled with the music-note button. Both games also run when browser storage is unavailable. There is no server or public leaderboard.

## Run locally

Serve this directory with any static HTTP server, for example:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080. JavaScript modules require an HTTP server rather than opening the HTML file directly.

No installation or build is required. Google Fonts is optional; the page falls back to system fonts if it is unavailable. Game graphics are drawn locally with Canvas and audio is synthesized with Web Audio.

## GitHub Pages

The site files are in the repository root. In **Settings → Pages**, use **Deploy from a branch**, branch **main**, folder **/ (root)**. GitHub Pages publishes the site after a commit to that branch. Keep `.nojekyll` so the files are served directly.

## Source and tests

- `index.html` — game selection, game screen, and accessible controls.
- `styles.css` — desktop and phone layouts.
- `engine.js` — maze, movement, four ghost personalities, scoring, and game lifecycle, independent of the DOM.
- `dino-engine.js` — frame-independent runner physics, obstacles, collision shapes, and difficulty.
- `dino.js` — original pixel-art renderer and Dino Run controls, HUD, overlays, and storage.
- `app.js` — Pac-Man renderer and controls, game routing, shared animation loop, and sound.
- `tests/engine.test.js` and `tests/dino.test.js` — 24 game-rule regression tests.

Run the tests with Node.js 18 or later:

```sh
npm test
```

To add another game, add a playable card to the collection in `index.html`, give it its own hash (for example `#snake`), and extend the hash routing in `app.js` to open that game's screen. Keep its rules in a separate module and stop its updates when returning to the selection screen.

These are independent JavaScript recreations of classic game ideas. They use no ROM, original game code, or downloaded game assets.
