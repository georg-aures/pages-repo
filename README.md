# Georg's Arcade

A static JavaScript arcade for GitHub Pages. The homepage offers four games: classic-style Pac-Man, Dino Run with Auto mode, the German-language magical exploration game Wurm & Wunder, and Borough Rush, a city driving arcade with six vehicle roles.

## Play

Open **https://georg-aures.github.io/pages-repo/** and choose **Let's play** for Pac-Man or **Let's run** for Dino Run. Browser Back, Escape, or **All games** returns to the collection. Choose **Let's drive** for Borough Rush. Switching games stops the previous game's simulation. The real-time games pause when the browser loses focus.

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
- **Auto:** the Auto button beside Pause starts a perfect automatic run. It plans jumps over each cactus or cluster and ducks under low birds. Click it again to return to manual control without resetting the score. Jump/Duck inputs are disabled while Auto drives. Pause still works, and restarting keeps Auto enabled; returning to the collection starts the next visit in manual mode. Enabling Auto after game over starts a fresh automatic run.
- **Restart:** the circular arrow, R, or Enter while the desert has focus. After a collision, choose **Run again** or jump to try again immediately.

Jump over single cacti and clusters. Birds appear after fifteen seconds; duck under low birds or stay on the ground beneath high birds. Score increases with distance and speed rises gradually to a cap. On smaller screens, the maximum speed preserves visible reaction time. A collision ends the current run.

Pac-Man and Dino Run store separate personal bests in the current browser. Sound is shared across the arcade, starts muted, and can be enabled with the music-note button. All four games also run when browser storage is unavailable. There is no server or public leaderboard.

### Wurm & Wunder

Direct link: **https://georg-aures.github.io/pages-repo/#wurm**.

A cozy, turn-based digging adventure with original vector artwork. The world extends indefinitely sideways and down, generated deterministically from its saved seed. Camera movement, sparkles, and drifting light are visual only; the world waits for the player's next turn.

- **Dig:** arrows or WASD, direction buttons, or tap a directly adjacent cell. All four directions work; dug tunnels remain open. The worm's body is decorative and does not block backtracking.
- **Hearts:** each heart creates one persistent flower, crystal, group of fireflies, vine, or starflower. Hearts awaken the world rather than acting as a life meter.
- **Collection:** T or the Schatzkammer button displays gems, necklaces, chests, princess shoes, and three special relics. Chests award gems and an additional piece of jewelry or a shoe. Collected cells cannot be looted twice.
- **Depth:** the first 18 rows are peaceful. From 18 m, key chambers and movable rocks appear. Ordinary gates consume a flower key; the moon medallion, star gem, and rose shoe open matching special chambers without being consumed. Every chamber has its key or matching relic two cells above the entrance, with a safe approach.
- **Gentle hazards:** from 52 m, spores and crumbling ground appear; deeper down, cave creatures and falling stones join them. Warning rings and marks show upcoming danger. All hazards advance only after a successful move or an intentional Wait. A mishap returns the worm to the last flower-lamp sanctuary and preserves the collection.
- **Wait:** Space or the clock button advances one turn without moving.
- **Undo:** U, Backspace, or the curved arrow restores the previous turn, including inventory, gates, pushed rocks, and heart magic. Up to twelve steps are available in the current session.
- **Home:** the house button returns to the peaceful meadow while retaining the explored world and all treasures.
- **Help:** H or the question-mark button explains the rules. Escape closes an open dialog, or returns to the arcade when no dialog is open.
- **Save:** exploration, inventory, opened gates, moved rocks, checkpoints, and world magic are saved automatically under `georg-arcade-worm-v1`. Reopening the game resumes the same world. If browser storage is blocked or full, a visible note explains that the current world remains in the open tab. New World requires confirmation before replacing the existing adventure.

All Wurm & Wunder interface text is German. The renderer uses the same original worm, treasure, flower, and mushroom artwork in the game, collection, and arcade card. It respects reduced-motion preferences and needs no downloaded image assets.

### Borough Rush

Direct link: **https://georg-aures.github.io/pages-repo/#borough**.

A nonviolent, overhead driving arcade with original Canvas artwork, a fixed handcrafted street plan, changing jobs and traffic, and English text. Crown Island, West Docks and the East Boroughs are connected by six bridges. Crown Park, three narrow alleys, three diagonal routes (Broadway, Queens Boulevard and Ironworks Road), and streets from narrow lanes to four-lane avenues make route knowledge useful. Smaller building plots, courts, gardens, parking and container yards distinguish the districts. The other games retain their own rules and saves.

Choose any of six vehicles, then **On duty** or **Free Drive**. Each role has a briefing and its own acceleration, speed and turning radius:

- **The Getaway:** drive a sporty convertible. Break police line of sight and stay hidden from their coordinated search for fifteen seconds. Police share sightings, investigate the last known location and can reacquire you; a pursuit lasts at least 25 seconds. Being held stopped near police for four seconds ends the pursuit.
- **Hot Pursuit:** drive an American police cruiser. Press E to switch on the siren, then stay within the red pursuit ring for six seconds. The robber yields and slows to a stop; brake nearby for two seconds to complete the arrest. Boxing the car in also works. Escape to its marked exit ends the pursuit. Siren pressure decays gradually when you fall behind.
- **First Response:** drive a fire engine. Park at the marked hydrant and press E to connect. Aim with the mouse and hold its button to extinguish five hotspots, or drag over them on a touchscreen. Moving disconnects the hose. Three incidents make a shift; a timed-out incident is handed to another crew and counts as a failure.
- **Clean Sweep:** drive an orange garbage truck. Align with the arrow inside the bay, stop and press E. Stay still for five seconds while two workers collect three bins. The whole round has 58 persistent collection points and 174 bins. Collect them in any order. The map shows every remaining point: click/tap a square or use the selector to set your next waypoint. Any nearby uncollected bay can be serviced even if it is not your selected waypoint. Clearing the map completes the round. The eight-minute bonus clock can expire without ending the route; you can also finish early through Pause.
- **On the Line:** drive a city bus through ten stops on a clockwise line. Every stop is on the right curb in its direction of travel, with room before the next turn. Align, stop and press E to open the doors. Boarding takes four seconds; early arrivals wait for their scheduled departure. Arrival time determines the punctuality bonus.
- **Fare Game:** drive a yellow taxi. Stop and press E to collect a customer, then repeat at the marked destination. Customers provide comic commentary; fast, clean deliveries earn tips.

Bus, garbage and taxi jobs award a smaller bonus when late and continue. Taxi and fire shifts last up to six minutes; the bus line allows eight minutes. Garbage collection continues until the map is clean or you finish through Pause. Pursuits have clear win/loss results. All vehicle contact is forgiving, with lost momentum and a small score deduction rather than damage or injury. Pedestrians stay on sidewalks and do not participate in collisions. Traffic spawns with clear spacing, holds separate lanes through intersections, observes signals and following distances, reserves junctions and checks exit space. Queues wait behind turning paths; stopped drivers can choose a different onward street. Offscreen traffic is redistributed without visible respawns.

- **Drive:** W accelerates, S brakes then reverses, A/D steer relative to the vehicle. Arrow keys also work. Space is the handbrake.
- **Action:** E performs the current job action or switches the police siren.
- **Map:** M or the Map button pauses and opens the street atlas. The minimap, route line and edge arrow provide navigation while driving. Routes start and end at the actual positions on street segments, so a goal ahead on the same road does not first send you backwards to an intersection.
- **Pause/help:** P, Escape, Pause or ?. Leaving the tab pauses the game and clears held controls.
- **Roadside assist:** R or the Pause menu returns the car to its last good road position for 50 points.
- **Touch:** hold steering and gas/brake buttons together; tap Action when stopped. Touch cancellation releases the relevant control. For firefighting, connect first, then drag on the flames.
- **Free Drive:** no clock or missions. Switch among all six vehicles in the Pause menu. Vehicle switching stops the car without changing its location.
- **Results/save:** each role has a score, medal and personal best stored under `georg-arcade-borough-v1`. Blocked or full storage does not prevent play. In-progress shifts are not saved.

`borough-city.js` owns the fixed map and connected routing graph; `borough-engine.js` owns driving, traffic and missions without DOM dependencies; `borough-renderer.js` draws original city and vehicle artwork with a bounded chunk cache; `borough.js` and `borough.css` provide the isolated responsive interface. No assets, framework, server or build step are required.

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
- Auto uses the jump's ballistic trajectory, centered on each cactus's predicted crossing. It resolves the dinosaur's position after each obstacle movement, including during a mid-run takeover. Regular collision checks remain enabled in Auto mode.
- `dino.js` — original pixel-art renderer and Dino Run controls, HUD, overlays, and storage.
- `worm-engine.js` — deterministic terrain, rooms, treasure, heart magic, turn-based hazards, undo, and saved-world rules.
- `worm-icons.js` and `worm-renderer.js` — original shared vector artwork, depth palettes, connected tunnels, camera, and decorative effects.
- `worm.js` and `worm.css` — German interface, keyboard/touch controls, collection and help dialogs, persistence, and responsive magical presentation.
- `tests/borough.test.js` — street connectivity, all six roles, service timing and interruption, chase outcomes, fire targeting, traffic, collisions, pause and Free Drive.
- `app.js` — Pac-Man renderer and controls, game routing, shared animation loop, and sound.
- `tests/engine.test.js`, `tests/dino.test.js`, `tests/dino-auto.test.js`, and `tests/worm.test.js` — game-rule regression tests, including long automatic runs, manual/automatic handovers, saved worlds, and solvable treasure chambers.

Run the tests with Node.js 18 or later:

```sh
npm test
```

To add another game, add a playable card to the collection in `index.html`, give it its own hash (for example `#snake`), and extend the hash routing in `app.js` to open that game's screen. Keep its rules in a separate module and stop its updates when returning to the selection screen.

These are independent JavaScript recreations of classic game ideas. They use no ROM, original game code, or downloaded game assets.
