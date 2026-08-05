# Hear No Evil: Assignment 2 - Group Number: Group 2B

## Description

Hear No Evil is a top down survival horror puzzle game that explores themes of spatial psychological claustrophobia and vulnerability through the lens of a protagonist with a profound hearing impairment [2]. The player is then dropped into a dark, abandoned mansion layout and tasked with locating a hidden key that emits a soft visual glow, so they can open a locked door and escape, although, because the character is hard of hearing, enemies sneaking up from behind are completely silent and invisible until the player manually spins around to catch them directly in their field of vision. This design relies on a highly restrictive, mouse driven flashlight vision cone where anything outside the active sight beam is entirely blacked out. This mechanics driven configuration forces players to balance environmental exploration against an escalating, tactile feedback loop where survival depends entirely on your reaction speed [2].

## Design Rationale

Our prototype relies on an interactive loop tying action, feedback, player decisions, and progression together without heavy instruction menus. Players navigate corridors using keyboard inputs while directing a restricted, mouse driven visibility field across the canvas. Immediate visual and haptic feedback triggers when entities approach, forcing real-time tactical changes as players pivot their view cone to freeze stalking targets. Successful execution drives level progression, allowing users to secure the key and clear the stage. We integrated sensory limits directly into our core gameplay loop instead of treating them as a narrative dressing. Matching Sweetser and Wyeth's GameFlow principles, we mapped the character's profound hearing loss directly to challenge scaling and learning mechanisms [2]. By substituting traditional auditory cues with a physical ground-vibration warning, our screenshake scripts simulate feeling heavy thuds through floorboards when an unseen enemy draws near. This mechanic demands fast player evaluation: turn around immediately to trigger the entity freeze constraint, or check the spatial overlay to avoid dead ends. Additionally, we carefully applied Gaver's technology affordance framework to guide players through environmental mechanics naturally [1]. The soft visual glow of the hidden key establishes a perceptible affordance that draws player intent, while changing the exit door from red to green instinctively signals completion [1]. Based on our TA Jieun Lee's framework for observation, our feedback elements include a bounded cursor tracking bubble and a brief post death red predator silhouette outline, ensuring players quickly adapt their positioning strategy after a failure [3].

## Levels

The escape now runs across three stages, and clearing one only moves you further out rather than ending the run: out of the house, through the grounds, and finally onto the road.

Level 1 — The Mansion. The interior, laid out in `data/blocks.json`, follows the hand-annotated floor plan our group drew over a reference screenshot. Seven rooms sit in three bands. West: the player starts in the tall north-west room, with the West Library directly below it. Centre: the North Sitting Room runs along the top, the Central Grand Foyer and its rug sit in the middle, and the South Dining Hall fills the bottom. East: a small exit vestibule holds the locked door on the east wall, and the Key Hall runs beneath it.

The plan is deliberately loop-free rather than a corridor maze. Every room is a room, and each one is entered through a two-tile doorway: the start room opens east into the Foyer and south into the Library; the Foyer is the hub, reaching the Sitting Room to the north, the Dining Hall to the south and the vestibule to the east; the Library and Key Hall both hang off the Dining Hall. Because the vestibule is reachable only from the Foyer and the Key Hall only from the Dining Hall, the key and the door are always at opposite ends of the house — you cannot stumble into the exit on the way to the key.

Furniture is placed to say what each room is, not to fill space: shelving lines the Library's north and west walls with a reading desk and chairs set off them, a long dining table runs five tiles down the Dining Hall with chairs alternating on both sides and one at the head, couches sit against the Sitting Room walls around a low table, a dresser and wardrobe furnish the start room, and cabinets line the Key Hall's east wall. Every solid piece is either flush against a wall or a clear two tiles off it, because the player's 50px body cannot fit through a one-tile gap — a validator checks this and fails on any floor tile the player could never stand inside.

Its walls are auto-tiled. The map only marks `@` for "wall here", and the renderer works out from the four neighbours whether that tile should be a straight run, a corner, a T-junction or a four-way cross, then rotates the right piece into place. This means junctions always line up, and the layout can be edited by typing `@` into `tiles[]` without anyone having to track which orientation goes where. The exit is drawn as two door leaves. The leaf art is upright — planks vertical, knob on its right edge — but every doorway in the game is a tall gap in a side wall, so each leaf is laid on its side: the upper one turned a quarter clockwise, the lower one that same rotation mirrored. Both knobs end up on the inner edges, meeting on the join in the middle of the opening.
Level 2 — The Courtyard. Stepping through the mansion's unlocked door fades you into an overgrown walled garden laid out in `data/courtyard.json`. Mossy cobblestone replaces the floorboards, and instead of the mansion's straight corridors the space is broken up by an asymmetric run of clipped hedges: a walk-in alcove in the north-west, a parterre stepping down toward the centre, a broken ring around the stone well, and a serpentine sweep across the south. A reflecting pool sits in the south-west. The vampire, the key, and the flashlight all behave exactly as they do indoors.

The courtyard adds one mechanic of its own: puddles. Standing water is scattered across the paving, and stepping into one puts the player on the floor. The screen blows out white, a tinnitus ring starts up, and for about a second and a half he has no control and no flashlight. He does not die — he loses his feet, his light and his time, and the vampire keeps walking the whole while. Because nothing can be frozen by a light that is not on, a knockout in the wrong place is what kills you rather than the water itself.

This is what the level is really about. Indoors the only thing worth looking at was behind you; outdoors you also have to watch where you are putting your feet, and the flashlight cone cannot cover both at once. That tension between checking your back and checking your path is the whole design of the stage.

To keep it fair rather than arbitrary, a puddle triggers on the tile under the player's centre rather than anywhere the hitbox touches, so deliberately skirting the edge of one works. The key is also never placed on a puddle or anywhere only reachable by crossing one, so no run is unwinnable.

Level 3 — The Street. Stepping through the courtyard's gate puts you on the road out of town, at night, laid out in `data/street.json`. It runs west to east in bands: treeline, verge, kerb, the carriageway with its broken centre line, kerb, verge, treeline. The treeline is the level boundary, and the gap in it at the eastern end is the way out. The whole palette is darkened and pushed toward blue against the daytime reference we worked from, so the road reads as lit only by the moon.

Three things make it the hardest stage. The vampire is faster here — `vampireSpeed` in the level JSON raises it from 0.7 of the player's speed to 1.05, so for the first time you cannot simply outrun it. The road is open, with none of the corners the mansion's rooms and the courtyard's hedges gave you to break line of sight. And your torch is nearly dead: the level's `flashlight` block marks it as failing, so it sits dark and only catches for a fraction of a second at a time — about a tenth of the time, in bursts of under half a second. Freezing the vampire with the beam, which carried you through the first two levels, is barely available here.

What you get instead is the streetlamps. A lamp casts a pool of light the vampire will not walk into, so standing under one makes you untouchable — it circles the rim instead. But a lamp starts dying the moment you step under it, gutters for the last second or so, and once it is out it stays out. There are seven, alternating between the north and south kerbs, so the safe route zigzags across the carriageway rather than running straight down one verge. They are stepping stones, not a fort: the level is about choosing when to spend one.

Because lamps are simply an `l` in the map and their pool is drawn above the darkness like the exit is, a live lamp is visible from across the level. That visibility is deliberate — you need to see which shelter is still burning before committing to a run for it.

All three levels use the same tile-map format, so `drawRoom()` and `initGame()` are level-agnostic; `LEVELS` in `sketch.js` just points each stage at its own JSON and its own floor/wall/corner images.

**One placeholder.** `assets/images/streetlamp.png` is not a drawing of a lamp — it is a bordered box with the word LAMP in it, so nobody mistakes it for finished art or ships it by accident. Our art subgroup is drawing the real one. The pool of light is drawn by the game rather than baked into the tile, so dropping the real art in at the same filename and size changes nothing but the post itself.

## Setup and Interaction Instructions

## Prerequisites

You will need a modern desktop web browser, specifically Google Chrome, to run the sketch smoothly.
There are no local installations or software dependencies required because the entire client-side framework executes directly through our live GitHub Pages playable link.

## Gameplay Controls

Movement: Press the W, A, S, D keys on your keyboard to guide your character's velocity through the mansion corridors.
Flashlight Orientation: Move your Mouse pointer across the screen canvas to guide the trajectory of your directional lighting beam. The hardware cursor is replaced by stylized yellow tracking dot, so you never lose control alignment.
Objective: Scan the dark rooms to find the glowing key asset while constantly sweeping your flashlight backward to freeze the stalking vampire before it reaches you.

## Iteration Notes

## Post-Playtest (Changes Implemented)

Bounded Yellow Dot Flashlight Cursor: We completely eliminated our original hidden hardware mouse tracking setup because playtesters fumble with inputs and lost track of where they were looking. Replacing it with a custom yellow dot restricted to a fixed tracking track close to the avatar keeps your aiming intuitive without breaking our light mask coordinates.
Minimalist Spatial Mini-Map Overlay: Based on a direct design recommendation from our teaching team, we programmed a basic, non-intrusive onscreen mini-map overlay in the corner of the UI [3]. Since our flashlight cone blacks out the rest of the map, playtesters were constantly getting stuck in blind spots, so this wall outline provides just enough spatial awareness to navigate corners safely [3].
Pacing of Screen-Shake and Calibrated Audio: Our initial playtesting data revealed that our ground-vibration feedback was triggering way too late, leaving players with zero time to react. We re-scripted the threshold intervals so the camera shakes noticeably earlier, and we mixed in muffled footsteps with directional binaural adjustments to make our disability integration feel fair and deeply immersive.

## Post-Showcase (Planned Long-Term Improvements)

Visual Freezing States for Entities: If we continue iterating this system for our final milestone, we plan to implement explicit visual asset changes on our enemies the exact second they enter the light mask, such as specialized freeze animations, to give players clear validation that their look action succeeded.
Dynamic Furniture and Asset Population: To expand our layout complexity and improve level pacing, our art subgroup wants to import detailed 32x32 pixel obstacle arrays like carpets, tables, and chairs. This will introduce physics-based pathfinding barriers to the level instead of letting players sprint straight through empty halls.

## Assets

| File                                                                                                    | Source                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `assets/images/wall_tile.png`                                                                           | Mansion Interior Wall with Trim" original top-down pixel asset custom drawn by our group members.                              |
| `assets/images/floor_tile.png`                                                                          | Spruce Planks Grid Alignment Layout" original wooden matrix asset custom drawn by our group members.                           |
| `assets/images/door_sprite.png`                                                                         | Dynamic Status Gateway Asset" original open/locked state doorway custom drawn by our group members.                            |
| `assets/images/furniture.json`                                                                          | Placement coordinate configuration maps designed entirely by our group members.                                                |
| `assets/sounds/scarymusic.mp3`                                                                          | https://youtu.be/7ifWmw6U2dE?si=sjZFYGp-G1oG_V4K [4]                                                                           |
| `assets/sounds/whisper.mp3`                                                                             | https://www.youtube.com/watch?v=7JOEKMiHJn0 [5]                                                                                |
| `assets/sounds/seen.mp3`                                                                                | Generated by Claude AI                                                                                                         |
| `assets/sounds/gameover.mp3`                                                                            | https://www.youtube.com/watch?v=A9eHuIJ5M3o [6]                                                                                |
| `assets/sounds/footstep1.mp3`                                                                           | https://pixabay.com/sound-effects/film-special-effects-st1-footstep-sfx-323053/ [7]                                            |
| `assets/sounds/footstep2.mp3`                                                                           | https://pixabay.com/sound-effects/film-special-effects-st2-footstep-sfx-323055/ [8]                                            |
| `assets/sounds/breathing.mp3`                                                                           | https://pixabay.com/sound-effects/people-heavy-breathing-sound-effect-type-01-294190/ [9]                                      |
| `assets/images/courtyardfloor.png`, `courtyardmoss.png`, `ivy.png`                                      | Courtyard ground tiles (cobblestone, mossy cobblestone, ivy) — original 32x32 assets drawn by our group.                       |
| `assets/images/courtyardwall.png`, `courtyardcorner.png`                                                | Weathered stone boundary wall and corner — original 32x32 assets drawn by our group.                                           |
| `assets/images/hedge.png`, `flowerbush.png`                                                             | Hedge mass and flowering hedge — original 32x32 assets drawn by our group.                                                     |
| `assets/images/wellquarter.png`                                                                         | One quarter of the central well; the map rotates it four ways to build the 2x2 ring — original 32x32 asset drawn by our group. |
| `assets/images/wallVertical.png`, `wallHorizontal.png`, `wallCorner.png`, `wallTee.png`, `wallPlus.png` | Auto-tiling mansion wall set (straight, corner, T-junction, four-way) — original 32x32 assets drawn by our group.              |
| `assets/images/doorLeaf.png`                                                                            | Single door leaf; the exit draws two of them, the lower one flipped — original 32x32 asset drawn by our group.                 |
| `assets/images/puddle.png`                                                                              | Standing water hazard — original 32x32 asset drawn by our group.                                                               |
| `assets/sounds/ringing.wav`                                                                             | Tinnitus ring for the knockout. Synthesised from scratch by `tools/make_ringing_sfx.py`, not sourced.                          |
| `assets/images/poolwater.png`, `crate.png`, `gate.png`                                                  | Reflecting pool, crate and boarded gate — original 32x32 assets drawn by our group.                                            |
| `data/courtyard.json`                                                                                   | Level 2 tile layout, designed entirely by our group members.                                                                   |
| `assets/images/roadasphalt.png`, `roaddash.png`, `roadedge.png`, `kerb.png`                             | Level 3 carriageway: tarmac, centre-line dash, edge line and kerb — original 32x32 assets drawn by our group.                  |
| `assets/images/verge.png`, `vergetuft.png`, `roaddirt.png`                                              | Night grass verge, tufted verge and bare dirt — original 32x32 assets drawn by our group.                                      |
| `assets/images/roadbush.png`, `roadtree.png`                                                            | Roadside bush and the treeline that walls the level in — original 32x32 assets drawn by our group.                             |
| `assets/images/streetlamp.png`                                                                          | **PLACEHOLDER** — a stand-in so the safe-zone mechanic could be built and tested. Our group is drawing the final art.          |
| `assets/images/splash.png`                                                                              | Title-screen logo, drawn by our group; cropped and compressed for the web.                                                     |
| `data/street.json`                                                                                      | Level 3 tile layout, designed entirely by our group members.                                                                   |

The courtyard tiles are generated by `tools/make_courtyard_tiles.py`, and the street tiles
by `tools/make_street_tiles.py`, each of which draws every 32x32 sprite pixel by pixel with
Pillow. Run the relevant script to rebuild them after editing the palette or a shape. The
ground, hedge, water, asphalt and treeline tiles are authored to wrap, so a field of them
shows no repeating grid.

## References

[1] Cardona-Rivera RE, Young RM. A cognitivist theory of affordances for games. In: Proceedings of DiGRA 2013 Conference: DeFragging Game Studies. Digital Games Research Association; 2013.
[2] Sweetser P, Wyeth P. GameFlow: a model for evaluating player enjoyment in games. Computers in Entertainment. 2005;3(3):3-3. doi:10.1145/1077246.1077253.
[3] Lee J. Week 6: Understanding Player Behaviour Through Observation and Simple Metrics. Course notes presented at: GBDA302: Global Digital Project 2; June 2026; University of Waterloo.
[4] TheMSsoundeffects. 2013. Distorted screams sound effect. (August 2013). Retrieved July 9, 2026 from https://www.youtube.com/watch?v=7ifWmw6U2dE
[5] WXYZVNNE. 2022. Four voices whispering : Horror film sound effects - youtube. (March 2022). Retrieved July 9, 2026 from https://www.youtube.com/watch?v=7JOEKMiHJn0
[6] ElktheBeast. 2023.(January 2023). Retrieved July 9, 2026 from https://www.youtube.com/watch?v=A9eHuIJ5M3o
[7]Data_pion. Free footstep sound effects download - pixabay. Retrieved July 9, 2026 from https://pixabay.com/sound-effects/search/footstep/
[8] data_pion. Free footstep sound effects download - pixabay. Retrieved July 9, 2026 from https://pixabay.com/sound-effects/search/footstep/
[9] ribhavagrawal. Heavy breathing sound effect - type 01 | royalty-free music - pixabay. Retrieved July 9, 2026 from https://pixabay.com/sound-effects/people-heavy-breathing-sound-effect-type-01-294190/
