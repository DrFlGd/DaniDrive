# DaniDrive — Midnight Run

**A browser-based, zero-dependency highway racing game and a foundation for experimenting with game design, traffic generation, pathfinding, and interactive learning.**

DaniDrive currently contains **Midnight Run**, a self-contained single-file arcade game. Race 5 km along a five-lane highway, weave around slower vehicles, adjust traffic density in real time, and try to reach the finish before running out of armor.

**[Play the source locally](index.html)** · **[View the game code](index.html)**

> **Project status (October 2026):** Playable prototype, iteration 2. The source is available and offline-capable. The route-checking generator has a bounded-horizon safety check, not a formal proof of a collision-free run for every player action.

## Quick start

1. Download **[index.html](index.html)** (or clone/download this repository).
2. Double-click **index.html** to open it in a current desktop browser.
3. Set **Traffic Density** to **Calm** or **Light**, then select **Start Engine** (or press Enter).
4. Use the arrow keys to navigate to the finish.

No installation, build command, package manager, account, server, internet connection, external font, image, library, or CDN is required. The game uses built-in **HTML**, **CSS**, **Canvas 2D**, **JavaScript**, **Web Audio API**, and **localStorage** features. Browser access to local storage and audio can vary with browser settings; the game is designed to continue if those optional capabilities are unavailable.

You can optionally publish this page using GitHub Pages because the entry point is named **index.html**. GitHub Pages hosting is **not configured by this repository's code alone**: enable deployment in the repository settings if desired.

## Controls

| Input | Effect |
| --- | --- |
| Left / Right arrows | Shift between the five highway lanes |
| Up arrow | Accelerate, up to 265 km/h in the arcade simulation |
| Down arrow | Brake, down to 70 km/h |
| Enter / Space | Start or restart; Enter also resumes a paused game |
| P | Pause or unpause |
| M | Toggle sound |
| Traffic Density slider | Change the frequency and size of future traffic waves while playing |
| Touch buttons | On smaller screens, provide steering, acceleration, and braking |

**Objective:** Complete **5.00 km** before losing all **3 armor points**. Passing vehicles awards points; a near miss can award extra points. A completed run receives a finish bonus. The HUD displays speed, distance, progress, elapsed time, overtakes, armor, score, and route advice.

**Density presets:** Calm, Light (default), Normal, Busy, Rush Hour. Density changes affect **new** traffic; cars already on the road are not abruptly deleted. The choice and personal-best score are saved locally when the browser permits it.

## Progress so far

### Milestone 1 — Single-file driving prototype

The original version established the fundamental game loop and a complete play session:

- Created a 2D Canvas racing scene with an illustrated sky, mountains, city, road markings, and traffic.
- Implemented five lanes with arrow-key steering, acceleration, and braking.
- Added AI traffic vehicles with different appearances and relative speeds.
- Added pass detection, near-miss scoring, collision penalties, temporary invulnerability, three-hit armor, and a 5 km finish condition.
- Added game start, pause, win, loss, restart, HUD, effects, synthesized sounds, and local best-score persistence.
- Kept all styling, rendering, state management, and logic in one HTML file for direct offline use.

**Feedback from initial play:** The road appeared to rise into the sky because its perspective convergence felt too high. Random traffic could also produce excessively crowded lane patterns, leaving too little maneuvering room.

### Milestone 2 — Perspective, density, and route-aware generation (current version)

The second iteration addressed both usability concerns.

**1. Adjusted perspective.** The horizon is now anchored to a land-level vanishing point using **HORIZON_Y = 267** on a 1100 × 680 logical canvas. Road width and vertical coordinates grow nonlinearly with normalized depth, making the far road narrow and the foreground broad.

**2. Player-controlled traffic density.** Five slider levels regulate spawn intervals and the chance that a new wave contains two or three cars. The default is Light; changing the slider takes effect during a run and the setting persists when available.

**3. Route-aware traffic insertion.** Before adding a candidate car, the game simulates future lane occupancy and checks whether at least one sequence of feasible lane changes remains for **two assumed player speeds**. The generator rejects candidate cars that make the checked horizon unsolvable.

**4. Gentle opening and driving hints.** Initial cars are staggered, and the interface periodically advises the player to move left or right when a planned safe route requires it.

**5. Small-screen support.** Responsive CSS and pointer-based touch buttons allow basic operation outside desktop keyboard play.

**Validation history:** Earlier development used simulated full-distance runs at several densities with a driver following a route planner. Those are *development smoke tests*, not a checked-in automated test suite or a guarantee across all seeds, frame rates, browser versions, reaction times, or control choices.

### Current status: implemented vs. still open

| Area | Implemented | Not yet implemented / known limitation |
| --- | --- | --- |
| Offline delivery | Everything in one HTML file | No packaging/release automation |
| Rendering | Stylized pseudo-perspective 2D Canvas scene | Not physical 3D; narrow layouts can stretch the canvas |
| Driving | Discrete lanes, adjustable speed, keyboard and touch | No controller support; simplified arcade handling |
| Traffic | Procedural vehicles, 5 density settings | No lane-changing AI traffic or distinct driver personalities |
| Safety check | Time-expanded route search used to gate new cars | No complete mathematical guarantee across arbitrary player actions and speeds |
| Guidance | Periodic left/right/clear-route advice | Not an autopilot; does not account for actual human reaction time |
| Progression | 5 km event, scoring, 3 armor points, best score | No tracks, campaigns, achievements, or difficulty personalization |
| Learning | Gameplay exposes concepts such as geometry and planning | No dedicated lessons, replay, diagrams, or quizzes |
| Verification | Manual and past simulated runs | No continuous integration or repeatable test harness |

## Repository layout

~~~text
DaniDrive/
├── index.html     # Entire playable game: markup, styles, rendering and logic
└── README.md      # Project history, usage, architecture and roadmap
~~~

The code intentionally remains **dependency-free and in one file**. If the project later grows, separate development modules may be useful, but preserving an exportable single-file offline build is an important product constraint.

## How the game works

### 1. HTML and CSS: interface and layout

The top-level HTML contains the game canvas, an overlay for menus and results, a heads-up display (HUD), traffic-density slider, sound button, and small-screen touch buttons. The CSS provides styling, responsive layout, transitions, and HUD positioning.

The canvas uses a fixed **1100 × 680** internal drawing resolution. CSS scales it to the available space. The UI is an overlay of normal HTML elements rather than text drawn into the canvas, making the score, speed, and buttons easier to style and interact with.

**Important IDs** include **game**, **trafficDensity**, **densityValue**, **speed**, **distance**, **score**, **progress**, **routeHint**, and **overlay**. The script collects these references in the **ui** object.

### 2. State: the single source of truth

The **state** object records the active mode (**ready**, **playing**, **paused**, **won**, **lost**), speed, distance, score, elapsed time, current lane, interpolated visual lane, traffic objects, particles, cooldowns, and timers.

This makes the game loop predictable:

1. Process player input and advance state.
2. Potentially generate new traffic.
3. Evaluate collisions, overtakes, and win/loss conditions.
4. Refresh visible HUD values.
5. Draw the entire scene.

A separate **keys** dictionary stores currently held arrow keys.

### 3. Perspective: road depth without a 3D engine

Traffic position uses a **normalized z coordinate** rather than meters: distant objects start near **z = 0**, cars move toward the player's row around **PLAYER_Z = 0.765**, and are removed after exiting the foreground.

The key coordinate functions are:

~~~js
const roadY = z => HORIZON_Y + Math.pow(Math.max(0,z),1.43)*507;
const roadHalf = z => 9 + Math.pow(Math.max(0,z),1.08)*600;
const laneX = (lane,z) =>
  W/2 + ((lane+.5)/LANES*2-1)*roadHalf(z);
~~~

- **roadY(z)** converts apparent distance into vertical screen position. At the horizon the road converges toward **HORIZON_Y**; it expands more quickly near the viewer.
- **roadHalf(z)** controls the visible half-width of the road at depth **z**.
- **laneX(lane,z)** places a car in the center of a lane, given **LANES = 5** and a zero-based lane index.
- **edgeX(side,z)** locates either outer edge of the roadway.
- **carW(z)** and **carH(z)** scale drawn vehicle dimensions with depth.

This is **pseudo-perspective**, not a perspective camera with physical world coordinates. The visible roadway and traffic motion are tuned for readability and game feel.

### 4. Traffic: controlled randomness plus reachability

Each traffic car has a lane, depth, speed, color, vehicle style, and event flags. New vehicles are produced with **makeTrafficCar(lane,z)**, and **spawnTraffic()** proposes one or more random vehicles based on the selected density.

The main safety layer is **findSafeRoute(vehicles, assumedSpeed)**.

**Idea:** Treat traffic planning as a *time-expanded graph*. Each search node describes a future lane and a lane-change lock state. At each **0.15-second** planning step, the player may:

- Stay in the current lane.
- Start one lane change to the left.
- Start one lane change to the right.

A lane change occupies approximately **two planning steps (0.30 seconds)**. During the transition, the route checker requires **both** the departing and destination lanes to remain clear. For each vehicle, the planner predicts the approximate future depth based on relative vehicle speeds. A time/lane cell is blocked when a predicted vehicle falls near the player row, including extra clearance.

The checker advances through **48 steps × 0.15 seconds = 7.2 seconds**. It stores feasible states, favors solutions requiring fewer lane changes, and returns a lane-by-lane path if one survives to the end of the planning window. If every path becomes blocked, it returns **null**.

**trafficIsSolvable(cars)** runs the search at both a cruising-oriented assumed speed (**at least 170 km/h**) and a full-throttle assumed speed (**265 km/h**). **safeInsert(car)** first rejects cars placed too close to an existing car in the same lane, then rejects candidate configurations for which either planner call fails. Only accepted cars enter **state.traffic**.

~~~text
Propose a new traffic car
            |
            v
Is it too close to another car in its lane? -- yes --> Reject
            |
            no
            v
Can a route survive the 7.2 s horizon at cruise speed? -- no --> Reject
            |
            yes
            v
Can a route survive the 7.2 s horizon at 265 km/h? -- no --> Reject
            |
            yes
            v
        Accept car
~~~

The **routeHint** HUD uses the same planner (recomputed about every **0.32 seconds**) to display guidance such as “MOVE LEFT,” “MOVE RIGHT,” or “CLEAR ROUTE AHEAD.” If the local planner cannot find a route, the player is advised to brake and find an opening.

#### What “solvable traffic” does and does not mean

**Implemented claim:** Every *newly accepted* traffic car passed the finite-horizon route checks at the moment of insertion, under the planner's simplified movement assumptions.

**Not a proven guarantee:** A player can still collide after ignoring guidance, changing speed unexpectedly, reacting too late, steering while a vehicle is alongside, or encountering errors from discretized timing and approximation. Traffic continues moving after insertion and the route planner only reasons over a limited horizon. The planner's lane-change timing, blocked-zone approximation, and collision geometry are related but not identical; they should eventually be tested against one shared movement/collision model.

A strong future improvement is to run **seeded end-to-end reachability verification** using the exact update/collision model, rather than describing every random race as formally guaranteed winnable. See the roadmap.

### 5. Motion, rewards, and collisions

**update(dt)** drives the game simulation each frame:

- Holding **Up** increases speed; holding **Down** brakes. Without input, speed drifts toward an arcade cruise value.
- Speed is clamped between **70 and 265 km/h**.
- Distance advances according to the familiar unit conversion: **distance in km += speed in km/h × seconds / 3600**.
- A steering cooldown prevents instantaneous repeated lane jumps; **visualLane** interpolates toward the selected logical lane.
- Traffic advances in depth using a relative-speed approximation.
- Passing a traffic vehicle adds an overtake and a score reward.
- When a car overlaps the player's approximate collision zone, a hit costs one armor point, reduces speed and score, and briefly grants invulnerability.
- Reaching 5 km invokes **finish(true)**. Losing all armor invokes **finish(false)**.

The score encourages overtaking and speed, with added rewards for near misses and completing the course. This is arcade scoring, **not a model of safe real-world road behavior**.

## Key JavaScript functions

All functions listed below are defined in the embedded **script** in [index.html](index.html).

| Function / symbol | Responsibility | Why it matters |
| --- | --- | --- |
| **state** | Holds active gameplay data and timers | Centralizes simulation state |
| **rand**, **clamp**, **lerp**, **ease** | Math helpers | Randomization, bounds, smooth visuals |
| **roadY**, **roadHalf**, **laneX**, **edgeX** | Project lane coordinates into screen space | Create the perspective illusion |
| **background(t)** | Draw sky, stars, mountains, city and atmospheric layers | Establish visual depth and mood |
| **roadway(t)** | Draw road surface, lane markers, roadside items and forward motion | Makes movement and lane positions visible |
| **roundPath**, **polygon**, **line**, **colorMix** | Reusable Canvas drawing helpers | Reduce duplicate drawing operations |
| **drawCar(...)** | Draw a sedan, SUV or truck at a projected size | Vehicle appearance and player feedback |
| **makeTrafficCar(lane,z)** | Create traffic-car data with speed, color and style | Input to procedural generation |
| **findSafeRoute(vehicles,assumedSpeed)** | Explore safe lane/time combinations | Core finite-horizon pathfinding algorithm |
| **trafficIsSolvable(cars)** | Evaluate route existence at two speed assumptions | Checks candidate traffic formations |
| **safeInsert(car)** | Reject overlapping or route-blocking candidates | Traffic admission gate |
| **spawnTraffic()** | Build traffic waves according to density | Controls traffic challenge |
| **resetRun()** | Restore new-run state and create staggered opening cars | Prevents bad restarts and immediate jams |
| **start()** and **pause()** | Transition among menu, active and paused states | Game flow |
| **update(dt)** | Simulate speed, steering, traffic, score and collision events | Core gameplay logic |
| **updateHUD()** | Synchronize DOM readouts with state | Makes feedback visible |
| **render()** | Clear canvas and draw scenery, cars, particles and visual effects | Main rendering pass |
| **frame(ts)** | Calculate capped frame delta and request the next frame | Runs the animation loop |
| **initSound()** and **soundTick()** | Set up Web Audio and update engine pitch/volume | Dependency-free sound synthesis |
| **beep(...)** | Generate short feedback sound effects | Overtakes, collisions and finish audio |
| **emitSparks(...)**, **particles(...)**, **advanceParticles(dt)** | Create, display and advance collision particles | Hit feedback |
| **showToast(text)** | Show a temporary gameplay message | Communicates near misses and collisions |
| **finish(won)** | Apply outcome, bonus, local best-score update and results overlay | Completes the gameplay cycle |

### The animation loop in context

~~~js
function frame(ts) {
  if (!state.last) state.last = ts;
  let dt = Math.min(.05, Math.max(0, (ts-state.last)/1000));
  state.last = ts;
  update(dt);
  advanceParticles(dt);
  render();
  requestAnimationFrame(frame);
}
~~~

**requestAnimationFrame** schedules drawing at the browser's refresh cadence. **dt** is measured in seconds and capped at **0.05** to reduce giant simulation jumps after a stalled or backgrounded frame. This is a pragmatic arcade loop, not a fixed-timestep deterministic physics engine.

### Input and audio details

- Keydown/keyup listeners modify the **keys** dictionary; arrows are prevented from scrolling the page during gameplay.
- Keyboard controls are ignored when the traffic slider has focus, allowing arrow-key adjustment of the slider.
- The window **blur** handler releases held keys and pauses an active race.
- Touch buttons use pointer events to press and release the same logical inputs.
- **initSound()** creates an oscillator and low-pass filtered engine note with the Web Audio API after a user interaction.
- **soundTick()** changes engine frequency with player speed and fades engine volume while paused or muted.
- **beep(...)** synthesizes short collision, overtake and result tones. No audio files are loaded.

## Changing the game

Because everything is in **index.html**, developers can search for a named constant or function and edit it directly.

| To change… | Start here |
| --- | --- |
| Race length | **FINISH_KM** |
| Number of lanes | **LANES** (also review spawn lane enumeration and road drawing loops) |
| Road horizon | **HORIZON_Y**, then adjust **roadY** and **roadHalf** |
| Player depth on screen | **PLAYER_Z** (review collision and visual sizing together) |
| Density labels and spawn intervals | **DENSITY_NAMES**, **SPAWN_WINDOWS**, **spawnTraffic** |
| Planner horizon | **PLAN_DT**, **PLAN_STEPS**, **LANE_CHANGE_STEPS** |
| Lane switching and throttle | **update** |
| Traffic speed distribution | **makeTrafficCar** |
| Planner safety margins | The **clear(...)** helper inside **findSafeRoute** |
| Car size and appearance | **carW**, **carH**, **drawCar** |
| Color palette and interface | Top-level CSS and **palette** |
| Audio behavior | **initSound**, **soundTick**, **beep** |

**Development rule:** When changing vehicle speed, player lane-change cadence, spawn rates, collision widths, or planner clearance, review them **together**. Updating one without the others can invalidate the model used by traffic insertion.

**Persistence:** The game stores the best score under **midnight-run-best** and density under **midnight-run-density** in localStorage. These keys are local to the browser/origin; opening the file from a different location or using private browsing may change persistence behavior.

## Roadmap: more engaging and more educational

Ideas below are **proposals**, not shipped features. Priority is based on player impact and technical dependencies rather than promised release dates.

### Phase 1 — Trustworthy, accessible gameplay (P0)

- [ ] **Deterministic seeded traffic runs.** Add a seedable random generator, record seeds and replay failures exactly.
- [ ] **Executable route validation.** Simulate the same steering, speed and collision rules used during gameplay; build a regression suite for each density, including extreme traffic combinations.
- [ ] **Unify planner and collision geometry.** Share lane-change timing, vehicle extents and occupancy checks; add reaction-time margins and validate each accepted insertion against the exact simulator.
- [ ] **Difficulty calibration.** Expose safe-gap, traffic speed and number of simultaneous obstacles as separate settings; retain Calm as a genuinely forgiving mode.
- [ ] **Clearer guidance.** Show the intended lane earlier, explain when the route is blocked, and allow hints to be switched off.
- [ ] **Accessibility improvements.** Avoid stretched mobile perspective; add high-contrast options, keyboard focus states and reduced-motion treatment for game effects.

**Definition of done:** A repeatable test harness demonstrates success for representative seeds under a specified player policy, documented physics assumptions, and frame-rate variation. Avoid advertising a formal guarantee until verified.

### Phase 2 — Replay value and game feel (P1)

- [ ] **Game modes:** time trial, endless survival, overtaking challenge, and a relaxed exploration mode.
- [ ] **Progression:** medals, personal-best comparisons, achievements, missions and unlockable visual car styles.
- [ ] **Traffic personalities:** trucks with slower acceleration, cautious drivers and vehicles that change lanes with visible signals.
- [ ] **Environment variety:** day/night cycle, tunnels, rain or fog, changing scenery and new road themes.
- [ ] **Better feedback:** directional indicators, speed effects, spatialized audio and improved collision animations.
- [ ] **More input options:** configurable keys, gamepad support and refined touch controls.

**Design constraint:** Enhanced traffic behavior must remain fair, telegraphed and compatible with the route feasibility checker.

### Phase 3 — Learning modes (P1–P2)

The game could become an approachable sandbox for introductory math and computer science. An optional **Learning Mode** should pause/slow the simulation, visualize what the algorithms know, and let players run controlled experiments.

| Learning topic | Potential interactive feature | Example learning outcome |
| --- | --- | --- |
| **Kinematics & units** | Live speed, distance, elapsed-time plots; convert km/h to m/s | Use distance = speed × time with correct units |
| **Reaction time & safety** | Compare obstacle gaps at different speeds and decision delays | Understand how limited time reduces feasible choices |
| **Graph search / dynamic programming** | Visualize a lane-vs-time grid, blocked cells and explored routes | Explain why a path exists or fails |
| **Algorithms & constraints** | Toggle admission rules to compare naïve random spawning vs. route-checked spawning | Learn how constraints make procedural content fairer |
| **Probability & simulation** | Change traffic density, run repeatable seeded trials and graph outcomes | Understand variation, distributions and controlled experiments |
| **Coordinate geometry** | Show z-depth and its mapping to screen x/y coordinates | Explore perspective transforms and nonlinear scaling |
| **Optimization** | Compare safest route, fewest lane changes, and fastest path | Discuss objective functions and trade-offs |
| **Debugging** | Step through one simulation tick with labeled state changes | Learn update loops and reproducible debugging |

**Educational guardrail:** This is a stylized arcade racer; its overtaking and collision models are not accurate driving instruction. If safety is taught, distinguish simulated behavior from real-world road rules and emphasize safe following distance, anticipation and avoiding risky weaving.

### Phase 4 — Community, quality and optional platform features (P2)

- [ ] **Code organization:** keep a dependency-free downloadable build while optionally extracting developer-facing modules.
- [ ] **Tests and CI:** static checks, deterministic browser simulation tests, smoke tests at each density and screenshot regression checks.
- [ ] **Performance:** frame-time monitoring, particle pooling and profiling for slower devices.
- [ ] **Documentation:** architecture diagrams, tuning guide, developer contribution instructions, changelog and sample reproducible seeds.
- [ ] **Shareable replays:** export/import a compact local JSON replay containing seed, control inputs and outcome.
- [ ] **Optional hosted features:** leaderboards, challenges, shared course seeds and user-created tracks. These would require explicit network services and should never be prerequisites for offline play.
- [ ] **Optional curriculum:** short challenges, classroom worksheets, reflection prompts and explanations of planner decisions.

## Proposed development order

1. **First:** reliability, deterministic tests and accurate player-facing guarantees.
2. **Next:** more approachable difficulty presets, clearer route previews, better onboarding and accessibility.
3. **Then:** compelling short-session objectives, traffic personalities and varied road conditions.
4. **After that:** the graph-search visualizer and unit-conversion/kinematics learning modules.
5. **Finally:** user-created content, optional online sharing and a broader set of reusable teaching activities.

## Testing and contribution checklist

For any gameplay change, manually verify at minimum:

- [ ] A local **file://** open starts and plays without requesting internet resources.
- [ ] Enter, all four arrows, P, and M work as intended.
- [ ] Calm, Light, Normal, Busy and Rush Hour all spawn traffic.
- [ ] Changing density mid-run affects new traffic without abruptly removing existing cars.
- [ ] An untouched start, repeated restart, pause/unpause and window blur behave predictably.
- [ ] Both loss (three hits) and win (5 km) display the correct result.
- [ ] Collision and route hints remain consistent at both slow and fast speeds.
- [ ] The best score and density persist where localStorage is available.
- [ ] The game remains legible on smaller screens.
- [ ] There are no uncaught errors in the browser console.

For planner changes, additionally capture the traffic seed, elapsed time, lane sequence, speed profile, failed candidate, and collision/clearance calculations. A useful automated goal is to search many seeds for a counterexample before declaring a generation rule safe.

Contributions and issue reports should include the browser version, game density, any changed settings, what happened, what was expected, and reproducible steps or a seed (once seeded replay is implemented).

## Project philosophy

1. **Open and portable:** one HTML page that is easy to inspect, modify, copy and run offline.
2. **Challenging but explainable:** difficulty should come from decisions, not impossible random traffic.
3. **Play first, learn optionally:** educational overlays should enhance—not interrupt—an enjoyable game.
4. **Honest engineering:** document planner assumptions and evidence, and distinguish tests from guarantees.
5. **Accessible iteration:** keep good defaults, keyboard play and clear feedback as the game evolves.

---

**Current playable implementation:** [index.html](index.html). **Maintained roadmap and technical notes:** this README.

*DaniDrive / Midnight Run is an experimental arcade simulation, not a road-driving or driver-training tool.*
