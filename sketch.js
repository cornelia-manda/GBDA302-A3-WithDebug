// =====================================================================
//  HEAR NO EVIL  —  a flashlight horror escape
//  The player is deaf: music is muffled & quiet, the vampire's whisper
//  only grows audible as it closes in.
// =====================================================================

// The canvas now fills the window (see setup / windowResized). These remain as
// the resolution the game was designed and tuned at — the tutorial room and the
// UI spacing were laid out against them — but nothing sizes the canvas by them.
const DESIGN_W = 800;
const DESIGN_H = 800;
// Default world size. The levels are different sizes, so initGame() overrides
// these from whatever the loaded map actually covers — otherwise the smaller
// level lets you walk off the edge of the tiles into undrawn space.
const WORLD_W = 2000;
const WORLD_H = 1000;
let worldW = WORLD_W;
let worldH = WORLD_H;
const PLAYER_SPEED = 1.9; // 5% slower
// The vampire's pace is measured from this fixed base rather than PLAYER_SPEED,
// so slowing the player down widens the gap instead of also slowing the monster.
const VAMP_BASE_SPEED = 2.0;
const PLAYER_RADIUS = 25;
const FLASHLIGHT_DISTANCE = 270;
const FLASHLIGHT_ANGLE = Math.PI / 2 + 0.05;
const CAM_SMOOTHING = 0.08;

const TITLE_FONT = "Creepster, Nosifer, cursive";

let player;
let camera;
let walls = [];
let lightWalls = []; // subset of walls that actually cast shadows (see LIGHT_OCCLUDER_CHARS)
let tables = [];
let keyItem;
let door;
let gameState; // "start" | "tutorial" | "play" | "win" | "gameover"
let pressedKeys = {};
let fogLayer;
let vampire;
let vampireImg, playerImg, keyImg, tableImg, deathImg, doorImg;
let cursorImg;
let splashImg;
// millis() at the moment the title screen began, so its reveal can be timed.
let startAnimAt = 0;
let dinnertableImg, chairbackImg, signImg;
let carpetCornerImg, carpetMiddleImg, carpetTopImg;
let shakeX = 0,
  shakeY = 0;

// ------------------------------------------------------------
// SYSTEM DEBUG PANEL VARIABLE
// ------------------------------------------------------------
let showDebug = false; // Toggled via key 'M'

// Tile map. These three always point at the CURRENT level's tileset;
// initGame() swaps them when you move from the mansion to the courtyard.
let tileWallImg, tileCornerImg, tileFloorImg;
let tileMapData;
let TILE_SIZE = 40;
let mapCols = 50;
let mapRows = 40;

// Level 1 — the mansion interior. Its walls are auto-tiled: the map only
// marks '@' for "wall here" and the renderer picks the straight / corner /
// tee / cross piece from the four neighbours, so junctions always meet up.
let mansionMapData, mansionFloorImg, mansionWallImg, mansionCornerImg;
let wallVerticalImg, wallHorizontalImg, wallCornerImg, wallTeeImg, wallPlusImg;
let doorLeafImg;

// Level 2 — the overgrown courtyard.
let streetMapData;
let roadAsphaltImg, roadDashImg, roadEdgeImg, kerbImg;
let vergeImg,
  vergeTuftImg,
  roadBushImg,
  roadTreeImg,
  roadDirtImg,
  streetLampImg;
let boulderImg; // optional level-3 roadside prop
let powerBoxImg; // level-3 power box (QTE prop)
let crossgraveImg; // level-3 gravestone
let courtyardMapData, cyFloorImg, cyWallImg, cyCornerImg;
let cyMossImg, cyIvyImg, hedgeImg, flowerBushImg;
let poolImg, wellImg, crateImg, gateImg, puddleImg;

let currentLevel = 0;

// Every character that blocks movement and casts a flashlight shadow.
// Mansion: walls, corners, tables, sign. Courtyard: hedges, water, the well,
// crates, the boarded gate.
// b/t/l are the street's bush, tree and lamp post; P is the street's power
// box; Y is the street's gravestone ('X' was already taken by the
// courtyard's gate, so the gravestone uses the next free letter).
const SOLID_CHARS = "LRUBNESWCTDG@#%~opqvkXbtlPY";

// Which tiles actually cast a shadow. This is deliberately much smaller than
// SOLID_CHARS: only tall structures block the torch (mansion walls '@' and
// furniture T/D/G, the courtyard's perimeter walls L R U B N E S W C, and the
// street's boundary trees 't'). Low props — the fountain/well, the pool, the
// hedges, crates, the gate, bushes, the lamp posts — are still walked into, but
// the light now washes over and past them instead of dying on the first tile.
// This is the core fix for "the fountain just lights up two blocks."
const LIGHT_OCCLUDER_CHARS = "@LRUBNESWCTDGt";

// Walkable, but standing on one ends the run. Kept separate from SOLID_CHARS
// because a puddle has to let you in — that's the whole point of it.
const HAZARD_CHARS = "*";

// Tutorial / intro
let tutorialStartX = 0,
  tutorialStartY = 0;
let tutorialIntroDismissed = false;

// Smooth room-to-room fade transition
let fadeActive = false;
let fadePhase = ""; // "out" | "in"
let fadeAlpha = 0;
let fadeCallback = null;

// Flashlight flicker
let lightOn = true;
let flickering = false;
let flickerStart = 0;
let flickerDur = 0;
let nextFlickerAt = 0;
let nextStrobe = 0;

// Audio
let bgMusic, whisperSound, musicFilter, whisperFilter;
let seenSound, gameoverSound, ringingSound;
let footstep1, footstep2, breathingSound, bodyFilter;
let musicReady = false,
  whisperReady = false;
let seenReady = false,
  gameoverReady = false,
  ringingReady = false;
let footstep1Ready = false,
  footstep2Ready = false,
  breathingReady = false;
let wantAudio = false;
let whisperVol = 0;

// Movement-driven body audio
const STEP_INTERVAL = 360; // ms between footsteps (brisk walk)
let footIndex = 0;
let lastStepTime = 0;
let breathingVol = 0;
let playerMoveAmount = 0;

// Kill-cam (plays before the death screen)
const DEATH_CAM_MS = 1500;
let deathStart = 0;
let killPos = null;

// Knockout — walking into standing water puts you on the floor rather than
// killing you. You keep the level, but you lose your feet, your light and
// about a second and a half, which is plenty of time for something to reach
// you. Short on purpose: it should read as a punishment, not a cutscene.
const KO_MS = 1500;
// You come round still lying in the puddle, so without a grace period the very
// next frame knocks you straight back out and you can never walk clear. This is
// long enough to get well off the tile at walking pace.
const KO_GRACE_MS = 1600;
let koActive = false;
let koStart = 0;
let koGraceUntil = 0;

// =====================================================================
//  ADDITIONS (aim dead-zone, menu scene, storm, blood-puddle blackout,
//  lamp sparks, tree affordance, animated death screen, icon HUD)
// =====================================================================

// --- Aim dead-zone ---------------------------------------------------
// Close to the character the aim angle swings wildly for tiny cursor moves,
// which made the light whip around. Inside this radius the aim HOLDS its last
// direction so you can look around comfortably; a ring shows where the zone is.
const MIN_AIM_DIST = 105; // world px
let aimAngle = 0; // smoothed, clamped aim direction used by all light code
let aimClamped = false; // cursor currently inside the dead-zone

// --- Menu scene ------------------------------------------------------
let bgforestImg;
let menuBats = []; // circling bats on the title screen
let titleButtons = []; // hit-rects for the stone buttons, rebuilt each draw
// "start" now means the animated menu; "howto" is the instructions panel.
let menuVampEye = 0; // pulsing glow on the distant vampire

// --- Storm (level 2 rain/thunder/lightning) --------------------------
let thunderSound, thunder2Sound, rainSound;
let thunderReady = false,
  thunder2Ready = false,
  rainReady = false;
let rainDrops = [];
let stormActive = false; // rain + random thunder running this level

// --- Level 3 manual flashlight battery ---------------------------------
// On the street the torch is dying: it only works while SHIFT is held, and it
// runs down a ~10s battery. When it's flat it dies and only flickers rarely.
const BATTERY_MAX_MS = 10000;
let batteryMs = BATTERY_MAX_MS;
let batteryDead = false;
let deadFlickerUntil = 0;
let nextDeadFlickerAt = 0;
let l3WarnActive = false; // "flashlight dying" card — waits for ENTER
let nextRumbleAt = 0; // next ambient rumble
let lightningPeak = 0; // brightness 0..1 for the current flash
let lightningStart = 0; // millis() the current flash began
let lightningDur = 0; // its length in ms
let lightningRevealUntil = 0; // vampire is shown regardless of the torch until here
let menuAudioOn = false; // menu ambiance unlocked after the first interaction
let introFired = false; // one-shot guard for a level intro's sound/flash

// --- Tinnitus / 8D "deaf-ear ring" -----------------------------------
// A rare 1.5s event: the deaf (left) ear rings loudly while everything you can
// still hear jumps to the good (right) ear, and the screen whites out. Fires
// ~3x a level at random, and whenever the flashlight catches the vampire.
let earRingSound;
let earRingReady = false;
let ringUntil = 0; // the ring event is active until here
let ringStopAt = 0; // hard-stop the (long) clip here so it never runs on
const RING_MS = 1500; // event length
const RING_CLIP_MAX = 1100; // never let the ~10s file play longer than this
let nextRandomRingAt = 0;
let ringsThisLevel = 0;
const RINGS_PER_LEVEL = 3;

let introsSeen = {}; // level index -> true once its intro cinematic has played

// --- Level intro (pre-play cinematic gate) ---------------------------
let levelIntroActive = false;
let levelIntroStart = 0;
let levelIntroKind = ""; // "storm" (L2) | "dread" (L3)
const STORM_INTRO_MS = 1700; // clap + strike, then play begins
const DREAD_INTRO_MS = 4200; // L3's slower, scarier open (longer so it reads)

// --- Blood-puddle blackout -------------------------------------------
// Replaces the old white-out knockout. Stepping in blood shakes the screen,
// flickers the torch hard for a moment, then kills the light for BLIND_MS.
// You can still move, but you are crawling — and blind — the whole time.
const BLIND_MS = 2000; // torch is dead this long
const BLIND_FLICKER_MS = 220; // violent flicker at the very start
const BLIND_SLOW = 0.32; // movement multiplier while blind
let blindShakeUntil = 0; // extra screen-shake window on impact

// --- Lamp sparks (level 3) -------------------------------------------
let lampSparks = []; // {x,y,vx,vy,born,life}
let nextLampSparkAt = 0;

// --- Death screen ----------------------------------------------------
let deathLevel = 0; // which level the player died on, for the hint line
let deathBats = []; // drifting bats on the game-over screen

// ---------------------------------------------------------------------
// Tiles are all 32x32 and get scaled to TILE_SIZE on draw, so every new
// courtyard asset is authored at the same size as the mansion set.
function loadTile(name) {
  return loadImage(
    "assets/images/" + name + ".png",
    () => {},
    () => {},
  );
}

function preload() {
  mansionWallImg = loadTile("wall");
  mansionCornerImg = loadTile("corner");
  mansionFloorImg = loadTile("floor");

  // Auto-tiling wall set for the mansion
  wallVerticalImg = loadTile("wallVertical");
  wallHorizontalImg = loadTile("wallHorizontal");
  wallCornerImg = loadTile("wallCorner");
  wallTeeImg = loadTile("wallTee");
  wallPlusImg = loadTile("wallPlus");
  doorLeafImg = loadTile("doorLeaf");
  playerImg = loadImage(
    "assets/images/mainguy2.png",
    () => {},
    () => {},
  );
  vampireImg = loadImage(
    "assets/images/Vampire.png",
    () => {},
    () => {},
  );
  keyImg = loadImage(
    "assets/images/key.png",
    () => {},
    () => {},
  );
  tableImg = loadImage(
    "assets/images/table.png",
    () => {},
    () => {},
  );
  deathImg = loadImage(
    "assets/images/death.png",
    () => {},
    () => {},
  );
  doorImg = loadImage(
    "assets/images/Door.png",
    () => {},
    () => {},
  );
  cursorImg = loadImage(
    "assets/images/cursorcircle.png",
    () => {},
    () => {},
  );
  splashImg = loadImage(
    "assets/images/splash.png",
    () => {},
    () => {},
  );
  bgforestImg = loadImage(
    "assets/images/bgforest.png",
    () => {},
    () => {},
  );
  dinnertableImg = loadImage(
    "assets/images/dinnertable.png",
    () => {},
    () => {},
  );
  chairbackImg = loadImage(
    "assets/images/chairback.png",
    () => {},
    () => {},
  );
  signImg = loadImage(
    "assets/images/sign.png",
    () => {},
    () => {},
  );
  carpetCornerImg = loadImage(
    "assets/images/carpetcorner.png",
    () => {},
    () => {},
  );
  carpetMiddleImg = loadImage(
    "assets/images/carpetmiddle.png",
    () => {},
    () => {},
  );
  carpetTopImg = loadImage(
    "assets/images/carpettop.png",
    () => {},
    () => {},
  );

  // Courtyard tileset (level 2)
  cyFloorImg = loadTile("courtyardfloor");
  cyMossImg = loadTile("courtyardmoss");
  cyIvyImg = loadTile("ivy");
  cyWallImg = loadTile("courtyardwall");
  cyCornerImg = loadTile("courtyardcorner");
  hedgeImg = loadTile("hedge");
  flowerBushImg = loadTile("flowerbush");
  poolImg = loadTile("poolwater");
  puddleImg = loadTile("puddle");
  wellImg = loadTile("wellquarter");
  crateImg = loadTile("crate");
  gateImg = loadTile("gate");

  // Street (level 3). streetlamp.png is a placeholder for the group's own art.
  roadAsphaltImg = loadTile("roadasphalt");
  roadDashImg = loadTile("roaddash");
  roadEdgeImg = loadTile("roadedge");
  kerbImg = loadTile("kerb");
  vergeImg = loadTile("verge");
  vergeTuftImg = loadTile("vergetuft");
  roadBushImg = loadTile("roadbush");
  roadTreeImg = loadTile("roadtree");
  roadDirtImg = loadTile("roaddirt");
  // Street lamp: prefer the group's finished lamp.png, fall back to the
  // placeholder if it isn't in the project yet.
  streetLampImg = loadImage(
    "assets/images/lamp.png",
    () => {},
    () => {
      streetLampImg = loadTile("streetlamp");
    },
  );
  // Optional roadside boulder prop for level 3 (only drawn if present).
  boulderImg = loadImage(
    "assets/images/boulder1.png",
    () => {},
    () => {},
  );
  // Power box (level 3, QTE prop). Falls back to a flat colour if the art
  // isn't in the project yet, same as every other loadTile() call.
  powerBoxImg = loadTile("powerbox");
  // Gravestone (level 3, decorative solid obstacle).
  crossgraveImg = loadTile("crossgrave");

  mansionMapData = loadJSON("data/blocks.json");
  courtyardMapData = loadJSON("data/courtyard.json");
  streetMapData = loadJSON("data/street.json");
}

// Both levels share the same tile-map format; only the art and the layout
// differ, so drawRoom()/initGame() stay level-agnostic.
const LEVELS = [
  {
    name: "The Mansion",
    data: () => mansionMapData,
    floor: () => mansionFloorImg,
    wall: () => mansionWallImg,
    corner: () => mansionCornerImg,
  },
  {
    name: "The Courtyard",
    data: () => courtyardMapData,
    floor: () => cyFloorImg,
    wall: () => cyWallImg,
    corner: () => cyCornerImg,
  },
  {
    // The road out. Its boundary is the treeline rather than a built wall, so
    // wall/corner point at the tree tile — the street map never uses the
    // L/R/U/B or N/E/S/W pieces those slots exist for.
    name: "The Street",
    data: () => streetMapData,
    floor: () => vergeImg,
    wall: () => roadTreeImg,
    corner: () => roadTreeImg,
  },
];

// A browser can report a zero-sized window — a hidden or backgrounded tab does
// it — and a 0x0 canvas is an unrecoverable black screen, since nothing would
// ever draw to prompt a resize. The floor here only has to be non-degenerate,
// NOT the design size: forcing 800 would make the canvas taller than a short
// window, and with the page set to overflow:hidden the bottom would simply be
// unreachable. A later resize event corrects things once the window is real.
function viewportW() {
  return max(windowWidth, 320);
}
function viewportH() {
  return max(windowHeight, 240);
}

function setup() {
  // Fullscreen: the canvas is the window, and everything that used to assume a
  // fixed 800x800 now reads width/height. The world itself is still drawn at
  // 1:1, so a bigger window simply shows more of the level — the flashlight
  // cone, not the viewport, is what limits what the player can actually see.
  createCanvas(viewportW(), viewportH());
  fogLayer = createGraphics(width, height);
  textFont("monospace");
  noCursor();
  camera = { x: 0, y: 0 };

  // The tutorial room is drawn with the mansion tileset, before any level
  // has been loaded, so point at level 1 up front.
  applyLevelTileset(0);

  if (tileMapData) {
    TILE_SIZE = tileMapData.tileSize || TILE_SIZE;
    mapCols = tileMapData.cols || mapCols;
    mapRows = tileMapData.rows || mapRows;
  }

  loadAudio();
  nextFlickerAt = millis() + random(8000, 16000);

  gameState = "start";
  startAnimAt = millis();
}

// Follow the window. The fog buffer is a full-canvas overlay, so it has to be
// rebuilt at the new size or the darkness stops covering the screen.
function windowResized() {
  resizeCanvas(viewportW(), viewportH());
  fogLayer = createGraphics(width, height);
}

// ---------------------------------------------------------------------
//  AUDIO
// ---------------------------------------------------------------------
function loadAudio() {
  if (typeof loadSound !== "function") return;
  try {
    bgMusic = loadSound(
      "assets/sounds/scarymusic.mp3",
      () => {
        musicReady = true;
        setupMusic();
        maybeStartAudio();
      },
      () => console.warn("scarymusic.mp3 not found — music disabled."),
    );
    whisperSound = loadSound(
      "assets/sounds/whisper.mp3",
      () => {
        whisperReady = true;
        setupWhisper();
        maybeStartAudio();
      },
      () => console.warn("whisper.mp3 not found — whisper disabled."),
    );
    // One-shot scare stings (kept clear/unmuffled on purpose)
    seenSound = loadSound(
      "assets/sounds/seen.mp3",
      () => {
        seenReady = true;
      },
      () => console.warn("seen.mp3 not found — disabled."),
    );
    gameoverSound = loadSound(
      "assets/sounds/gameover.mp3",
      () => {
        gameoverReady = true;
      },
      () => console.warn("gameover.mp3 not found — disabled."),
    );
    // Tinnitus ring for the knockout. Left unfiltered like the other stings:
    // the ringing is inside his head, not a sound in the room, so the muffling
    // that stands in for his hearing loss shouldn't apply to it.
    ringingSound = loadSound(
      "assets/sounds/ringing.wav",
      () => {
        ringingReady = true;
      },
      () => console.warn("ringing.wav not found — disabled."),
    );
    // Player body sounds (own footsteps + scared breathing), lightly muffled.
    footstep1 = loadSound(
      "assets/sounds/footstep1.mp3",
      () => {
        footstep1Ready = true;
        connectBody(footstep1);
      },
      () => console.warn("footstep1.mp3 not found — disabled."),
    );
    footstep2 = loadSound(
      "assets/sounds/footstep2.mp3",
      () => {
        footstep2Ready = true;
        connectBody(footstep2);
      },
      () => console.warn("footstep2.mp3 not found — disabled."),
    );
    breathingSound = loadSound(
      "assets/sounds/breathing.mp3",
      () => {
        breathingReady = true;
        connectBody(breathingSound);
        maybeStartAudio();
      },
      () => console.warn("breathing.mp3 not found — disabled."),
    );
    // Storm kit (level 2 + the title screen). The player will drop these in;
    // if they are missing the game just runs silent, like every other clip.
    // The big clap and the ambient rumbles come only from the RIGHT (good) ear,
    // matching the whisper's left-ear deafness.
    thunderSound = loadSound(
      "assets/sounds/thunder.mp3",
      () => {
        thunderReady = true;
      },
      () => console.warn("thunder.mp3 not found — disabled."),
    );
    thunder2Sound = loadSound(
      "assets/sounds/thunder2.mp3",
      () => {
        thunder2Ready = true;
      },
      () => console.warn("thunder2.mp3 not found — disabled."),
    );
    rainSound = loadSound(
      "assets/sounds/rainsound.mp3",
      () => {
        rainReady = true;
      },
      () => console.warn("rainsound.mp3 not found — disabled."),
    );
    // Tinnitus ring for the deaf ear. The clip is long; we only ever play ~1s
    // of it (see updateEarRing). Filename has a space, as provided.
    earRingSound = loadSound(
      "assets/sounds/ear ring.mp3",
      () => {
        earRingReady = true;
      },
      () => console.warn("'ear ring.mp3' not found — tinnitus disabled."),
    );
  } catch (e) {
    console.warn("p5.sound unavailable:", e);
  }
}

// Shared light low-pass so the character's own body sounds feel muffled too.
function connectBody(snd) {
  try {
    if (!bodyFilter) {
      bodyFilter = new p5.LowPass();
      bodyFilter.freq(1200);
      bodyFilter.res(1);
    }
    snd.disconnect();
    snd.connect(bodyFilter);
    snd.setVolume(0.0);
  } catch (e) {
    /* filter optional */
  }
}

function setupMusic() {
  try {
    musicFilter = new p5.LowPass(); // muffle (deaf perspective)
    musicFilter.freq(480);
    musicFilter.res(2);
    bgMusic.disconnect();
    bgMusic.connect(musicFilter);
    bgMusic.setVolume(0.0);
  } catch (e) {
    /* filter optional */
  }
}

function setupWhisper() {
  try {
    whisperFilter = new p5.LowPass();
    whisperFilter.freq(820);
    whisperSound.disconnect();
    whisperSound.connect(whisperFilter);
    whisperSound.setVolume(0.0);
  } catch (e) {
    /* filter optional */
  }
}

function playOneShot(snd, ready, vol) {
  if (!ready || !snd) return;
  try {
    snd.setVolume(vol);
    snd.play();
  } catch (e) {}
}

// Thunder only reaches the good (right) ear — the left is his deaf side, the
// same asymmetry the whisper uses.
function playRightEar(snd, ready, vol) {
  if (!ready || !snd) return;
  try {
    snd.setVolume(vol);
    if (typeof snd.pan === "function") snd.pan(1.0);
    snd.play();
  } catch (e) {}
}

// Kept deliberately quiet: the rain is atmosphere and a way to mask the
// whisper a little, not something that should ever drown the game out.
function startRain() {
  if (!rainReady || !rainSound) return;
  try {
    if (!rainSound.isPlaying()) {
      rainSound.setVolume(0.006);
      if (typeof rainSound.pan === "function") rainSound.pan(0.9); // mostly right ear
      rainSound.loop();
    }
  } catch (e) {}
}
function stopRain() {
  try {
    if (rainSound && rainSound.isPlaying()) rainSound.stop();
  } catch (e) {}
}

function startAudio() {
  wantAudio = true;
  try {
    if (typeof userStartAudio === "function") userStartAudio();
  } catch (e) {}
  maybeStartAudio();
}

function maybeStartAudio() {
  if (!wantAudio) return;
  if (musicReady && bgMusic && !bgMusic.isPlaying()) {
    try {
      bgMusic.setVolume(0.01);
      bgMusic.loop();
    } catch (e) {}
  }
  if (whisperReady && whisperSound && !whisperSound.isPlaying()) {
    try {
      whisperSound.setVolume(0.0);
      whisperSound.loop();
    } catch (e) {}
  }
  if (breathingReady && breathingSound && !breathingSound.isPlaying()) {
    try {
      breathingSound.setVolume(0.0);
      breathingSound.loop();
      if (typeof breathingSound.rate === "function") breathingSound.rate(0.9); // ~10% slower
    } catch (e) {}
  }
}

// Proximity whisper: faintly audible even far off, ramping up sharply
// the closer the vampire gets, loud when it's right beside you.
// Directional: panned to the vampire's real side, and the left ear only
// hears ~60% (that ear is more deaf).
function updateWhisper() {
  if (!whisperReady || !whisperSound) return;
  const near = 45,
    far = 800,
    maxV = 0.85;
  let d = dist(player.x, player.y, vampire.x, vampire.y);
  let v;
  if (d >= far) {
    v = 0;
  } else {
    let t = constrain(1 - (d - near) / (far - near), 0, 1); // 1 close -> 0 far
    let proximity = maxV * pow(t, 1.5); // steep ramp = noticeable
    let floorFade = constrain((far - d) / 140, 0, 1);
    let floorVol = 0.14 * floorFade; // still hear it a bit when far
    v = max(floorVol, proximity);
  }
  whisperVol = lerp(whisperVol, v, 0.15);

  // Direction based on his real left/right position relative to you.
  let panX = constrain((vampire.x - player.x) / 300, -1, 1);
  // Left ear is more deaf: only 40% on the far left, full on the right.
  let earFactor = panX < 0 ? lerp(1.0, 0.2, -panX) : 1.0;

  // While the deaf ear is ringing, everything you can still hear jumps hard to
  // the good (right) ear — the "8D" tinnitus moment.
  if (earRinging()) {
    panX = 0.98;
    earFactor = 1.0;
    whisperVol = max(whisperVol, 0.28);
  }

  try {
    whisperSound.setVolume(whisperVol * earFactor);
    if (typeof whisperSound.pan === "function") whisperSound.pan(panX, 0.1);
  } catch (e) {}
}

// --- Tinnitus ring --------------------------------------------------
function earRinging() {
  return millis() < ringUntil;
}

function triggerEarRing() {
  ringUntil = millis() + RING_MS;
}

// Caps the long clip to ~1s and schedules the rare random rings.
function updateEarRing() {
  const now = millis();
  if (ringStopAt && now >= ringStopAt) {
    ringStopAt = 0;
    try {
      if (earRingSound && earRingSound.isPlaying()) earRingSound.stop();
    } catch (e) {}
  }
  if (
    gameState === "play" &&
    !levelIntroActive &&
    ringsThisLevel < RINGS_PER_LEVEL &&
    now >= nextRandomRingAt
  ) {
    triggerEarRing();
    ringsThisLevel++;
    nextRandomRingAt = now + random(12000, 22000);
  }
}

// Full-screen white flash for the ring's duration — fully opaque the instant
// it fires, fading straight down to transparent by the time it ends.
function drawEarRingFlash() {
  if (!earRinging()) return;
  const elapsed = RING_MS - (ringUntil - millis());
  const frac = constrain(elapsed / RING_MS, 0, 1);
  const alpha = map(frac, 0, 1, 255, 0);
  push();
  noStroke();
  fill(255, 255, 255, alpha);
  rect(0, 0, width, height);
  pop();
}

// Footsteps (two clips alternating while moving) + scared breathing that
// rises with movement and drops when you slow or stop. Centered (own body).
function updateMovementAudio() {
  let moving = playerMoveAmount > 0.5;

  if (moving && footstep1Ready && footstep2Ready) {
    let now = millis();
    if (now - lastStepTime >= STEP_INTERVAL) {
      lastStepTime = now;
      let s = footIndex === 0 ? footstep1 : footstep2;
      footIndex = 1 - footIndex;
      try {
        s.setVolume(0.14); // there, but not loud
        s.play();
      } catch (e) {}
    }
  }

  if (breathingReady && breathingSound) {
    let target = moving ? 0.1 : 0.02; // quieter when slowed/stopped
    breathingVol = lerp(breathingVol, target, 0.08);
    try {
      breathingSound.setVolume(breathingVol);
      // His breathing sits in the good (right) ear like the rest of what he
      // can still hear — the left is his deaf side.
      if (typeof breathingSound.pan === "function") breathingSound.pan(0.85);
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------
//  LEVEL SETUP
// ---------------------------------------------------------------------
// The tutorial room is built in code rather than from a map, so its geometry
// lives here and every pass reads the same description. initTutorial(),
// drawTutorialRoom() and drawLitWalls() each used to carry their own copy, and
// the copies drifted: the renderer skipped one tile more than the collision did,
// which left an unpainted hole in the wall directly under the doorway.
const TUT_X = 100,
  TUT_Y = 140;
const TUT_COLS = 15,
  TUT_ROWS = 13;
const TUT_DOOR_ROW = 5,
  TUT_DOOR_TILES = 2;

function tutorialWallAt(c, r) {
  if (r < 0 || r >= TUT_ROWS || c < 0 || c >= TUT_COLS) return false;
  // The doorway out, a two-tile gap in the right-hand wall.
  if (c === TUT_COLS - 1)
    return !(r >= TUT_DOOR_ROW && r < TUT_DOOR_ROW + TUT_DOOR_TILES);
  return r === 0 || r === TUT_ROWS - 1 || c === 0;
}

function initTutorial() {
  const rx = TUT_X,
    ry = TUT_Y;
  const cols = TUT_COLS,
    rows = TUT_ROWS;

  player = {
    x: rx + 2 * TILE_SIZE + TILE_SIZE / 2,
    y: ry + floor(rows / 2) * TILE_SIZE + TILE_SIZE / 2,
    r: PLAYER_RADIUS,
    hasKey: false,
  };

  camera = { x: 0, y: 0 };
  // The tutorial room is built in code rather than from a map, so give it its
  // own bounds: one canvas, no scrolling, with room to step out of the doorway.
  worldW = 800;
  worldH = 800;
  walls = [];
  lightWalls = [];
  tables = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (tutorialWallAt(col, row)) {
        walls.push({
          x: rx + col * TILE_SIZE,
          y: ry + row * TILE_SIZE,
          w: TILE_SIZE,
          h: TILE_SIZE,
        });
      }
    }
  }

  // Tutorial desk, flush below the top wall
  let tutTableX = rx + 7 * TILE_SIZE;
  let tutTableY = ry + 1 * TILE_SIZE;
  walls.push({ x: tutTableX, y: tutTableY, w: TILE_SIZE, h: TILE_SIZE });
  tables.push({ x: tutTableX, y: tutTableY, w: TILE_SIZE, h: TILE_SIZE });

  // In the tutorial every wall (and the desk) casts a shadow — same as before.
  lightWalls = walls.slice();

  // Flush in the wall line: one tile thick, two tiles along the wall, so each
  // of the two leaves is exactly one 32x32 texture drawn square.
  door = {
    x: rx + (cols - 1) * TILE_SIZE,
    y: ry + TUT_DOOR_ROW * TILE_SIZE,
    w: TILE_SIZE,
    h: TUT_DOOR_TILES * TILE_SIZE,
    isOpen: false,
  };

  keyItem = {
    x: rx + 11 * TILE_SIZE + TILE_SIZE / 2,
    y: ry + floor(rows / 2) * TILE_SIZE + TILE_SIZE / 2,
    r: 14,
    collected: false,
  };

  tutorialStartX = player.x;
  tutorialStartY = player.y;
  tutorialIntroDismissed = false;
  gameState = "tutorial";
}

// Swap the map data and the three shared tile images over to a level.
function applyLevelTileset(level) {
  currentLevel = constrain(level, 0, LEVELS.length - 1);
  const lvl = LEVELS[currentLevel];
  tileMapData = lvl.data();
  tileFloorImg = lvl.floor();
  tileWallImg = lvl.wall();
  tileCornerImg = lvl.corner();
}

function initGame(level) {
  applyLevelTileset(level === undefined ? currentLevel : level);

  if (tileMapData) {
    TILE_SIZE = tileMapData.tileSize || TILE_SIZE;
    mapCols = tileMapData.cols || mapCols;
    mapRows = tileMapData.rows || mapRows;
  }

  // The playable area is exactly what the map covers.
  worldW = mapCols * TILE_SIZE;
  worldH = mapRows * TILE_SIZE;

  // Original-map positions (JSON may override spawn/vampire/door).
  const spawn = (tileMapData && tileMapData.spawn) || { x: 200, y: 200 };
  let vampPos = (tileMapData && tileMapData.vampire) || { x: 1700, y: 1200 };
  // The courtyard vampire used to start across the whole map, so you almost
  // never met him. Start him ~3 seconds' walk from the player instead.
  if (currentLevel === 1) vampPos = { x: spawn.x + 380, y: spawn.y };
  const doorPos = (tileMapData && tileMapData.door) || {
    x: worldW - 3 * TILE_SIZE,
    y: 700,
    w: 2 * TILE_SIZE,
    h: 200,
  };

  player = { x: spawn.x, y: spawn.y, r: PLAYER_RADIUS, hasKey: false };

  walls = [];
  lightWalls = [];
  tables = [];
  if (tileMapData && tileMapData.tiles) {
    for (let row = 0; row < mapRows; row++) {
      let line = tileMapData.tiles[row] || "";
      for (let col = 0; col < mapCols; col++) {
        let ch = line[col] || ".";
        if (SOLID_CHARS.indexOf(ch) !== -1) {
          const box = {
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE,
          };
          walls.push(box);
          if (LIGHT_OCCLUDER_CHARS.indexOf(ch) !== -1) lightWalls.push(box);
        }
        if (ch === "T") {
          tables.push({
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE,
          });
        }
      }
    }
  }

  // Key spawns in a random, reachable spot each game.
  const keyPos = pickRandomKeyTile(spawn.x, spawn.y);
  keyItem = { x: keyPos.x, y: keyPos.y, r: 16, collected: false };

  // Exit door aligned with the opening in the right wall.
  door = {
    x: doorPos.x,
    y: doorPos.y,
    w: doorPos.w,
    h: doorPos.h,
    isOpen: false,
  };

  vampire = {
    x: vampPos.x,
    y: vampPos.y,
    r: 25,
    state: "chasing",
    stunTimer: 0,
    shakeStartTime: -Infinity,
    wasInCone: false,
  };

  whisperVol = 0;
  koActive = false;
  koGraceUntil = 0;
  vampPath = [];
  vampRepathAt = 0;
  buildVampGrid();
  buildLamps();
  buildPowerBoxes();
  qteActive = false;
  // Start every level with the torch in hand rather than mid-blackout.
  failOn = true;
  failUntil = 0;
  failStrobeAt = 0;
  lightOn = true;
  flickering = false;

  // Reset the new per-level effects.
  koActive = false;
  blindShakeUntil = 0;
  lampSparks = [];
  nextLampSparkAt = 0;
  lightningUntil = 0;
  lightningRevealUntil = 0;
  stormActive = false;
  rainDrops = [];
  stopRain();

  // level-3 battery
  batteryMs = BATTERY_MAX_MS;
  batteryDead = false;
  pressedKeys = {}; // never carry a stuck (held) key across a death/restart
  deadFlickerUntil = 0;
  nextDeadFlickerAt = millis() + random(2500, 6000);
  l3WarnActive = false;

  // tinnitus scheduling for this level
  ringUntil = 0;
  ringStopAt = 0;
  ringsThisLevel = 0;
  nextRandomRingAt = millis() + random(9000, 16000);

  // Level-specific opening. The courtyard breaks in with a thunderclap; the
  // street opens on something slower and nastier. Both are storm levels (rain +
  // thunder). Each level's intro plays only ONCE per playthrough — dying and
  // retrying drops you straight back into play without sitting through it again.
  levelIntroActive = false;
  introFired = false;
  levelIntroKind = ""; // default: no storm, no dread (e.g. the mansion)

  const isStormLevel = currentLevel === 1 || currentLevel === 2;
  if (currentLevel === 1) levelIntroKind = "storm";
  else if (currentLevel === 2) levelIntroKind = "dread";

  if (levelIntroKind && !introsSeen[currentLevel]) {
    // first visit: play the cinematic (it switches the weather on when it ends)
    levelIntroActive = true;
    levelIntroStart = millis();
    introsSeen[currentLevel] = true;
    if (isStormLevel) buildRain();
  } else if (isStormLevel) {
    // already seen (a retry): skip the cinematic but keep the storm running
    stormActive = true;
    buildRain();
    startRain();
    nextRumbleAt = millis() + random(2500, 6000);
  }

  gameState = "play";
}

// A field of rain streaks in screen space, seeded once and recycled as they
// fall. Screen space (not world) so it costs the same whatever the level size.
function buildRain() {
  rainDrops = [];
  const n = 220;
  for (let i = 0; i < n; i++) {
    rainDrops.push({
      x: random(-40, width + 40),
      y: random(-height, height),
      len: random(10, 22),
      spd: random(13, 20),
    });
  }
}

function restartGame() {
  startAudio();
  // Dying drops you back at the start of the level you were on; finishing the
  // last level and pressing R starts the whole escape over.
  if (gameState === "win") {
    introsSeen = {};
    initGame(0);
  } else {
    initGame(currentLevel);
  }
}

// Flood-fill from the spawn over walkable floor, then pick a random reachable
// tile a fair distance away — guarantees the key is never sealed off.
function pickRandomKeyTile(spawnX, spawnY) {
  if (!(tileMapData && tileMapData.tiles)) return { x: 1300, y: 950 };
  const tiles = tileMapData.tiles;
  // Anything not solid is walkable — that includes the courtyard's moss and
  // ivy ground cover, so a patch of it never seals off part of the map.
  // Puddles count as blocked here: the key must never end up somewhere you
  // can only reach by dying to get there.
  const isFloor = (c, r) => {
    if (r < 0 || r >= mapRows || c < 0 || c >= mapCols) return false;
    const ch = (tiles[r] || "")[c] || ".";
    return SOLID_CHARS.indexOf(ch) === -1 && HAZARD_CHARS.indexOf(ch) === -1;
  };

  const startC = floor(spawnX / TILE_SIZE);
  const startR = floor(spawnY / TILE_SIZE);
  const seen = new Set([startC + "," + startR]);
  const queue = [[startC, startR]];
  const reachable = [];

  while (queue.length) {
    const [c, r] = queue.shift();
    reachable.push([c, r]);
    for (const [nc, nr] of [
      [c + 1, r],
      [c - 1, r],
      [c, r + 1],
      [c, r - 1],
    ]) {
      const k = nc + "," + nr;
      if (!seen.has(k) && isFloor(nc, nr)) {
        seen.add(k);
        queue.push([nc, nr]);
      }
    }
  }

  // Lamp centres (street only) — the key must not land inside a lamp's pool,
  // since those are the vampire's no-go zones and it would be unreachable/unfair.
  const lampPts = [];
  for (let r = 0; r < mapRows; r++) {
    const ln = tiles[r] || "";
    for (let c = 0; c < mapCols; c++) {
      if (ln[c] === "l")
        lampPts.push([
          c * TILE_SIZE + TILE_SIZE / 2,
          r * TILE_SIZE + TILE_SIZE / 2,
        ]);
    }
  }
  const clearOfLamps = (cx, cy) => {
    for (const [lx, ly] of lampPts)
      if (dist(cx, cy, lx, ly) < LAMP_RADIUS + 40) return false;
    return true;
  };

  const candidates = reachable.filter(([c, r]) => {
    const cx = c * TILE_SIZE + TILE_SIZE / 2;
    const cy = r * TILE_SIZE + TILE_SIZE / 2;
    // Keep clear of the exit — a key behind the locked door cannot be picked
    // up, so the run would be unwinnable — and don't drop it in your lap.
    return (
      c < mapCols - 3 &&
      dist(cx, cy, spawnX, spawnY) > 350 &&
      clearOfLamps(cx, cy)
    );
  });

  const lampSafe = reachable.filter(([c, r]) =>
    clearOfLamps(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2),
  );
  const pool = candidates.length
    ? candidates
    : lampSafe.length
      ? lampSafe
      : reachable;
  const pick = pool[floor(random(pool.length))];
  return {
    x: pick[0] * TILE_SIZE + TILE_SIZE / 2,
    y: pick[1] * TILE_SIZE + TILE_SIZE / 2,
  };
}

// ---------------------------------------------------------------------
//  MAIN LOOP
// ---------------------------------------------------------------------
function draw() {
  background(0);

  if (gameState === "start") {
    drawMenu();
    if (showDebug) drawDebugPanel();
    drawCursor();
    return;
  }
  if (gameState === "howto") {
    drawHowTo();
    if (showDebug) drawDebugPanel();
    drawCursor();
    return;
  }

  // A level's opening cinematic freezes play until it finishes.
  if (levelIntroActive) updateLevelIntro();
  // The power box QTE (level 3) freezes play too; its own timeout still has
  // to tick regardless.
  if (qteActive) updateQte();

  // Level 3's torch is a manual on/off toggle — left click flips lightOn
  // directly in mousePressed(), so there's nothing to update per frame.
  // Every other level keeps the normal always-on torch with its occasional
  // flicker.
  if (
    currentLevel === 2 &&
    gameState === "play" &&
    !levelIntroActive &&
    !l3WarnActive
  ) {
    // no-op: lightOn is set by the click handler
  } else {
    updateFlicker();
  }
  // His torch is out along with him. During the first fraction of a second it
  // stutters violently, then dies for the rest of the blackout — that dead
  // stretch is what lets the vampire close the gap.
  if (koActive) {
    const bt = millis() - koStart;
    lightOn = bt < BLIND_FLICKER_MS ? random() < 0.5 : false;
  }
  // The torch stays dark through a level's intro and the battery-warning card.
  if (levelIntroActive || l3WarnActive) lightOn = false;
  // The tinnitus whiteout blinds him too — vision is gone for its duration.
  if (earRinging()) lightOn = false;

  // Smoothed, dead-zoned aim used by every light test this frame.
  updateAim();

  // Rebuilt before anything asks what the light can reach this frame.
  if (player && door) frameOccluders = getNearbyOccluders();

  const frozen =
    fadeActive ||
    levelIntroActive ||
    l3WarnActive ||
    qteActive ||
    (gameState === "tutorial" && !tutorialIntroDismissed);

  if (!frozen) {
    if (gameState === "tutorial") {
      updatePlayer();
      updateMovementAudio();
      checkKeyPickup();
      checkTutorialCompletion();
    } else if (gameState === "play") {
      updateBlind();
      // He can still move while blind — just barely, crawling — so the puddle
      // is a punishment you walk out of rather than a cutscene you wait through.
      updatePlayer();
      updateMovementAudio();
      if (!koActive) checkPuddleSlip();
      updateVampire();
      updateLamps();
      updateLampSparks();
      updateStorm();
      updateEarRing();
      checkKeyPickup();
      checkWinCondition();
      checkVampireCatch();
      updateWhisper();
    }
  }

  updateCamera();
  computeShake();

  // World (tiles) first
  push();
  translate(-camera.x + shakeX, -camera.y + shakeY);
  if (gameState === "tutorial") drawTutorialRoom();
  else drawRoom();
  drawBoulders(); // level-3 roadside props (under the fog, like all scenery)
  pop();

  if (gameState === "dying") {
    drawDeathCam();
  } else {
    drawFog();

    // Entities above fog
    push();
    translate(-camera.x + shakeX, -camera.y + shakeY);
    drawLitWalls();
    drawLamps();
    drawLampSparks();
    drawTreeHints();
    drawDoor();
    drawFurniture();
    drawPuddleBeacons(); // blood glow + circling bats, legible through the dark
    drawPlayer();
    drawAimRing();
    drawKey();
    if (gameState === "play") drawVampire();
    pop();
  }

  // Rain sits over the world but under the HUD (courtyard only).
  if (stormActive || levelIntroKind === "storm") drawRain();
  // Lightning flashes on top of the whole scene.
  drawLightning();
  // The dropped-torch icon by the player's head during a blackout.
  drawBlindOverlay();

  // HUD
  if (gameState === "tutorial") drawTutorialUI();
  else if (gameState === "play") drawUI();

  if (levelIntroActive) drawLevelIntro();
  if (l3WarnActive) drawL3Warning();
  if (qteActive) drawPowerBoxQte();

  if (gameState === "win") drawWinScreen();
  if (gameState === "gameover") drawGameOverScreen();

  if (gameState === "tutorial" && !tutorialIntroDismissed) drawTutorialIntro();

  drawFade();
  drawMinimap();
  drawEarRingFlash();

  // Draw the debug panel on top of everything if enabled
  if (showDebug) {
    drawDebugPanel();
  }

  drawCursor();
}

function drawMinimap() {
  if (gameState !== "play" || !(tileMapData && tileMapData.tiles)) return;

  const margin = 16;
  const mmW = 168,
    mmH = 132;
  const mmX = margin,
    mmY = height - mmH - margin;
  const sX = mmW / worldW,
    sY = mmH / worldH;

  push();
  translate(mmX, mmY);
  drawingContext.globalAlpha = 0.85; // whole minimap at ~85% opacity

  // stone frame + mottle
  noStroke();
  fill(30, 28, 34, 224);
  rect(-6, -6, mmW + 12, mmH + 12, 8);
  // deterministic mottle — must NOT call randomSeed here, since this runs every
  // play frame and would otherwise pin the global RNG used by gameplay.
  for (let i = 0; i < 16; i++) {
    fill(0, 0, 0, 30);
    const hx = (i * 37) % mmW;
    const hy = (i * 53) % mmH;
    ellipse(hx, hy, 8 + (i % 3) * 4, 6 + (i % 2) * 3);
  }
  fill(10, 9, 12, 236);
  rect(0, 0, mmW, mmH, 4);
  stroke(120, 20, 20, 200);
  strokeWeight(2);
  noFill();
  rect(0, 0, mmW, mmH, 4);

  // label
  noStroke();
  fill(150, 40, 40);
  textFont(TITLE_FONT);
  textSize(16);
  textAlign(LEFT, TOP);
  text("map", 5, -3);

  // walls
  noStroke();
  fill(92, 94, 112, 220);
  for (let row = 0; row < mapRows; row++) {
    const line = tileMapData.tiles[row] || "";
    for (let col = 0; col < mapCols; col++) {
      if (SOLID_CHARS.indexOf(line[col] || ".") !== -1)
        rect(
          col * TILE_SIZE * sX,
          row * TILE_SIZE * sY,
          TILE_SIZE * sX + 0.5,
          TILE_SIZE * sY + 0.5,
        );
    }
  }

  // door marker (red locked / green open)
  if (door) {
    fill(door.isOpen ? color(70, 220, 130) : color(220, 60, 60));
    rect(door.x * sX - 1, door.y * sY - 1, 4, door.h * sY + 2);
  }

  // glowing amber player dot
  if (player) {
    const ctx = drawingContext;
    const g = ctx.createRadialGradient(
      player.x * sX,
      player.y * sY,
      0,
      player.x * sX,
      player.y * sY,
      8,
    );
    g.addColorStop(0, "rgba(255,210,90,0.9)");
    g.addColorStop(1, "rgba(255,210,90,0)");
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(player.x * sX, player.y * sY, 8, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
    noStroke();
    fill(255, 225, 120);
    ellipse(player.x * sX, player.y * sY, 4, 4);
  }
  drawingContext.globalAlpha = 1; // restore for everything after the minimap
  pop();
  textAlign(LEFT, BASELINE);
}

function drawCursor() {
  push();
  imageMode(CENTER);
  noStroke();
  if (cursorImg && cursorImg.width) {
    image(cursorImg, mouseX, mouseY, cursorImg.width, cursorImg.height);
  } else {
    fill(255);
    ellipse(mouseX, mouseY, 6);
  }
  // Too close to the body to aim comfortably: mark the cursor so the ring on
  // the ground reads as "pull back out".
  if (aimClamped && (gameState === "play" || gameState === "tutorial")) {
    noFill();
    stroke(232, 70, 70, 200);
    strokeWeight(2);
    ellipse(mouseX, mouseY, 22, 22);
  }
  pop();
}

function computeShake() {
  shakeX = 0;
  shakeY = 0;

  if (gameState === "dying") {
    let t = constrain((millis() - deathStart) / DEATH_CAM_MS, 0, 1);
    let amt = lerp(22, 4, t); // hard jolt that settles
    shakeX = random(-amt, amt);
    shakeY = random(-amt, amt);
    return;
  }

  if (gameState !== "play") return;

  if (millis() - vampire.shakeStartTime < 600) {
    shakeX = random(-34, 34);
    shakeY = random(-34, 34);
  }
  // The tinnitus whiteout shakes the camera for its whole duration, not just
  // a brief jolt at the start.
  if (earRinging()) {
    shakeX += random(-34, 34);
    shakeY += random(-34, 34);
  }
  if (vampire.state === "chasing") {
    let d = dist(player.x, player.y, vampire.x, vampire.y);
    if (d < 150) {
      let intensity = map(d, 150, 50, 1.5, 4.5, true);
      shakeX += random(-intensity, intensity);
      shakeY += random(-intensity, intensity);
    }
  }
}

function updateCamera() {
  // max() guards the case where a level is smaller than the canvas.
  // A window wider than the level would otherwise pin it to the top-left and
  // leave the dead space on one side; centre the world instead. The negative
  // camera value is what shifts it right, since drawing translates by -camera.
  let targetX =
    worldW <= width
      ? -(width - worldW) / 2
      : constrain(player.x - width / 2, 0, worldW - width);
  let targetY =
    worldH <= height
      ? -(height - worldH) / 2
      : constrain(player.y - height / 2, 0, worldH - height);
  camera.x = lerp(camera.x, targetX, CAM_SMOOTHING);
  camera.y = lerp(camera.y, targetY, CAM_SMOOTHING);
}

// ---------------------------------------------------------------------
//  FLICKER
// ---------------------------------------------------------------------
// A level can declare its torch as failing, via "flashlight" in the map JSON.
// The street does: out there the flashlight is nearly dead, off most of the
// time and catching only for a fraction of a second, which is what makes the
// streetlamps the level's real light source instead of a convenience. Levels
// that say nothing keep the original behaviour — on, with rare flickers.
let failOn = false,
  failUntil = 0,
  failStrobeAt = 0;

function updateFailingLight(t, cfg) {
  if (t >= failUntil) {
    failOn = !failOn;
    const range = failOn ? cfg.onMs : cfg.offMs;
    failUntil = t + random(range[0], range[1]);
  }
  if (!failOn) {
    lightOn = false;
    return;
  }
  // Even when it catches it stutters, so a burst is never a clean look around.
  if (t >= failStrobeAt) {
    failStrobeAt = t + random(40, 110);
    lightOn = random() < 0.72;
  }
}

function updateFlicker() {
  let t = millis();

  const cfg = tileMapData && tileMapData.flashlight;
  if (cfg && cfg.failing && gameState === "play") {
    updateFailingLight(t, cfg);
    return;
  }

  if (!flickering) {
    if (t >= nextFlickerAt) {
      flickering = true;
      flickerStart = t;
      flickerDur = random(220, 650);
      nextStrobe = 0;
    } else {
      lightOn = true;
    }
  }
  if (flickering) {
    if (t - flickerStart >= flickerDur) {
      flickering = false;
      lightOn = true;
      nextFlickerAt = t + random(12000, 28000); // very rare
    } else if (t >= nextStrobe) {
      nextStrobe = t + random(35, 75);
      lightOn = random() < 0.4; // mostly dark during a flicker
    }
  }
}

// ---------------------------------------------------------------------
//  PLAYER MOVEMENT
// ---------------------------------------------------------------------
function updatePlayer() {
  let startX = player.x,
    startY = player.y;
  let moveX = 0,
    moveY = 0;

  // Crawling pace while blind; full speed otherwise.
  const spd = koActive ? PLAYER_SPEED * BLIND_SLOW : PLAYER_SPEED;

  if (keyIsDown(LEFT_ARROW)) moveX -= spd;
  if (keyIsDown(RIGHT_ARROW)) moveX += spd;
  if (keyIsDown(UP_ARROW)) moveY -= spd;
  if (keyIsDown(DOWN_ARROW)) moveY += spd;

  if (pressedKeys["a"]) moveX -= spd;
  if (pressedKeys["d"]) moveX += spd;
  if (pressedKeys["w"]) moveY -= spd;
  if (pressedKeys["s"]) moveY += spd;

  movePlayer(moveX, 0);
  movePlayer(0, moveY);

  playerMoveAmount = dist(startX, startY, player.x, player.y);
}

function movePlayer(dx, dy) {
  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (
    !collidesWithWalls(nextX, player.y) &&
    !collidesWithDoor(nextX, player.y)
  ) {
    player.x = nextX;
  }
  if (
    !collidesWithWalls(player.x, nextY) &&
    !collidesWithDoor(player.x, nextY)
  ) {
    player.y = nextY;
  }

  player.x = constrain(player.x, player.r, worldW - player.r);
  player.y = constrain(player.y, player.r, worldH - player.r);
}

// radius defaults to the player's, but the vampire collides against the same
// geometry now, so it has to be able to ask on its own behalf.
function collidesWithWalls(cx, cy, radius) {
  const r0 = radius === undefined ? player.r : radius;
  if (gameState !== "tutorial" && tileMapData && tileMapData.tiles) {
    let colLeft = constrain(floor((cx - r0) / TILE_SIZE), 0, mapCols - 1);
    let colRight = constrain(floor((cx + r0) / TILE_SIZE), 0, mapCols - 1);
    let rowTop = constrain(floor((cy - r0) / TILE_SIZE), 0, mapRows - 1);
    let rowBottom = constrain(floor((cy + r0) / TILE_SIZE), 0, mapRows - 1);

    for (let r = rowTop; r <= rowBottom; r++) {
      let line = tileMapData.tiles[r] || "";
      for (let c = colLeft; c <= colRight; c++) {
        let ch = line[c] || ".";
        if (SOLID_CHARS.indexOf(ch) !== -1) {
          if (
            circleRectCollision(
              cx,
              cy,
              player.r,
              c * TILE_SIZE,
              r * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE,
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  for (let wall of walls) {
    if (circleRectCollision(cx, cy, player.r, wall.x, wall.y, wall.w, wall.h))
      return true;
  }
  return false;
}

function collidesWithDoor(cx, cy) {
  if (door.isOpen) return false;
  return circleRectCollision(cx, cy, player.r, door.x, door.y, door.w, door.h);
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  let closestX = constrain(cx, rx, rx + rw);
  let closestY = constrain(cy, ry, ry + rh);
  let dx = cx - closestX;
  let dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

// ---------------------------------------------------------------------
//  STREETLAMPS  (level 3)
// ---------------------------------------------------------------------
// The only shelter on the road. The vampire will not walk into lamplight, so
// standing under a lamp makes you untouchable — but the lamp starts dying the
// moment you step into it, and once it is out it stays out. They are stepping
// stones across the level, not a fort to camp in, which is the whole point:
// you have to decide when to spend one.
//
// Nothing here is level-specific in code; a lamp is simply an 'l' in the map,
// so any later level can use them.
const LAMP_RADIUS = 108; // pool of light, world px (smaller: gives the hunter room to cross the dark)
const LAMP_BURN_MS = 4200; // how long a lamp lasts once you step under it
const LAMP_FADE_MS = 1100; // the guttering at the end of that

let lamps = [];

function buildLamps() {
  lamps = [];
  if (!(tileMapData && tileMapData.tiles)) return;
  for (let row = 0; row < mapRows; row++) {
    const line = tileMapData.tiles[row] || "";
    for (let col = 0; col < mapCols; col++) {
      if (line[col] !== "l") continue;
      lamps.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
        state: "lit", // "lit" | "dying" | "dead"
        diesAt: 0,
      });
    }
  }
}

function updateLamps() {
  const now = millis();
  for (const L of lamps) {
    if (L.state === "dead") continue;
    // Linger under a lamp and it starts to fail, then goes out for good.
    if (L.state === "lit" && lampCovers(L, player.x, player.y)) {
      L.state = "dying";
      L.diesAt = now + LAMP_BURN_MS;
    }
    if (L.state === "dying" && now >= L.diesAt) L.state = "dead";
  }
}

function lampCovers(L, x, y) {
  return dist(x, y, L.x, L.y) < LAMP_RADIUS;
}

// The lamp currently sheltering the player, if any. Drives the HUD readout.
function playerShelter() {
  for (const L of lamps) {
    if (L.state !== "dead" && lampCovers(L, player.x, player.y)) return L;
  }
  return null;
}

// Would this position put the vampire in lamplight? Moving further in is
// refused, moving out is always allowed — otherwise a lamp coming on top of it
// would pin it in place forever.
function vampLightBlocked(x, y) {
  for (const L of lamps) {
    if (L.state === "dead") continue;
    const to = dist(x, y, L.x, L.y);
    if (to >= LAMP_RADIUS) continue;
    const from = dist(vampire.x, vampire.y, L.x, L.y);
    if (from >= LAMP_RADIUS || to < from) return true;
  }
  return false;
}

// Drawn above the darkness, like the exit, so a live lamp reads as a beacon
// from across the level. That visibility is the mechanic: you need to be able
// to see which shelter is still burning before you commit to running for it.
function drawLamps() {
  if (!lamps.length) return;
  const ctx = drawingContext;
  for (const L of lamps) {
    if (L.state === "dead") continue;

    let k = 1;
    if (L.state === "dying") {
      const left = L.diesAt - millis();
      if (left < LAMP_FADE_MS) {
        k = max(0, left / LAMP_FADE_MS);
        // irregular dips, so a failing lamp is legible at a glance
        k *= 0.5 + 0.5 * noise(millis() / 70 + L.x * 0.05);
      }
    }
    if (k <= 0.01) continue;

    const grad = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, LAMP_RADIUS);
    grad.addColorStop(0.0, `rgba(255,244,222,${0.18 * k})`);
    grad.addColorStop(0.45, `rgba(250,238,214,${0.09 * k})`);
    grad.addColorStop(1.0, "rgba(245,232,205,0)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(L.x, L.y, LAMP_RADIUS, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // the post itself, so a lit lamp is visible without the flashlight on it
    push();
    tint(255, 255 * (0.55 + 0.45 * k));
    drawTile(
      streetLampImg,
      L.x - TILE_SIZE / 2,
      L.y - TILE_SIZE / 2,
      0,
      color(70, 74, 82),
    );
    pop();
    noTint();
  }
}

// ---------------------------------------------------------------------
//  POWER BOX QTE (level 3) — a 'P' tile the player can stand near and hold a
//  quick-time event at to relight the nearest dead/dying streetlamp.
// ---------------------------------------------------------------------
const QTE_RANGE = 60; // world px, how close SPACE needs to be pressed
const QTE_TIME_MS = 5000; // time allowed to clear the sequence
const QTE_LENGTH = 3;
const QTE_KEYS = ["W", "A", "S", "D"];

let powerBoxes = [];
let qteActive = false;
let qteSequence = [];
let qteIndex = 0;
let qteStartAt = 0;
let qteBoxX = 0,
  qteBoxY = 0;

function buildPowerBoxes() {
  powerBoxes = [];
  if (!(tileMapData && tileMapData.tiles)) return;
  for (let row = 0; row < mapRows; row++) {
    const line = tileMapData.tiles[row] || "";
    for (let col = 0; col < mapCols; col++) {
      if (line[col] !== "P") continue;
      powerBoxes.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
      });
    }
  }
}

// The closest power box to (x, y), but only if it's actually in range —
// callers get a usable box or null, never a too-far one to check separately.
function nearestPowerBox(x, y) {
  let best = null,
    bestD = Infinity;
  for (const b of powerBoxes) {
    const d = dist(x, y, b.x, b.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best && bestD <= QTE_RANGE ? best : null;
}

function startQte(box) {
  qteActive = true;
  qteBoxX = box.x;
  qteBoxY = box.y;
  qteSequence = [];
  for (let i = 0; i < QTE_LENGTH; i++)
    qteSequence.push(QTE_KEYS[floor(random(QTE_KEYS.length))]);
  qteIndex = 0;
  qteStartAt = millis();
}

// Times the QTE out. Runs every frame regardless of the normal-play freeze,
// since qteActive is itself one of the things that freezes normal play.
function updateQte() {
  if (!qteActive) return;
  if (millis() - qteStartAt >= QTE_TIME_MS) qteFail();
}

function handleQteKey(k) {
  if (!k || k.length !== 1) return; // ignore modifier/arrow-style key names
  if (k.toUpperCase() === qteSequence[qteIndex]) {
    qteIndex++;
    if (qteIndex >= qteSequence.length) qteSucceed();
  } else {
    qteFail();
  }
}

function qteSucceed() {
  reactivateNearestLamp(qteBoxX, qteBoxY);
  triggerEarRing(); // 1.5s whiteout + lightOn = false, see updateEarRing()
  qteActive = false;
}

function qteFail() {
  qteActive = false;
}

// Restores whichever lamp is closest to (x, y) to full brightness, whatever
// state it was in — same fields buildLamps() initialises a fresh lamp with.
function reactivateNearestLamp(x, y) {
  let best = null,
    bestD = Infinity;
  for (const L of lamps) {
    const d = dist(x, y, L.x, L.y);
    if (d < bestD) {
      bestD = d;
      best = L;
    }
  }
  if (best) {
    best.state = "lit";
    best.diesAt = 0;
  }
}

// Centered prompt: the 3-key sequence with progress colour-coded, and a
// draining bar for the 5s time limit.
function drawPowerBoxQte() {
  push();
  noStroke();
  fill(0, 190);
  rect(0, 0, width, height);

  const pw = min(520, width * 0.82),
    ph = 220;
  const px = width / 2 - pw / 2,
    py = height / 2 - ph / 2;
  fill(40, 40, 46, 245);
  rect(px, py, pw, ph, 12);
  stroke(210, 170, 40, 220);
  strokeWeight(2);
  noFill();
  rect(px, py, pw, ph, 12);
  noStroke();

  textAlign(CENTER, CENTER);
  textFont(TITLE_FONT);
  fill(220, 190, 80);
  textSize(26);
  text("RESTORE POWER", width / 2, py + 38);

  textFont("monospace");
  const n = qteSequence.length;
  const gap = 90;
  const startX = width / 2 - ((n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const kx = startX + i * gap;
    textSize(48);
    if (i < qteIndex) fill(90, 220, 120);
    else if (i === qteIndex) {
      const pulse = 0.5 + 0.5 * sin(millis() / 140);
      fill(255, 255 * (0.7 + 0.3 * pulse), 120);
    } else fill(180);
    text(qteSequence[i], kx, py + 108);
    if (i < n - 1) {
      fill(150);
      textSize(28);
      text("→", kx + gap / 2, py + 108);
    }
  }

  const remain = constrain(1 - (millis() - qteStartAt) / QTE_TIME_MS, 0, 1);
  const barW = pw - 60,
    barH = 10;
  const barX = width / 2 - barW / 2,
    barY = py + ph - 34;
  noStroke();
  fill(0, 0, 0, 160);
  rect(barX, barY, barW, barH, 4);
  fill(remain < 0.3 ? color(220, 70, 60) : color(230, 190, 60));
  rect(barX, barY, barW * remain, barH, 4);

  pop();
  textAlign(LEFT, BASELINE);
}

// ---------------------------------------------------------------------
//  KEY / WIN / VAMPIRE
// ---------------------------------------------------------------------
function checkKeyPickup() {
  if (keyItem.collected) return;
  if (dist(player.x, player.y, keyItem.x, keyItem.y) < player.r + keyItem.r) {
    keyItem.collected = true;
    player.hasKey = true;
    door.isOpen = true;
  }
}

function checkWinCondition() {
  if (!player.hasKey || fadeActive) return;
  // The door sits flush in the wall, so its far face is the edge of the world
  // and nothing can get past it. Stepping into the doorway is the escape.
  if (
    player.x > door.x &&
    player.y > door.y - player.r &&
    player.y < door.y + door.h + player.r
  ) {
    // Escaping the mansion only gets you as far as the courtyard.
    if (currentLevel < LEVELS.length - 1) {
      startFade(() => initGame(currentLevel + 1));
    } else {
      gameState = "win";
    }
  }
}

function updateVampire() {
  let inCone = isInFlashlight(vampire.x, vampire.y);

  if (vampire.state === "chasing") {
    if (inCone) {
      if (!vampire.wasInCone) {
        vampire.shakeStartTime = millis();
        triggerEarRing();
        playOneShot(seenSound, seenReady, 0.01); // nearly inaudible
      }
      vampire.state = "stunned";
      vampire.stunTimer = millis();
    } else {
      huntPlayer();
    }
  } else if (vampire.state === "stunned") {
    if (millis() - vampire.stunTimer >= 2000) vampire.state = "chasing";
  }

  vampire.wasInCone = inCone;
}

// The vampire used to phase straight through walls. That made it unfair in a
// different way to the one intended — it also made the layout irrelevant, since
// no wall, hedge or table ever changed its route. It now walks the same floor
// the player does, following a breadth-first path over the tile grid so it
// still rounds corners and comes through doorways instead of pressing itself
// against the far side of a wall.
const DEFAULT_VAMP_SPEED = 0.7;
const VAMP_REPATH_MS = 220;
let vampPath = [];
let vampRepathAt = 0;

// Pathfinding runs over half-tile nodes marked with whether a 25px body
// actually fits there, NOT over tile centres. That distinction matters: in a
// two-tile doorway both tile centres sit 20px from a wall, so a 25px body fits
// at neither, and a route through tile centres wedges itself in the opening.
const VAMP_GRID = TILE_SIZE / 2;
let vampGridW = 0,
  vampGridH = 0,
  vampFree = null;

// Built from the tile data directly rather than via collidesWithWalls(), which
// branches on gameState and isn't settled yet while a level is initialising.
function vampBodyFits(x, y, r) {
  if (x < r || y < r || x > worldW - r || y > worldH - r) return false;
  const c0 = constrain(floor((x - r) / TILE_SIZE), 0, mapCols - 1);
  const c1 = constrain(floor((x + r) / TILE_SIZE), 0, mapCols - 1);
  const r0 = constrain(floor((y - r) / TILE_SIZE), 0, mapRows - 1);
  const r1 = constrain(floor((y + r) / TILE_SIZE), 0, mapRows - 1);
  for (let rr = r0; rr <= r1; rr++) {
    const line = tileMapData.tiles[rr] || "";
    for (let cc = c0; cc <= c1; cc++) {
      if (SOLID_CHARS.indexOf(line[cc] || ".") === -1) continue;
      if (
        circleRectCollision(
          x,
          y,
          r,
          cc * TILE_SIZE,
          rr * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function buildVampGrid() {
  vampFree = null;
  if (!(tileMapData && tileMapData.tiles)) return;
  vampGridW = ceil(worldW / VAMP_GRID);
  vampGridH = ceil(worldH / VAMP_GRID);
  vampFree = new Uint8Array(vampGridW * vampGridH);
  const r = PLAYER_RADIUS;
  for (let gy = 0; gy < vampGridH; gy++) {
    for (let gx = 0; gx < vampGridW; gx++) {
      const x = gx * VAMP_GRID + VAMP_GRID / 2;
      const y = gy * VAMP_GRID + VAMP_GRID / 2;
      vampFree[gy * vampGridW + gx] = vampBodyFits(x, y, r) ? 1 : 0;
    }
  }
}

// A body standing in a legal spot doesn't necessarily sit on a free node —
// tile centres and node centres never coincide — so snap to the closest one
// rather than giving up and standing still.
function nearestFreeNode(x, y) {
  const gx = constrain(floor(x / VAMP_GRID), 0, vampGridW - 1);
  const gy = constrain(floor(y / VAMP_GRID), 0, vampGridH - 1);
  if (vampFree[gy * vampGridW + gx]) return gy * vampGridW + gx;
  for (let rad = 1; rad <= 4; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (max(abs(dx), abs(dy)) !== rad) continue;
        const nx = gx + dx,
          ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= vampGridW || ny >= vampGridH) continue;
        if (vampFree[ny * vampGridW + nx]) return ny * vampGridW + nx;
      }
    }
  }
  return -1;
}

function findVampPath(fromX, fromY, toX, toY) {
  if (!vampFree) return [];
  const start = nearestFreeNode(fromX, fromY);
  const goal = nearestFreeNode(toX, toY);
  if (start < 0 || goal < 0) return [];

  const n = vampGridW * vampGridH;
  const prev = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0,
    tail = 0,
    found = false;
  queue[tail++] = start;
  prev[start] = start;

  while (head < tail) {
    const cur = queue[head++];
    if (cur === goal) {
      found = true;
      break;
    }
    const cx = cur % vampGridW;
    const cy = (cur / vampGridW) | 0;
    if (cx > 0) {
      const k = cur - 1;
      if (vampFree[k] && prev[k] === -1) {
        prev[k] = cur;
        queue[tail++] = k;
      }
    }
    if (cx < vampGridW - 1) {
      const k = cur + 1;
      if (vampFree[k] && prev[k] === -1) {
        prev[k] = cur;
        queue[tail++] = k;
      }
    }
    if (cy > 0) {
      const k = cur - vampGridW;
      if (vampFree[k] && prev[k] === -1) {
        prev[k] = cur;
        queue[tail++] = k;
      }
    }
    if (cy < vampGridH - 1) {
      const k = cur + vampGridW;
      if (vampFree[k] && prev[k] === -1) {
        prev[k] = cur;
        queue[tail++] = k;
      }
    }
  }
  if (!found) return [];

  const path = [];
  let cur = goal;
  while (cur !== start) {
    path.push({
      x: (cur % vampGridW) * VAMP_GRID + VAMP_GRID / 2,
      y: ((cur / vampGridW) | 0) * VAMP_GRID + VAMP_GRID / 2,
    });
    cur = prev[cur];
  }
  return path.reverse();
}

function huntPlayer() {
  // Per level, out of the map JSON. The mansion and courtyard leave it at 0.7 —
  // slower than the player, so distance is a real defence. The street sets it
  // above 1.0: you cannot outrun it there, which is what forces you onto the
  // streetlamps instead of simply running for the exit.
  const mul = (tileMapData && tileMapData.vampireSpeed) || DEFAULT_VAMP_SPEED;
  // Courtyard (level 2) and street (level 3) each get an extra 10% on top of
  // the global pace; the mansion stays as it was.
  const lvlBoost = currentLevel === 1 || currentLevel === 2 ? 1.1 : 1.0;
  const step = VAMP_BASE_SPEED * mul * 1.12 * lvlBoost;

  // With nothing in the way it just walks at you, which looks better than
  // stepping between tile centres across an open room.
  if (hasClearLine(vampire.x, vampire.y, player.x, player.y)) {
    vampPath = [];
    const dx = player.x - vampire.x,
      dy = player.y - vampire.y;
    const d = sqrt(dx * dx + dy * dy);
    if (d > 0) moveVampire((dx / d) * step, (dy / d) * step);
    return;
  }

  // Otherwise follow the route. Repath on the timer, and immediately if the
  // route has run out — without that it beelines into a wall and sticks there.
  const now = millis();
  if (now >= vampRepathAt || !vampPath.length) {
    vampPath = findVampPath(vampire.x, vampire.y, player.x, player.y);
    vampRepathAt = now + VAMP_REPATH_MS;
  }
  while (
    vampPath.length &&
    dist(vampire.x, vampire.y, vampPath[0].x, vampPath[0].y) < VAMP_GRID * 0.6
  ) {
    vampPath.shift();
  }
  if (!vampPath.length) return;

  const dx = vampPath[0].x - vampire.x,
    dy = vampPath[0].y - vampire.y;
  const d = sqrt(dx * dx + dy * dy);
  if (d > 0) moveVampire((dx / d) * step, (dy / d) * step);
}

function hasClearLine(x1, y1, x2, y2) {
  for (let wall of walls) {
    if (isLineRectIntersecting(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

// Axis-separated like the player's own movement, so it slides along a wall
// rather than sticking to it.
function moveVampire(dx, dy) {
  // Lamplight blocks it exactly the way a wall does, and per axis for the same
  // reason: refusing the whole move would stop it dead at the edge of a pool,
  // where letting each axis through separately slides it around the rim. That
  // circling is what makes a lamp read as shelter rather than as a wall.
  if (
    !collidesWithWalls(vampire.x + dx, vampire.y, vampire.r) &&
    !vampLightBlocked(vampire.x + dx, vampire.y)
  )
    vampire.x += dx;
  if (
    !collidesWithWalls(vampire.x, vampire.y + dy, vampire.r) &&
    !vampLightBlocked(vampire.x, vampire.y + dy)
  )
    vampire.y += dy;
  vampire.x = constrain(vampire.x, vampire.r, worldW - vampire.r);
  vampire.y = constrain(vampire.y, vampire.r, worldH - vampire.r);
}

function checkVampireCatch() {
  if (dist(player.x, player.y, vampire.x, vampire.y) < 30) {
    startDeathCam();
  }
}

// The courtyard's standing water. It triggers on the tile under your feet —
// the player's centre — not on anything the hitbox merely brushes, so skirting
// the edge of a puddle is a real option rather than a coin flip.
function checkPuddleSlip() {
  if (koActive || millis() < koGraceUntil) return;
  if (!(tileMapData && tileMapData.tiles)) return;
  const col = floor(player.x / TILE_SIZE);
  const row = floor(player.y / TILE_SIZE);
  if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) return;
  const ch = (tileMapData.tiles[row] || "")[col] || ".";
  if (HAZARD_CHARS.indexOf(ch) !== -1) startBlind();
}

// Stepping in the blood knocks the torch out of his hands. The screen jolts,
// the beam stutters hard for a moment, then goes black for BLIND_MS while he
// gropes for it — he can still move, but only at a crawl, and the vampire does
// not slow down for either of them.
function startBlind() {
  koActive = true;
  koStart = millis();
  blindShakeUntil = millis() + 340;
  vampire.shakeStartTime = millis(); // reuse the heavy-shake window
  // Ear-ringing sound removed entirely.
}

function updateBlind() {
  if (koActive && millis() - koStart >= BLIND_MS) {
    koActive = false;
    // Come round still standing in the blood, so a grace window lets him walk
    // clear before the tile can grab him again.
    koGraceUntil = millis() + KO_GRACE_MS;
  }
}

// A little icon pinned by the player's head: a flashlight crossed out, ringed
// by a red arc that drains away like a loading spinner as the blackout ends.
// The screen also sits near-black for the duration so the point lands.
function drawBlindOverlay() {
  if (!koActive) return;
  const now = millis();
  const t = constrain((now - koStart) / BLIND_MS, 0, 1);

  // Near-total black over the world, but held back during the opening flicker
  // window so the torch's violent stutter reads before everything goes dark.
  push();
  noStroke();
  const flickFrac = BLIND_FLICKER_MS / BLIND_MS;
  const cover = t < flickFrac ? lerp(70, 236, t / flickFrac) : 236;
  fill(0, cover);
  rect(0, 0, width, height);
  if (t < 0.18) {
    fill(150, 0, 0, map(t, 0, 0.18, 150, 0));
    rect(0, 0, width, height);
  }
  pop();

  // Icon anchored just above the player's on-screen head. Enlarged so the
  // "torch is gone" read is obvious, with a smaller cross so the flashlight
  // stays legible under it.
  const sx = player.x - camera.x + shakeX;
  const sy = player.y - camera.y + shakeY - 52;
  push();
  translate(sx, sy);

  // draining timer ring (full at the start, gone at the end)
  const remain = 1 - t;
  noFill();
  stroke(30, 0, 0, 200);
  strokeWeight(4);
  ellipse(0, 0, 62); // dark track
  stroke(220, 40, 40);
  strokeWeight(4);
  const a0 = -HALF_PI;
  arc(0, 0, 62, 62, a0, a0 + TWO_PI * remain);

  // An unmistakable flashlight: handle, flared head, and a cone of light —
  // with a bold red slash through it to read as "no flashlight".
  push();
  rotate(-0.5); // tilt so the beam points up-right
  noStroke();
  // beam cone (pale, faint because it's OFF)
  fill(255, 230, 140, 55);
  beginShape();
  vertex(10, -3);
  vertex(32, -15);
  vertex(32, 15);
  vertex(10, 3);
  endShape(CLOSE);
  // beam ticks
  stroke(255, 236, 150, 90);
  strokeWeight(2);
  line(16, -6, 22, -10);
  line(17, 0, 24, 0);
  line(16, 6, 22, 10);
  noStroke();
  // flared head
  fill(215, 215, 225);
  beginShape();
  vertex(2, -8);
  vertex(11, -6);
  vertex(11, 6);
  vertex(2, 8);
  endShape(CLOSE);
  // body / handle
  fill(150, 150, 162);
  rect(-15, -5, 17, 10, 2);
  // grip rings
  stroke(85, 85, 96);
  strokeWeight(1.5);
  line(-9, -5, -9, 5);
  line(-5, -5, -5, 5);
  noStroke();
  // end cap + power button
  fill(95, 95, 108);
  rect(-18, -4, 3, 8, 1);
  fill(210, 80, 70);
  ellipse(-6, -6, 3, 3);
  pop();

  // one bold red slash = "no flashlight" (the draining ring is the other half)
  stroke(235, 40, 40);
  strokeWeight(4);
  line(-16, -16, 16, 16);
  pop();
}

// Freeze on the moment, play it out, then hand off to the death screen.
function startDeathCam() {
  if (gameState === "dying") return;
  gameState = "dying";
  deathStart = millis();
  deathLevel = currentLevel;
  killPos = { vx: vampire.x, vy: vampire.y, px: player.x, py: player.y };
  playOneShot(gameoverSound, gameoverReady, 0.7); // quick lose sting
  // cut the ambient body/vampire audio for the kill
  try {
    if (whisperSound) whisperSound.setVolume(0);
  } catch (e) {}
  try {
    if (breathingSound) breathingSound.setVolume(0);
  } catch (e) {}
  breathingVol = 0;
  ringUntil = 0;
  try {
    if (earRingSound && earRingSound.isPlaying()) earRingSound.stop();
  } catch (e) {}
}

function drawDeathCam() {
  let t = constrain((millis() - deathStart) / DEATH_CAM_MS, 0, 1);

  let sx = killPos.px - camera.x + shakeX;
  let sy = killPos.py - camera.y + shakeY;

  // Spotlight the kill: dark everywhere, clear around the grab point.
  let g = drawingContext.createRadialGradient(sx, sy, 20, sx, sy, 250);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "rgba(8,0,0,0.94)");
  drawingContext.save();
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();

  // red flash that builds
  noStroke();
  fill(120, 0, 0, 30 + 110 * t);
  rect(0, 0, width, height);

  push();
  translate(-camera.x + shakeX, -camera.y + shakeY);
  imageMode(CENTER);

  // player turns to face his attacker
  let pAngle = atan2(killPos.vy - killPos.py, killPos.vx - killPos.px);
  push();
  translate(killPos.px, killPos.py);
  rotate(pAngle);
  if (playerImg && playerImg.width)
    image(playerImg, 0, 0, PLAYER_RADIUS * 2.4, PLAYER_RADIUS * 2.4);
  else {
    fill(220);
    ellipse(0, 0, PLAYER_RADIUS * 2);
  }
  pop();

  // vampire lunges in and grows as he strikes
  let lx = lerp(killPos.vx, killPos.px, 0.5 * t);
  let ly = lerp(killPos.vy, killPos.py, 0.5 * t);
  let vAngle = atan2(killPos.py - killPos.vy, killPos.px - killPos.vx);
  let vs = 25 * 2.4 * (1 + 0.5 * t);
  push();
  translate(lx, ly);
  rotate(vAngle);
  if (vampireImg && vampireImg.width) image(vampireImg, 0, 0, vs, vs);
  else {
    fill(150, 20, 20);
    ellipse(0, 0, vs);
  }
  pop();
  pop();

  if (t >= 1) gameState = "gameover";
}

// ---------------------------------------------------------------------
//  DRAWING — WORLD
// ---------------------------------------------------------------------
// The map is wider than the canvas, so only walk the tiles the camera can
// actually see. Two tiles of margin covers the screen-shake offset.
function visibleTiles() {
  const m = 2;
  return {
    c0: max(0, floor(camera.x / TILE_SIZE) - m),
    c1: min(mapCols - 1, floor((camera.x + width) / TILE_SIZE) + m),
    r0: max(0, floor(camera.y / TILE_SIZE) - m),
    r1: min(mapRows - 1, floor((camera.y + height) / TILE_SIZE) + m),
  };
}

function drawRoom() {
  if (!(tileMapData && tileMapData.tiles)) return;

  const v = visibleTiles();
  for (let row = v.r0; row <= v.r1; row++) {
    let line = tileMapData.tiles[row] || "";
    for (let col = v.c0; col <= v.c1; col++) {
      let x = col * TILE_SIZE;
      let y = row * TILE_SIZE;
      if (tileFloorImg) image(tileFloorImg, x, y, TILE_SIZE, TILE_SIZE);

      let ch = line[col] || ".";

      if (drawWallTile(ch, col, row, x, y)) {
        // walls and the gate — drawLitWalls() redraws these lit
      } else if (ch === ",") {
        drawTile(cyMossImg, x, y, 0, color(70, 96, 52));
      } else if (ch === "i") {
        drawTile(cyIvyImg, x, y, 0, color(52, 92, 44));
      } else if (ch === "a") {
        drawTile(roadAsphaltImg, x, y, 0, color(56, 58, 66));
      } else if (ch === "d") {
        drawTile(roadDashImg, x, y, 0, color(56, 58, 66));
      } else if (ch === "e") {
        drawTile(roadEdgeImg, x, y, 0, color(56, 58, 66));
      } else if (ch === "n") {
        // the same edge tile turned end for end, for the far side of the road
        drawTile(roadEdgeImg, x, y, PI, color(56, 58, 66));
      } else if (ch === "c") {
        drawTile(kerbImg, x, y, 0, color(88, 90, 96));
      } else if (ch === "f") {
        drawTile(vergeTuftImg, x, y, 0, color(46, 76, 44));
      } else if (ch === "r") {
        drawTile(roadDirtImg, x, y, 0, color(68, 54, 40));
      } else if (ch === "*") {
        drawBloodPuddle(x, y, col, row);
      } else if (ch === "X") {
        drawTile(gateImg, x, y, 0, color(90, 58, 30));
      } else if (drawPropTile(ch, x, y)) {
        // furniture and scenery — drawFurniture() redraws these lit
      } else if (ch === "1") {
        drawTile(carpetCornerImg, x, y, 0, color(120, 40, 40));
      } else if (ch === "4") {
        drawTile(carpetCornerImg, x, y, HALF_PI, color(120, 40, 40));
      } else if (ch === "5") {
        drawTile(carpetCornerImg, x, y, PI, color(120, 40, 40));
      } else if (ch === "6") {
        drawTile(carpetCornerImg, x, y, PI + HALF_PI, color(120, 40, 40));
      } else if (ch === "2") {
        drawTile(carpetMiddleImg, x, y, 0, color(120, 40, 40));
      } else if (ch === "3") {
        // carpettop, 0° — top edge, no rotation
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      } else if (ch === "7") {
        // carpettop, HALF_PI — right edge, rotated 90° clockwise
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        rotate(HALF_PI);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      } else if (ch === "8") {
        // carpettop, PI — bottom edge, rotated 180°
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        rotate(PI);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      } else if (ch === "9") {
        // carpettop, PI + HALF_PI — left edge, rotated 270°
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        rotate(PI + HALF_PI);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      }
    }
  }
}

// The lit pass over furniture and scenery. drawRoom() has already laid these
// down under the darkness as silhouettes; this repaints the ones the beam is
// actually on, at full brightness, above the overlay — so the occlusion
// boundary never shadows a sprite into a black cut-out at the cone's edge.
//
// Skipped during the tutorial: that room is built procedurally and has its own
// furniture, while tileMapData still points at the mansion. Without this guard
// the mansion's tables get painted at mansion coordinates inside the tutorial
// room, where nothing is solid, and you can walk straight through them.
function drawFurniture() {
  if (gameState === "tutorial") return;
  if (!(tileMapData && tileMapData.tiles)) return;

  const v = visibleTiles();
  for (let row = v.r0; row <= v.r1; row++) {
    let line = tileMapData.tiles[row] || "";
    for (let col = v.c0; col <= v.c1; col++) {
      let x = col * TILE_SIZE;
      let y = row * TILE_SIZE;
      let ch = line[col] || ".";

      if ("TDHGk#%~opqvtblPY".indexOf(ch) === -1) continue;

      if (!isInFlashlight(x + TILE_SIZE / 2, y + TILE_SIZE / 2, { x, y }))
        continue;

      drawPropTile(ch, x, y);
    }
  }
}

// Everything that sits on the floor rather than being part of it: the
// mansion's furniture and the courtyard's scenery.
//
// These are drawn twice. Once by drawRoom() underneath the darkness, which
// leaves a faint silhouette you can make out before you walk into it, and
// again by drawFurniture() once the beam reaches them, which lights them
// properly instead of leaving the black cut-out that a bare wall becomes.
// The under-darkness pass matters: every one of these blocks movement, so
// without it a table in an unlit room is an invisible wall.
//
// Returns false for anything it doesn't handle, so callers can chain on it.
function drawPropTile(ch, x, y) {
  if (ch === "T") drawTile(tableImg, x, y, 0, color(139, 90, 43));
  else if (ch === "D") drawTile(dinnertableImg, x, y, 0, color(101, 67, 33));
  else if (ch === "H") drawTile(chairbackImg, x, y, 0, color(90, 60, 40));
  else if (ch === "G") drawTile(signImg, x, y, 0, color(120, 100, 60));
  else if (ch === "k") drawTile(crateImg, x, y, 0, color(120, 76, 40));
  else if (ch === "#") drawTile(hedgeImg, x, y, 0, color(40, 84, 34));
  else if (ch === "%") drawTile(flowerBushImg, x, y, 0, color(48, 96, 40));
  else if (ch === "~") drawTile(poolImg, x, y, 0, color(30, 100, 118));
  // One quarter-tile rotated four ways makes the 2x2 well.
  else if (ch === "o") drawTile(wellImg, x, y, 0, color(120, 124, 120));
  else if (ch === "p") drawTile(wellImg, x, y, HALF_PI, color(120, 124, 120));
  else if (ch === "q") drawTile(wellImg, x, y, PI, color(120, 124, 120));
  else if (ch === "v")
    drawTile(wellImg, x, y, PI + HALF_PI, color(120, 124, 120));
  // Street scenery. The treeline is the level boundary rather than a built
  // wall, so it lives here with the rest of the solid props.
  else if (ch === "t") drawTile(roadTreeImg, x, y, 0, color(26, 48, 30));
  else if (ch === "b") drawTile(roadBushImg, x, y, 0, color(34, 62, 38));
  else if (ch === "l") drawTile(streetLampImg, x, y, 0, color(70, 74, 82));
  else if (ch === "P") drawTile(powerBoxImg, x, y, 0, color(150, 120, 40));
  else if (ch === "Y") drawTile(crossgraveImg, x, y, 0, color(120, 118, 110));
  else return false;
  return true;
}

// Pick the wall piece that matches which of the four neighbours are also wall.
// Rotations are measured off how the art was drawn: the corner joins right and
// down at 0, and the tee's stem points right at 0.
function autoWallPiece(up, right, down, left) {
  const n = (up ? 1 : 0) + (right ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0);

  if (n === 4) return { img: wallPlusImg, rot: 0 };

  if (n === 3) {
    if (!left) return { img: wallTeeImg, rot: 0 };
    if (!up) return { img: wallTeeImg, rot: HALF_PI };
    if (!right) return { img: wallTeeImg, rot: PI };
    return { img: wallTeeImg, rot: PI + HALF_PI };
  }

  if (n === 2) {
    if (up && down) return { img: wallVerticalImg, rot: 0 };
    if (left && right) return { img: wallHorizontalImg, rot: 0 };
    if (right && down) return { img: wallCornerImg, rot: 0 };
    if (down && left) return { img: wallCornerImg, rot: HALF_PI };
    if (left && up) return { img: wallCornerImg, rot: PI };
    return { img: wallCornerImg, rot: PI + HALF_PI }; // up && right
  }

  // A stub or a lone pillar: run it along whichever axis it connects on.
  if (up || down) return { img: wallVerticalImg, rot: 0 };
  return { img: wallHorizontalImg, rot: 0 };
}

// Anything off the edge of the map counts as open, so the outer wall of a room
// reads as a proper corner instead of sprouting arms into the void.
function isAutoWall(col, row) {
  if (!(tileMapData && tileMapData.tiles)) return false;
  if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) return false;
  return ((tileMapData.tiles[row] || "")[col] || ".") === "@";
}

function drawAutoWall(col, row, x, y) {
  const p = autoWallPiece(
    isAutoWall(col, row - 1),
    isAutoWall(col + 1, row),
    isAutoWall(col, row + 1),
    isAutoWall(col - 1, row),
  );
  drawTile(p.img, x, y, p.rot, color(100, 100, 170));
}

function drawTutorialWall(col, row, x, y) {
  const p = autoWallPiece(
    tutorialWallAt(col, row - 1),
    tutorialWallAt(col + 1, row),
    tutorialWallAt(col, row + 1),
    tutorialWallAt(col - 1, row),
  );
  drawTile(p.img, x, y, p.rot, color(100, 100, 170));
}

// Paint whichever wall piece a map character calls for. Shared by drawRoom(),
// which lays the walls down under the darkness, and drawLitWalls(), which
// repaints the ones the beam is on. Returns false for anything that is not a
// wall so callers can fall through to the floor and scenery cases.
function drawWallTile(ch, col, row, x, y) {
  if (ch === "@") {
    drawAutoWall(col, row, x, y);
    return true;
  }
  // The courtyard still uses the older explicit pieces: L/R/U/B are straights
  // and N/E/S/W are corners, each naming its own rotation. C is a legacy alias.
  const straight = { L: 0, U: HALF_PI, R: PI, B: PI + HALF_PI };
  const corner = { N: 0, E: HALF_PI, S: PI, W: PI + HALF_PI, C: 0 };
  if (ch in straight) {
    drawTile(tileWallImg, x, y, straight[ch], color(100, 100, 170));
    return true;
  }
  if (ch in corner) {
    drawTile(tileCornerImg, x, y, corner[ch], color(140, 120, 200));
    return true;
  }
  if (ch === "X") {
    drawTile(gateImg, x, y, 0, color(90, 58, 30));
    return true;
  }
  return false;
}

// The lit pass over walls, and the counterpart of drawFurniture().
//
// drawRoom() and drawTutorialRoom() lay the walls down before drawFog(), so the
// darkness overlay paints straight over them and a wall the player is staring
// at renders as flat black — indistinguishable from a hole in the world. That
// is what made the tutorial doorway look like it had a gap beneath it: the door
// draws its own glow above the fog, so it hung lit in an unlit wall.
//
// isInFlashlight() is given the tile as excludeWall for the same reason
// drawFurniture() does it: a solid tile occludes its own centre, so without the
// escape hatch no wall could ever light itself.
function drawLitWalls() {
  // Walls used to be redrawn here at full brightness for every tile the cone's
  // centre touched — a hard, per-tile on/off that read as chunky blocks. They're
  // now lit the same way the floor is: drawn under the fog (in drawRoom) and
  // revealed by the smooth light gradient, which the cone extends slightly past
  // occluders so wall faces fall inside it. Nothing to redraw on top.
  return;
}

function drawTile(img, x, y, rotationAngle, fallback) {
  push();
  translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
  if (rotationAngle) rotate(rotationAngle);
  if (img && img.width) {
    image(img, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  } else {
    noStroke();
    fill(fallback);
    rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  }
  pop();
}

function drawTutorialRoom() {
  for (let row = 0; row < TUT_ROWS; row++) {
    for (let col = 0; col < TUT_COLS; col++) {
      let x = TUT_X + col * TILE_SIZE;
      let y = TUT_Y + row * TILE_SIZE;
      if (tileFloorImg) image(tileFloorImg, x, y, TILE_SIZE, TILE_SIZE);
      if (tutorialWallAt(col, row)) drawTutorialWall(col, row, x, y);
    }
  }
  for (let tbl of tables)
    drawTile(tableImg, tbl.x, tbl.y, 0, color(139, 90, 43));
}

function drawKey() {
  if (keyItem.collected) return;
  if (!isInFlashlight(keyItem.x, keyItem.y)) return;
  push();
  translate(keyItem.x, keyItem.y);
  // soft pulsing glow so it stands out when the beam sweeps over it
  noStroke();
  let pulse = 0.5 + 0.5 * sin(millis() / 250);
  fill(255, 220, 90, 55 + 55 * pulse);
  ellipse(0, 0, 72 + 12 * pulse);
  imageMode(CENTER);
  if (keyImg && keyImg.width) image(keyImg, 0, 0, 58, 58);
  else {
    fill(240, 210, 80);
    ellipse(0, 0, 42);
  }
  pop();
}

// The exit is drawn above the darkness on purpose, so it reads as a beacon from
// across the room. On its own that left it hanging lit inside an unlit wall, and
// the blackness where the wall should be looked like a hole beneath the door.
// So the doorframe is lit with it: the wall tiles flanking the opening are
// painted whenever the door is, whether or not the beam is on them. The exit
// then reads as a door set into a wall instead of a door floating in a void.
function drawDoorFrame() {
  if (!door) return;
  const tall = max(1, round(door.h / TILE_SIZE));

  if (gameState === "tutorial") {
    const dc = round((door.x - TUT_X) / TILE_SIZE);
    const dr = round((door.y - TUT_Y) / TILE_SIZE);
    for (let col = dc - 1; col <= dc + 1; col++) {
      for (let row = dr - 1; row <= dr + tall; row++) {
        if (!tutorialWallAt(col, row)) continue;
        drawTutorialWall(
          col,
          row,
          TUT_X + col * TILE_SIZE,
          TUT_Y + row * TILE_SIZE,
        );
      }
    }
    return;
  }

  if (!(tileMapData && tileMapData.tiles)) return;
  const dc = floor(door.x / TILE_SIZE);
  const dr = floor(door.y / TILE_SIZE);
  for (let col = dc - 1; col <= dc + 1; col++) {
    for (let row = dr - 1; row <= dr + tall; row++) {
      const ch = (tileMapData.tiles[row] || "")[col];
      if (!ch || SOLID_CHARS.indexOf(ch) === -1) continue;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      // Built walls first; on the street the doorway is cut through the
      // treeline, which is scenery rather than a wall piece.
      if (!drawWallTile(ch, col, row, x, y)) drawPropTile(ch, x, y);
    }
  }
}

function drawDoor() {
  drawDoorFrame();

  push();
  let pulse = 0.5 + 0.5 * sin(millis() / 300);

  // Glow aura so the exit is obvious from across the room.
  noStroke();
  if (door.isOpen) fill(70, 220, 130, 70 + 70 * pulse);
  else fill(220, 60, 60, 70 + 70 * pulse);
  rect(door.x - 10, door.y - 10, door.w + 20, door.h + 20, 10);

  if (doorLeafImg && doorLeafImg.width) {
    // The leaf is drawn upright — planks vertical, knob on its right edge — but
    // every doorway in the game is a tall gap in a side wall, so each leaf gets
    // laid on its side. Turning it a quarter clockwise puts the knob on the
    // leaf's lower edge; mirroring that for the second leaf puts its knob on its
    // upper edge, so the two knobs meet on the join in the middle of the opening.
    const half = door.h / 2;
    const cx = door.x + door.w / 2;

    push();
    imageMode(CENTER);
    // Rotated, so the image's width runs down the opening and its height across.
    push();
    translate(cx, door.y + half / 2);
    rotate(HALF_PI);
    image(doorLeafImg, 0, 0, half, door.w);
    pop();

    push();
    translate(cx, door.y + half + half / 2);
    scale(1, -1); // mirror of the upper leaf, so it reads as a matched pair
    rotate(HALF_PI);
    image(doorLeafImg, 0, 0, half, door.w);
    pop();
    pop();

    // tint shows locked (red) vs unlocked (green)
    noStroke();
    if (door.isOpen) fill(60, 230, 120, 60);
    else fill(220, 50, 50, 75);
    rect(door.x, door.y, door.w, door.h);
  } else {
    fill(door.isOpen ? color(80, 200, 120) : color(200, 80, 80));
    rect(door.x, door.y, door.w, door.h, 4);
    if (!door.isOpen) {
      fill(120);
      rect(door.x + 8, door.y + door.h / 2, 8, 36, 4);
    }
  }
  pop();
}

function drawPlayer() {
  let angle = aimAngle;
  imageMode(CENTER);
  push();
  translate(player.x, player.y);
  rotate(angle);
  if (playerImg && playerImg.width)
    image(playerImg, 0, 0, player.r * 2.4, player.r * 2.4);
  else {
    noStroke();
    fill(220);
    ellipse(0, 0, player.r * 2);
  }
  pop();
}

// A few roadside boulders for level 3, placed off the main driving line so they
// read as cover/scenery. Purely visual (they don't collide) so they can never
// seal off the route or the key — say the word and I'll make them solid.
const BOULDER_SPOTS = [
  { x: 560, y: 300, s: 96 },
  { x: 1180, y: 660, s: 120 },
  { x: 1760, y: 300, s: 104 },
  { x: 2040, y: 640, s: 88 },
];
function drawBoulders() {
  if (currentLevel !== 2 || !boulderImg || !boulderImg.width) return;
  push();
  imageMode(CENTER);
  for (const b of BOULDER_SPOTS) {
    image(
      boulderImg,
      b.x,
      b.y,
      b.s,
      b.s * (boulderImg.height / boulderImg.width),
    );
  }
  pop();
}

function drawVampire() {
  const inCone = isInFlashlight(vampire.x, vampire.y);
  // A lightning strike throws his silhouette up for a split second wherever he
  // is, torch or no torch — one of the few looks you get at him in the storm.
  const revealed = millis() < lightningRevealUntil;
  // Standing in a lamp's pool also gives you a glimpse of him.
  const nearLamp = isVampireLampLit();
  if (!inCone && !revealed && !nearLamp) return;

  imageMode(CENTER);
  push();
  translate(vampire.x, vampire.y);
  rotate(atan2(player.y - vampire.y, player.x - vampire.x));
  if (!inCone && revealed) tint(120, 140, 175);
  if (vampireImg && vampireImg.width)
    image(vampireImg, 0, 0, vampire.r * 2.4, vampire.r * 2.4);
  else {
    noStroke();
    fill(!inCone && revealed ? color(30, 36, 48) : color(150, 20, 20));
    ellipse(0, 0, vampire.r * 2);
  }
  noTint();
  pop();
}

// ---------------------------------------------------------------------
//  LIGHTING (smooth, corner-aware visibility polygon + soft edge)
// ---------------------------------------------------------------------
// Walls close enough to cast a shadow this frame. Rebuilt once per frame and
// shared by the darkness overlay and by every isInFlashlight() test, which
// would otherwise each walk the whole wall list — that adds up fast in the
// courtyard, where a few hundred hedge tiles are all occluders.
let frameOccluders = [];

function getNearbyOccluders() {
  let list = [];
  let range = FLASHLIGHT_DISTANCE + TILE_SIZE;
  for (let w of lightWalls) {
    let nx = constrain(player.x, w.x, w.x + w.w);
    let ny = constrain(player.y, w.y, w.y + w.h);
    if (dist(player.x, player.y, nx, ny) <= range) list.push(w);
  }
  if (!door.isOpen) {
    let nx = constrain(player.x, door.x, door.x + door.w);
    let ny = constrain(player.y, door.y, door.y + door.h);
    if (dist(player.x, player.y, nx, ny) <= range) list.push(door);
  }
  return list;
}

// Sample angles (relative to aim direction) — a smooth fan plus rays aimed
// just past every nearby corner so the light wraps tightly around desks.
function buildLightDeltas(cx, cy, targetAngle, occluders) {
  let half = FLASHLIGHT_ANGLE / 2;
  let deltas = [-half, half];

  // A denser fan removes the faceting that made the cone edge and the shadows
  // behind the tables look blocky — the polygon now has enough vertices to read
  // as a smooth arc before the blur ever touches it.
  const fan = 120;
  for (let i = 0; i <= fan; i++)
    deltas.push(-half + FLASHLIGHT_ANGLE * (i / fan));

  // A slightly wider split around each corner keeps the shadow edge from
  // jittering frame to frame as the player moves — the old value was tight
  // enough that rounding put both sides of a corner on the same pixel.
  const eps = 0.0016;
  for (let o of occluders) {
    let corners = [
      [o.x, o.y],
      [o.x + o.w, o.y],
      [o.x, o.y + o.h],
      [o.x + o.w, o.y + o.h],
    ];
    for (let c of corners) {
      if (dist(cx, cy, c[0], c[1]) > FLASHLIGHT_DISTANCE + 4) continue;
      let d = angleDifference(atan2(c[1] - cy, c[0] - cx), targetAngle);
      if (d < -half - 0.02 || d > half + 0.02) continue;
      deltas.push(constrain(d, -half, half));
      deltas.push(constrain(d - eps, -half, half));
      deltas.push(constrain(d + eps, -half, half));
    }
  }
  deltas.sort((a, b) => a - b);
  return deltas;
}

function drawFog() {
  let overlay = drawDarknessOverlay();
  if (overlay) drawFlashlightGlow(overlay.pts, overlay.cx, overlay.cy);
}

function drawDarknessOverlay() {
  let cxw = player.x,
    cyw = player.y;
  let targetAngle = aimAngle;

  // Darker ambient overall. This stays constant during a flicker so only the
  // flashlight beam drops out — the room doesn't go pitch black. A lightning
  // strike briefly thins it so the whole scene is revealed for the flash.
  const flash = stormActive || levelIntroKind ? lightningBrightness() : 0;
  const FOG_ALPHA = 248 - 172 * flash;

  fogLayer.clear();
  fogLayer.noStroke();
  fogLayer.fill(0, FOG_ALPHA);
  fogLayer.rect(0, 0, fogLayer.width, fogLayer.height);

  let ctx = fogLayer.drawingContext;

  // Lamps ALWAYS reveal their pool of the scene — they're independent of the
  // flashlight, so holding SHIFT (the torch) does not turn them on or off.
  carveLampReveals(ctx);

  if (!lightOn) {
    image(fogLayer, 0, 0); // torch off — lamps still lit, rest stays dark
    return null;
  }

  let occ = frameOccluders;
  let deltas = buildLightDeltas(cxw, cyw, targetAngle, occ);

  let pts = [];
  for (let d of deltas) {
    const ang = targetAngle + d;
    let p = traceRay(cxw, cyw, ang, occ);
    // Extend the cone a little PAST whatever it hits so a wall's face is caught
    // inside the smooth light gradient, instead of being redrawn as a flat,
    // full-bright block on top (which read as chunky). Overshoot is under one
    // tile, so it lights the wall surface without spilling into the next room.
    const hd = dist(cxw, cyw, p.x, p.y);
    const ext = min(hd + 30, FLASHLIGHT_DISTANCE);
    pts.push({
      x: cxw + cos(ang) * ext - camera.x,
      y: cyw + sin(ang) * ext - camera.y,
    });
  }
  let cx = cxw - camera.x,
    cy = cyw - camera.y;

  // Carve the lit cone out of the fog. Instead of punching a hard hole (which
  // read as flat, blocky lit tiles), we remove fog with a radial gradient: fully
  // clear right around the player, tapering to nothing at the torch's reach. The
  // result is a soft, gradual pool of light that fades into the dark, and a
  // blurred cone edge. Filling the occlusion polygon with the gradient keeps the
  // shadows behind real walls intact.
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.filter = "blur(8px)";
  let carve = ctx.createRadialGradient(cx, cy, 0, cx, cy, FLASHLIGHT_DISTANCE);
  carve.addColorStop(0.0, "rgba(0,0,0,1)");
  carve.addColorStop(0.45, "rgba(0,0,0,0.98)");
  carve.addColorStop(0.72, "rgba(0,0,0,0.72)");
  carve.addColorStop(0.9, "rgba(0,0,0,0.32)");
  carve.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = carve;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let p of pts) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  image(fogLayer, 0, 0);

  return { pts, cx, cy };
}

// Carve a soft circle of the fog away at every lit/dying lamp, in the same fog
// buffer as the torch, so a lamp actually reveals the ground (and anything on
// it) around itself rather than just laying a glow over the dark.
function carveLampReveals(ctx) {
  if (currentLevel !== 2 || !lamps || lamps.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.filter = "blur(10px)";
  for (const L of lamps) {
    if (L.state === "dead") continue;
    const k = L.state === "dying" ? 0.55 : 1; // guttering lamps reveal less
    const sx = L.x - camera.x,
      sy = L.y - camera.y;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, LAMP_RADIUS);
    g.addColorStop(0.0, `rgba(0,0,0,${0.85 * k})`);
    g.addColorStop(0.5, `rgba(0,0,0,${0.6 * k})`);
    g.addColorStop(0.82, `rgba(0,0,0,${0.28 * k})`);
    g.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, LAMP_RADIUS, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

// Is the hunter standing inside a lamp's pool? If so he's briefly glimpseable
// even when your torch is elsewhere — the whole point of the lamps.
function isVampireLampLit() {
  if (currentLevel !== 2 || !lamps) return false;
  for (const L of lamps) {
    if (L.state === "dead") continue;
    if (dist(vampire.x, vampire.y, L.x, L.y) <= LAMP_RADIUS * 0.92) return true;
  }
  return false;
}

function drawFlashlightGlow(pts, cx, cy) {
  // Warm radial glow clipped to the same polygon.
  let g = drawingContext.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    FLASHLIGHT_DISTANCE,
  );
  g.addColorStop(0, "rgba(255, 226, 150, 0.22)");
  g.addColorStop(0.5, "rgba(255, 210, 120, 0.10)");
  g.addColorStop(1, "rgba(255, 200, 100, 0.0)");
  drawingContext.save();
  drawingContext.fillStyle = g;
  drawingContext.beginPath();
  drawingContext.moveTo(cx, cy);
  for (let p of pts) drawingContext.lineTo(p.x, p.y);
  drawingContext.closePath();
  drawingContext.fill();
  drawingContext.restore();
}

function traceRay(startX, startY, angle, occluders) {
  let rayX = cos(angle),
    rayY = sin(angle);
  let closestDist = FLASHLIGHT_DISTANCE;
  let list = occluders || lightWalls;
  for (let wall of list) {
    let hit = rayAABBIntersection(startX, startY, rayX, rayY, wall);
    if (hit && hit.dist < closestDist) closestDist = hit.dist;
  }
  return { x: startX + rayX * closestDist, y: startY + rayY * closestDist };
}

function rayAABBIntersection(startX, startY, dirX, dirY, wall) {
  let tMin = 0,
    tMax = FLASHLIGHT_DISTANCE;
  if (abs(dirX) > 0.001) {
    let t1 = (wall.x - startX) / dirX;
    let t2 = (wall.x + wall.w - startX) / dirX;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = max(tMin, t1);
    tMax = min(tMax, t2);
  } else if (startX < wall.x || startX > wall.x + wall.w) {
    return null;
  }
  if (abs(dirY) > 0.001) {
    let t1 = (wall.y - startY) / dirY;
    let t2 = (wall.y + wall.h - startY) / dirY;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = max(tMin, t1);
    tMax = min(tMax, t2);
  } else if (startY < wall.y || startY > wall.y + wall.h) {
    return null;
  }
  if (tMin <= tMax && tMin > 0.1) return { dist: tMin };
  return null;
}

function isInFlashlight(x, y, excludeWall) {
  if (!lightOn) return false;
  let targetAngle = aimAngle;
  let pointAngle = atan2(y - player.y, x - player.x);
  let angleDiff = abs(angleDifference(pointAngle, targetAngle));
  let distance = dist(player.x, player.y, x, y);
  if (distance >= FLASHLIGHT_DISTANCE || angleDiff >= FLASHLIGHT_ANGLE / 2)
    return false;

  // Only walls near enough to matter — see frameOccluders above.
  const list = frameOccluders.length ? frameOccluders : lightWalls;
  for (let wall of list) {
    // A solid occluder checking its own visibility would otherwise always
    // block itself, since the test point sits at its own tile's center.
    if (excludeWall && wall.x === excludeWall.x && wall.y === excludeWall.y)
      continue;
    if (isLineRectIntersecting(player.x, player.y, x, y, wall)) return false;
  }
  if (!door.isOpen && isLineRectIntersecting(player.x, player.y, x, y, door))
    return false;
  return true;
}

function isLineRectIntersecting(x1, y1, x2, y2, wall) {
  if (lineIntersect(x1, y1, x2, y2, wall.x, wall.y, wall.x + wall.w, wall.y))
    return true;
  if (
    lineIntersect(
      x1,
      y1,
      x2,
      y2,
      wall.x,
      wall.y + wall.h,
      wall.x + wall.w,
      wall.y + wall.h,
    )
  )
    return true;
  if (lineIntersect(x1, y1, x2, y2, wall.x, wall.y, wall.x, wall.y + wall.h))
    return true;
  if (
    lineIntersect(
      x1,
      y1,
      x2,
      y2,
      wall.x + wall.w,
      wall.y,
      wall.x + wall.w,
      wall.y + wall.h,
    )
  )
    return true;
  if (
    x1 >= wall.x &&
    x1 <= wall.x + wall.w &&
    y1 >= wall.y &&
    y1 <= wall.y + wall.h
  )
    return true;
  if (
    x2 >= wall.x &&
    x2 <= wall.x + wall.w &&
    y2 >= wall.y &&
    y2 <= wall.y + wall.h
  )
    return true;
  return false;
}

function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  let denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (abs(denom) < 0.0001) return false;
  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff < -PI) diff += TWO_PI;
  while (diff > PI) diff -= TWO_PI;
  return diff;
}

// ---------------------------------------------------------------------
//  SCREENS / UI
// ---------------------------------------------------------------------
// The title sequence. It opens on black and builds in four overlapping beats:
// the blood mist bleeds up, the logo swells into place while stuttering like a
// failing bulb, the tagline types itself out, and the prompt fades in last.
// Once settled it never fully stops moving — the logo breathes and the mist
// drifts — so the screen reads as alive rather than as a static image.
//
// Timings are in milliseconds from startAnimAt. Nothing here gates input:
// SPACE works from the first frame, so the animation can never trap a player
// who has seen it before.
const TITLE_MIST_IN = 200;
const TITLE_LOGO_AT = 500;
const TITLE_LOGO_MS = 1700;
const TITLE_CAPTION_AT = 1800;
const TITLE_CAPTION_MS = 1100;
const TITLE_PROMPT_AT = 3000;
const TITLE_PROMPT_MS = 700;

// Hard dropouts during the logo reveal, as offsets from TITLE_LOGO_AT. Short
// and irregular so it reads as a dying filament rather than a repeating loop.
const TITLE_STUTTER = [
  [560, 625],
  [780, 815],
  [1180, 1225],
];

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

// ---------------------------------------------------------------------
//  TITLE MENU  (animated haunted-manor scene + carved-stone buttons)
// ---------------------------------------------------------------------
// The "HEAR NO EVIL" reveal still plays over the top, but the screen it settles
// onto is now alive: a storm-lit manor across a dead forest, bats wheeling over
// the roofline, rain falling, and something with one red eye watching from a
// far window. Two stone buttons drop the player into the game or the how-to.

let menuButtons = []; // rebuilt each frame: {x,y,w,h,label,hot,action}
let nextMenuFlashAt = 0;

function ensureMenuScene() {
  if (menuBats.length === 0) {
    for (let i = 0; i < 9; i++) {
      menuBats.push({
        cx: random(0.15, 0.85), // orbit centre as a fraction of the window
        cy: random(0.1, 0.46),
        rx: random(60, 190),
        ry: random(24, 74),
        spd: random(0.4, 1.0) * (random() < 0.5 ? 1 : -1),
        ph: random(TWO_PI),
        sz: random(12, 22),
        flap: random(6, 10),
      });
    }
  }
  if (rainDrops.length === 0) buildRain();
}

function updateMenuStorm() {
  const now = millis();
  if (now >= nextMenuFlashAt) {
    nextMenuFlashAt = now + random(7000, 13000);
    // Distant silent sheet-lightning only — no thunder on the menu.
    triggerLightning(random(0.35, 0.6), random(200, 320), 0);
  }
}

function drawMenuScene(t) {
  const ctx = drawingContext;

  // sky
  let sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#05070f");
  sky.addColorStop(0.6, "#0a0d18");
  sky.addColorStop(1, "#12101a");
  ctx.save();
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // moon (crescent), high on the right
  noStroke();
  const mx = width * 0.78,
    my = height * 0.19,
    mr = min(width, height) * 0.05;
  fill(210, 214, 225, 34);
  ellipse(mx, my, mr * 3.4);
  fill(226, 229, 236);
  ellipse(mx, my, mr * 2);
  fill(10, 12, 22);
  ellipse(mx + mr * 0.55, my - mr * 0.35, mr * 1.7);

  // distant forest photo, cool-tinted, along the lower half for depth
  if (bgforestImg && bgforestImg.width) {
    const iw = width;
    const ih = width * (bgforestImg.height / bgforestImg.width);
    push();
    tint(64, 74, 104, 205);
    imageMode(CORNER);
    image(bgforestImg, 0, height - ih * 0.92, iw, ih);
    pop();
    noTint();
  }
  // a soft darken so the manor and text carry
  noStroke();
  fill(4, 6, 12, 120);
  rect(0, 0, width, height);

  drawManor(t);

  // rain over the scene
  drawRain();

  // bats wheeling across the sky
  for (const b of menuBats) {
    b.ph += 0.02 * b.spd;
    const x = width * b.cx + cos(b.ph) * b.rx;
    const y = height * b.cy + sin(b.ph) * b.ry;
    drawBat(
      x,
      y,
      b.sz,
      (millis() / 1000) * b.flap + b.ph,
      color(8, 6, 12, 235),
    );
  }
}

// A procedural haunted manor: main hall, gabled roof, two flanking towers, a
// scatter of dim flickering windows, and one dark window on the right tower
// where a single red eye watches and pulses.
function drawManor(t) {
  const ctx = drawingContext;
  push();
  noStroke();
  const gx = width / 2;
  const baseY = height * 0.74;
  const mw = min(width * 0.5, 560);
  const mh = mw * 0.5;
  const dark = color(6, 7, 12);

  // main block
  fill(dark);
  rect(gx - mw / 2, baseY - mh, mw, mh);
  // gabled roof
  triangle(
    gx - mw / 2 - 12,
    baseY - mh,
    gx + mw / 2 + 12,
    baseY - mh,
    gx,
    baseY - mh - mh * 0.52,
  );
  // two towers
  for (const s of [-1, 1]) {
    const tx = gx + s * mw * 0.42;
    const tw = mw * 0.16,
      th = mh * 1.4;
    fill(dark);
    rect(tx - tw / 2, baseY - th, tw, th);
    triangle(
      tx - tw / 2 - 5,
      baseY - th,
      tx + tw / 2 + 5,
      baseY - th,
      tx,
      baseY - th - tw * 1.1,
    );
  }

  // dim amber windows that flicker independently
  const wins = [
    [gx - mw * 0.24, baseY - mh * 0.62],
    [gx + mw * 0.02, baseY - mh * 0.62],
    [gx - mw * 0.24, baseY - mh * 0.3],
    [gx + mw * 0.02, baseY - mh * 0.3],
    [gx - mw * 0.42, baseY - mh * 0.95], // left tower
  ];
  for (let i = 0; i < wins.length; i++) {
    const fl = 0.45 + 0.55 * noise(millis() / 520 + i * 4.1);
    fill(190, 126, 52, 150 * fl);
    rect(wins[i][0] - 7, wins[i][1] - 11, 14, 22, 2);
  }

  // the watcher — two glowing red eyes on the RIGHT, as if he's standing in the
  // dark watching you. A faint shade behind them so they read as a presence.
  menuVampEye = lerp(menuVampEye, 0.6 + 0.4 * sin(millis() / 620), 0.08);
  const wx = width * 0.86,
    wy = height * 0.46,
    wsep = 30;
  const figG = ctx.createRadialGradient(wx, wy + 30, 0, wx, wy + 30, 170);
  figG.addColorStop(0, "rgba(6,3,8,0.6)");
  figG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.fillStyle = figG;
  ctx.beginPath();
  ctx.ellipse(wx, wy + 55, 55, 155, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
  for (const s of [-1, 1]) {
    const gx = wx + s * wsep;
    const eg = ctx.createRadialGradient(gx, wy, 0, gx, wy, 40);
    eg.addColorStop(0, `rgba(255,30,30,${0.85 * menuVampEye})`);
    eg.addColorStop(0.5, `rgba(200,0,0,${0.28 * menuVampEye})`);
    eg.addColorStop(1, "rgba(120,0,0,0)");
    ctx.save();
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(gx, wy, 40, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
    // an almond eye, angled into a glare, glowing (no pupil)
    push();
    translate(gx, wy);
    rotate(s * -0.16);
    noStroke();
    fill(255, 44, 32, 235 * menuVampEye);
    ellipse(0, 0, 27, 12);
    fill(255, 130, 100, 220 * menuVampEye);
    ellipse(0, 0, 12, 6);
    pop();
  }
  pop();
}

function drawMenu() {
  ensureMenuScene();
  const t = millis() - startAnimAt;

  drawMenuScene(t);

  // keep menu music a low, muffled ambiance (reset to the deaf in-game level
  // the instant play begins)
  if (menuAudioOn && musicReady && bgMusic) {
    try {
      bgMusic.setVolume(0.05);
    } catch (e) {}
  }
  updateMenuStorm();

  // --- logo reveal (reuses the original beats) ----------------------------
  const lp = constrain((t - TITLE_LOGO_AT) / TITLE_LOGO_MS, 0, 1);
  const lg = easeOutCubic(lp);
  let bulb = 1;
  if (lp > 0 && lp < 1) {
    for (const [a, b] of TITLE_STUTTER)
      if (t > TITLE_LOGO_AT + a && t < TITLE_LOGO_AT + b) bulb = 0.18;
  } else if (lp >= 1) bulb = 0.9 + 0.1 * noise(millis() / 500);

  let logoBottom = height * 0.4;
  if (lp > 0 && splashImg && splashImg.width) {
    const fit = min(
      (width * 0.5) / splashImg.width,
      (height * 0.32) / splashImg.height,
    );
    const breathe = lp >= 1 ? 1 + 0.007 * sin(millis() / 1600) : 1;
    const grow = (1.14 - 0.14 * lg) * breathe;
    const w = splashImg.width * fit * grow;
    const h = splashImg.height * fit * grow;
    const cx = width / 2;
    const cy = height * 0.29;
    logoBottom = cy + h / 2;
    const ctx = drawingContext;
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, max(w, h) * 0.62);
    bloom.addColorStop(0, `rgba(150,10,10,${0.5 * lg * bulb})`);
    bloom.addColorStop(0.55, `rgba(90,0,0,${0.22 * lg * bulb})`);
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    push();
    imageMode(CENTER);
    tint(255, 255 * lg * bulb);
    image(splashImg, cx, cy, w, h);
    pop();
    noTint();
  }

  // --- tagline -------------------------------------------------------------
  textAlign(CENTER, CENTER);
  const CAPTION = "you cannot hear what hunts you";
  const cp = constrain((t - TITLE_CAPTION_AT) / TITLE_CAPTION_MS, 0, 1);
  if (cp > 0) {
    const shown = CAPTION.slice(0, ceil(cp * CAPTION.length));
    textFont("monospace");
    textSize(max(15, min(22, width * 0.014)));
    fill(170, 40, 40);
    text(shown, width / 2, logoBottom + 28);
  }
  // --- stone buttons (fade in once the reveal has settled) -----------------
  const bp = constrain((t - (TITLE_PROMPT_AT + 200)) / 700, 0, 1);
  menuButtons = [];
  const bw = min(300, width * 0.44),
    bh = 62,
    gap = 22;
  const bx = width / 2 - bw / 2;
  let by = logoBottom + 66;
  const defs = [
    { label: "PLAY GAME", action: startGame },
    {
      label: "HOW TO PLAY",
      action: () => {
        gameState = "howto";
      },
    },
  ];
  for (const d of defs) {
    const b = {
      x: bx,
      y: by,
      w: bw,
      h: bh,
      label: d.label,
      action: d.action,
      hot:
        mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh,
    };
    menuButtons.push(b);
    if (bp > 0) drawStoneButton(b, bp);
    by += bh + gap;
  }

  drawLightning(); // the menu storm's flashes sit above everything
  textAlign(LEFT, BASELINE);
}

// A carved, mottled stone slab with a chiselled bevel, a cracked outer edge,
// and a label in the horror face with a red under-glow that brightens on hover.
function drawStoneButton(b, a) {
  push();
  const r = 10;
  const base = b.hot ? color(98, 94, 106) : color(74, 72, 84);
  noStroke();
  fill(red(base), green(base), blue(base), 255 * a);
  rect(b.x, b.y, b.w, b.h, r);

  // mottled patches (deterministic so they don't crawl)
  for (let i = 0; i < 11; i++) {
    const px = b.x + ((i * 53) % (b.w - 18)) + 9;
    const py = b.y + ((i * 29) % (b.h - 14)) + 7;
    fill(0, 0, 0, 22 * a);
    ellipse(px, py, 14 + (i % 3) * 6, 9 + (i % 2) * 5);
  }

  // bevel: light top-left, dark bottom-right
  strokeWeight(2);
  stroke(152, 150, 162, 150 * a);
  line(b.x + r, b.y + 1, b.x + b.w - r, b.y + 1);
  line(b.x + 1, b.y + r, b.x + 1, b.y + b.h - r);
  stroke(18, 16, 22, 190 * a);
  line(b.x + r, b.y + b.h - 1, b.x + b.w - r, b.y + b.h - 1);
  line(b.x + b.w - 1, b.y + r, b.x + b.w - 1, b.y + b.h - r);

  // cracked outer edge
  noFill();
  stroke(12, 10, 14, 220 * a);
  strokeWeight(2);
  rect(b.x, b.y, b.w, b.h, r);

  // label
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(TITLE_FONT);
  textSize(30);
  fill(180, 30, 30, (b.hot ? 210 : 120) * a); // red under-glow
  text(b.label, b.x + b.w / 2 + 1, b.y + b.h / 2 + 2);
  fill(b.hot ? 242 : 214, b.hot ? 226 : 205, b.hot ? 220 : 200, 255 * a);
  text(b.label, b.x + b.w / 2, b.y + b.h / 2);
  textFont("monospace");
  pop();
  textAlign(LEFT, BASELINE);
}

// ---------------------------------------------------------------------
//  HOW TO PLAY  (stone panel over a dimmed version of the menu scene)
// ---------------------------------------------------------------------
function drawHowTo() {
  ensureMenuScene();
  drawMenuScene(millis() - startAnimAt);
  if (menuAudioOn && musicReady && bgMusic) {
    try {
      bgMusic.setVolume(0.05);
    } catch (e) {}
  }
  updateMenuStorm();

  push();
  noStroke();
  fill(0, 175);
  rect(0, 0, width, height);

  const pw = min(700, width * 0.88),
    ph = min(520, height * 0.86);
  const px = width / 2 - pw / 2,
    py = height / 2 - ph / 2;
  fill(54, 52, 62, 240);
  rect(px, py, pw, ph, 14);
  for (let i = 0; i < 42; i++) {
    fill(0, 0, 0, 16);
    ellipse(
      px + 14 + ((i * 71) % (pw - 28)),
      py + 14 + ((i * 47) % (ph - 28)),
      10 + (i % 4) * 6,
      8 + (i % 3) * 4,
    );
  }
  stroke(14, 12, 16, 230);
  strokeWeight(3);
  noFill();
  rect(px, py, pw, ph, 14);
  noStroke();

  textAlign(CENTER, TOP);
  textFont(TITLE_FONT);
  fill(190, 40, 40);
  textSize(46);
  text("HOW TO PLAY", width / 2, py + 22);

  textAlign(LEFT, TOP);
  textFont("monospace");
  const lx = px + 32;
  let ly = py + 96;
  const lines = [
    ["MOVE", "WASD or the arrow keys."],
    [
      "LOOK",
      "Your cursor aims a narrow flashlight. Everything outside it is black.",
    ],
    [
      "FREEZE HIM",
      "Catch him in your beam and he stops. Look away and he closes in.",
    ],
    [
      "THE KEY",
      "Find the glowing key, then reach the glowing doorway to escape.",
    ],
  ];
  const keyW = 118;
  for (const [k, v] of lines) {
    fill(212, 150, 62);
    textSize(15);
    text(k, lx, ly + 2);
    fill(222);
    textSize(15);
    text(v, lx + keyW, ly, pw - keyW - 56);
    ly += 50;
  }
  pop();

  // back button
  const bw2 = 190,
    bh2 = 52;
  const bx2 = width / 2 - bw2 / 2,
    by2 = py + ph - 66;
  const bb = {
    x: bx2,
    y: by2,
    w: bw2,
    h: bh2,
    label: "BACK",
    hot:
      mouseX >= bx2 &&
      mouseX <= bx2 + bw2 &&
      mouseY >= by2 &&
      mouseY <= by2 + bh2,
    action: () => {
      gameState = "start";
    },
  };
  menuButtons = [bb];
  drawStoneButton(bb, 1);
  drawLightning();
}

// ---------------------------------------------------------------------
//  AIM  (dead-zone + smoothing so the beam never whips near the body)
// ---------------------------------------------------------------------
function updateAim() {
  if (!player) return;
  const mx = mouseX + camera.x,
    my = mouseY + camera.y;
  const dx = mx - player.x,
    dy = my - player.y;
  const d = Math.hypot(dx, dy);
  aimClamped = d < MIN_AIM_DIST;
  if (!aimClamped) {
    const target = atan2(dy, dx);
    // shortest-path smoothing so the beam glides instead of snapping
    aimAngle += angleDifference(target, aimAngle) * 0.55;
  }
  // inside the dead-zone the aim simply holds its last direction — no whip.
}

// A ring at the dead-zone radius: barely-there warm circle normally, red broken
// arcs while the cursor is inside it (a clear "pull back out" cue).
function drawAimRing() {
  if (!player) return;
  if (gameState !== "play" && gameState !== "tutorial") return;
  push();
  translate(player.x, player.y);
  noFill();
  if (aimClamped) {
    const pulse = 0.5 + 0.5 * sin(millis() / 220);
    stroke(232, 70, 70, 95 + 55 * pulse);
    strokeWeight(2.2);
    for (let a = 0; a < TWO_PI; a += 0.5)
      arc(0, 0, MIN_AIM_DIST * 2, MIN_AIM_DIST * 2, a, a + 0.28);
  } else {
    stroke(255, 236, 192, 16);
    strokeWeight(1.5);
    ellipse(0, 0, MIN_AIM_DIST * 2);
  }
  pop();
}

function drawTutorialIntro() {
  push();
  noStroke();
  fill(0, 150);
  rect(0, 0, width, height);

  let bw = 600,
    bh = 240;
  let bx = width / 2 - bw / 2,
    by = height / 2 - bh / 2;
  fill(45);
  stroke(95);
  strokeWeight(2);
  rect(bx, by, bw, bh, 10);
  noStroke();

  textAlign(CENTER, CENTER);
  textFont("monospace");
  fill(255);
  textSize(25);
  text("Find the key to escape", width / 2, by + 58);
  text("and remember to watch your back", width / 2, by + 94);

  fill(190);
  textSize(15);
  text(
    "WASD to move   •   move your cursor to aim the light",
    width / 2,
    by + 150,
  );

  let a = 150 + 105 * sin(millis() / 400);
  fill(215, 215, 215, a);
  text("press SPACE or click to continue", width / 2, by + 195);
  pop();
  textAlign(LEFT, BASELINE);
}

function drawTutorialUI() {
  if (!tutorialIntroDismissed) return;
  noStroke();
  textFont("monospace");
  fill(255, 210);
  textSize(22);
  textAlign(CENTER, BASELINE);
  text("WASD to move and cursor to see", width / 2, height - 26);
  textAlign(LEFT, BASELINE);
}

function drawUI() {
  push();
  // --- top-left icon bar, pulled in and enlarged ---
  const pad = 18;
  noStroke();
  fill(0, 120);
  rect(pad, pad, 184, 58, 10);
  drawWasdIcon(pad + 10, pad + 12, 0.8);
  drawCursorIcon(pad + 74, pad + 16);
  drawKeyHudIcon(pad + 150, pad + 29, player.hasKey);
  pop();

  // --- level name / number, centred and small ---
  push();
  noStroke();
  textFont("monospace");
  textAlign(CENTER, TOP);
  fill(202, 202, 212, 205);
  textSize(14);
  text(
    LEVELS[currentLevel].name +
      "   " +
      (currentLevel + 1) +
      " / " +
      LEVELS.length,
    width / 2,
    20,
  );
  pop();

  // --- one short contextual line along the bottom (offset to clear the map) ---
  push();
  noStroke();
  textFont("monospace");
  textAlign(CENTER, BASELINE);
  fill(255, 190);
  textSize(14);
  let msg;
  if (currentLevel === 1 && !player.hasKey)
    msg = "Watch your footing — the blood will drop your torch.";
  else if (!player.hasKey)
    msg = "Find the glowing key. The locked door burns red.";
  else msg = "Door open — slip through the green gap to escape.";
  text(msg, width / 2 + 60, height - 22);
  pop();
  textAlign(LEFT, BASELINE);

  // Level 3 extras: the dying-torch battery over the player
  drawBatteryHud();

  // Key status (all levels), the level-3 torch on/off readout, and the
  // persistent WASD reminder.
  drawKeyStatusHud();
  drawFlashlightStateIcon();
  drawWasdReminder();
}

// Four little keycaps: W on top, A S D beneath.
function drawWasdIcon(x, y, sc) {
  push();
  translate(x, y);
  const k = 15 * sc,
    g = 3 * sc;
  const cap = (cx, cy, ch) => {
    noStroke();
    fill(60, 60, 70);
    rect(cx, cy, k, k, 3);
    stroke(120, 120, 140);
    strokeWeight(1);
    noFill();
    rect(cx, cy, k, k, 3);
    noStroke();
    fill(225);
    textAlign(CENTER, CENTER);
    textFont("monospace");
    textSize(9 * sc);
    text(ch, cx + k / 2, cy + k / 2 + 1);
  };
  cap(k + g, 0, "W");
  cap(0, k + g, "A");
  cap(k + g, k + g, "S");
  cap(2 * (k + g), k + g, "D");
  pop();
  textAlign(LEFT, BASELINE);
}

// A little arrow pointer with a couple of motion arcs.
function drawCursorIcon(x, y) {
  push();
  translate(x, y);
  fill(230);
  stroke(40);
  strokeWeight(1);
  beginShape();
  vertex(0, 0);
  vertex(0, 16);
  vertex(4, 12);
  vertex(7, 18);
  vertex(9, 17);
  vertex(6, 11);
  vertex(11, 11);
  endShape(CLOSE);
  noFill();
  stroke(200, 200, 210, 160);
  strokeWeight(1.4);
  arc(3, 8, 26, 26, -0.7, 0.5);
  pop();
}

// The key: full colour when held, greyed with a red cross when not.
function drawKeyHudIcon(x, y, has) {
  push();
  imageMode(CENTER);
  translate(x, y);
  if (keyImg && keyImg.width) {
    if (!has) tint(150, 150, 150);
    image(keyImg, 0, 0, 42, 42); // bigger key
    noTint();
  } else {
    noStroke();
    fill(has ? color(240, 210, 80) : color(120));
    ellipse(0, 0, 28);
  }
  if (!has) {
    stroke(222, 40, 40);
    strokeWeight(2.2); // thinner
    line(-9, -9, 9, 9); // smaller cross
    line(9, -9, -9, 9);
  }
  pop();
}

// Top-right key-status readout: green "KEY OBTAINED" with a checkmark badge
// once picked up, a greyed-out placeholder before that. Separate from the
// small key icon in the top-left control bar — this one reads at a glance.
function drawKeyStatusHud() {
  if (gameState !== "play") return;
  const has = player.hasKey;
  const pw = 190,
    ph = 40;
  const x = width - pw - 18,
    y = 68;
  push();
  noStroke();
  fill(0, 120);
  rect(x, y, pw, ph, 10);

  push();
  imageMode(CENTER);
  translate(x + 28, y + ph / 2);
  if (keyImg && keyImg.width) {
    tint(has ? color(150, 235, 170) : color(130, 130, 138));
    image(keyImg, 0, 0, 28, 28);
    noTint();
  } else {
    noStroke();
    fill(has ? color(90, 220, 130) : color(120));
    ellipse(0, 0, 22);
  }
  if (has) {
    // small green checkmark badge, bottom-right of the key icon
    translate(9, 8);
    noStroke();
    fill(60, 200, 110);
    ellipse(0, 0, 16, 16);
    stroke(255);
    strokeWeight(2);
    noFill();
    line(-4, 0, -1, 3);
    line(-1, 3, 4, -4);
  }
  pop();

  textAlign(LEFT, CENTER);
  textFont("monospace");
  textSize(13);
  fill(has ? color(90, 230, 130) : color(150));
  text(has ? "KEY OBTAINED" : "NO KEY YET", x + 50, y + ph / 2);
  pop();
  textAlign(LEFT, BASELINE);
}

// Level 3 only: a small torch icon showing whether the manually-toggled
// light is currently on (bright, glowing) or off (flat grey).
function drawFlashlightStateIcon() {
  if (currentLevel !== 2 || gameState !== "play") return;
  const on = lightOn;
  const pw = 130,
    ph = 40;
  const x = width - pw - 18,
    y = 118;
  push();
  noStroke();
  fill(0, 120);
  rect(x, y, pw, ph, 10);

  push();
  translate(x + 27, y + ph / 2);
  rotate(-0.4);
  noStroke();
  // beam
  fill(on ? color(255, 225, 140, 150) : color(110, 110, 118, 60));
  beginShape();
  vertex(6, -3);
  vertex(18, -9);
  vertex(18, 9);
  vertex(6, 3);
  endShape(CLOSE);
  // flared head
  fill(on ? color(230, 230, 238) : color(110, 110, 118));
  beginShape();
  vertex(0, -6);
  vertex(7, -5);
  vertex(7, 5);
  vertex(0, 6);
  endShape(CLOSE);
  // body / handle
  fill(on ? color(165, 165, 176) : color(80, 80, 90));
  rect(-10, -4, 10, 8, 2);
  pop();

  textAlign(LEFT, CENTER);
  textFont("monospace");
  textSize(13);
  fill(on ? color(255, 225, 140) : color(150));
  text(on ? "LIGHT: ON" : "LIGHT: OFF", x + 45, y + ph / 2);
  pop();
  textAlign(LEFT, BASELINE);
}

// Small always-on-screen WASD reminder, tucked just above the minimap
// (bottom-left) so it doesn't cover it. Reuses the same keycap icon the
// top-left control bar already draws, just smaller and standalone.
function drawWasdReminder() {
  if (gameState !== "play") return;
  const sc = 0.6;
  const k = 15 * sc,
    g = 3 * sc;
  const contentW = 3 * k + 2 * g;
  const contentH = 2 * k + g;
  const pad = 8;
  const pw = contentW + pad * 2,
    ph = contentH + pad * 2;
  const x = 16,
    y = height - 148 - 12 - ph;
  push();
  noStroke();
  fill(0, 120);
  rect(x, y, pw, ph, 8);
  drawWasdIcon(x + pad, y + pad, sc);
  pop();
}

let winButtons = [];

function goToMenu() {
  gameState = "start";
  // jump straight to the settled menu (buttons already faded in)
  startAnimAt = millis() - (TITLE_PROMPT_AT + 1200);
}

function drawWinScreen() {
  ensureMenuScene();
  drawMenuScene(millis()); // same living haunted backdrop as the title
  updateMenuStorm();

  push();
  noStroke();
  fill(0, 90); // gentle darken for legibility
  rect(0, 0, width, height);

  const cx = width / 2,
    cy = height * 0.33;
  textAlign(CENTER, CENTER);
  textFont(TITLE_FONT);
  fill(20, 55, 30, 190);
  textSize(84);
  text("YOU ESCAPED", cx + 3, cy + 3);
  fill(120, 220, 150);
  text("YOU ESCAPED", cx, cy);
  textFont("monospace");
  fill(210, 220, 210);
  textSize(18);
  text("you made it out alive", cx, cy + 62);

  // two stone buttons
  winButtons = [];
  const bw = min(300, width * 0.44),
    bh = 62,
    gap = 22;
  const bx = width / 2 - bw / 2;
  let by = cy + 116;
  const defs = [
    {
      label: "PLAY AGAIN",
      action: () => {
        introsSeen = {}; // fresh run: let the intros play again
        initGame(0);
      },
    },
    { label: "GO BACK HOME", action: goToMenu },
  ];
  for (const d of defs) {
    const b = {
      x: bx,
      y: by,
      w: bw,
      h: bh,
      label: d.label,
      action: d.action,
      hot:
        mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh,
    };
    winButtons.push(b);
    drawStoneButton(b, 1);
    by += bh + gap;
  }

  drawLightning();
  pop();
  textAlign(LEFT, BASELINE);
}

function drawGameOverScreen() {
  push();
  const m = millis();
  const ctx = drawingContext;

  if (deathLevel === 2) {
    // Bespoke, scarier street death — the death.png photo read as corny here.
    background(6, 2, 4);
    const rg = ctx.createRadialGradient(
      width / 2,
      height * 0.72,
      0,
      width / 2,
      height * 0.72,
      height * 0.95,
    );
    rg.addColorStop(0, `rgba(85,0,0,${0.5 + 0.12 * sin(m / 700)})`);
    rg.addColorStop(0.6, "rgba(30,0,0,0.4)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    noStroke();
    for (let i = 0; i < 5; i++) {
      const hx = width * (0.2 + 0.15 * i) + 40 * sin(m / 1600 + i);
      const hy = height * 0.5 + 30 * cos(m / 1900 + i);
      fill(45, 0, 0, 26);
      ellipse(hx, hy, 260, 180);
    }
  } else if (deathImg && deathImg.width) {
    // slow Ken-Burns drift on the death art (mansion / courtyard)
    imageMode(CORNER);
    const zoom = 1.08 + 0.04 * sin(m / 2600);
    const dw = width * zoom,
      dh = height * zoom;
    const ox = (width - dw) / 2 + 8 * sin(m / 3300);
    const oy = (height - dh) / 2 + 6 * cos(m / 2900);
    tint(150, 150, 160);
    image(deathImg, ox, oy, dw, dh);
    noTint();
  } else {
    background(10, 0, 0);
  }

  // darken + slow red pulse
  noStroke();
  fill(0, 150);
  rect(0, 0, width, height);
  fill(120, 0, 0, 40 + 30 * sin(m / 500));
  rect(0, 0, width, height);

  // drifting bats
  ensureDeathBats();
  for (const b of deathBats) {
    b.x += b.vx;
    b.y += b.vy + 0.3 * sin(m / 500 + b.ph);
    if (b.x < -30) b.x = width + 30;
    if (b.x > width + 30) b.x = -30;
    if (b.y < -30) b.y = height + 30;
    if (b.y > height + 30) b.y = -30;
    drawBat(b.x, b.y, b.sz, (m / 900) * b.flap + b.ph, color(6, 4, 8, 235));
  }

  // a looming silhouette rising from the bottom
  if (vampireImg && vampireImg.width) {
    const s = min(width, height) * (0.5 + 0.06 * sin(m / 1200));
    push();
    imageMode(CENTER);
    tint(40, 6, 10, 220);
    image(vampireImg, width / 2, height * 0.92, s, s);
    pop();
    noTint();
  }

  // vignette
  const vg = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.2,
    width / 2,
    height / 2,
    height * 0.75,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.save();
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // title — steady (no shake), in dripping blood
  drawBloodTitle("YOU WERE CAUGHT", width / 2, height * 0.4, 78);

  // per-level hint
  textAlign(CENTER, CENTER);
  textFont("monospace");
  const hints = [
    "Hint: looking away brings him closer — hold him in your light and he freezes.",
    "Hint: avoid the blood puddles — you don't want to fall and drop your flashlight.",
    "Hint: the lamps are safe zones — but linger under one too long and it dies. Keep moving.",
  ];
  fill(230, 210, 160);
  textSize(16);
  text(hints[deathLevel] || hints[0], width / 2, height * 0.4 + 92);

  // prompt
  const a = 150 + 105 * sin(m / 400);
  fill(235, 235, 235, a);
  textSize(20);
  text("Press R to try again", width / 2, height * 0.72);
  pop();
  textAlign(LEFT, BASELINE);
}

// Bloody title with slow drips oozing from the letters — no jitter.
function drawBloodTitle(str, cx, cy, size) {
  push();
  textAlign(CENTER, CENTER);
  textFont(TITLE_FONT);
  textSize(size);
  // shadow
  fill(70, 0, 0, 200);
  text(str, cx + 3, cy + 4);
  // main bloody fill
  fill(165, 12, 12);
  text(str, cx, cy);

  // drips falling from the base of the text
  const w = textWidth(str);
  const baseY = cy + size * 0.32;
  const n = 9;
  noStroke();
  for (let i = 0; i < n; i++) {
    const seed = i * 1.7;
    const dx = cx - w / 2 + (w * (i + 0.5)) / n + sin(seed) * 6;
    const t = (millis() / 1000) * (0.22 + 0.1 * ((i * 37) % 5));
    const len = size * (0.1 + 0.42 * (0.5 + 0.5 * sin(t + seed)));
    fill(150, 10, 10, 230);
    rect(dx - 1.6, baseY, 3.2, len, 2);
    fill(175, 18, 18, 235);
    ellipse(dx, baseY + len, 6.5, 7.5); // droplet at the tip
  }
  pop();
  textAlign(LEFT, BASELINE);
}

function ensureDeathBats() {
  if (deathBats.length) return;
  for (let i = 0; i < 7; i++) {
    deathBats.push({
      x: random(width),
      y: random(height * 0.6),
      vx: random(-1.4, 1.4) || 1,
      vy: random(-0.4, 0.4),
      sz: random(14, 26),
      ph: random(TWO_PI),
      flap: random(6, 10),
    });
  }
}

// ---------------------------------------------------------------------
//  TRANSITION (smooth room-to-room fade)
// ---------------------------------------------------------------------
function checkTutorialCompletion() {
  if (fadeActive || !player.hasKey) return;
  if (
    player.x > door.x &&
    player.y > door.y - player.r &&
    player.y < door.y + door.h + player.r
  ) {
    startFade(() => initGame(0));
  }
}

function startFade(cb) {
  fadeActive = true;
  fadePhase = "out";
  fadeAlpha = 0;
  fadeCallback = cb;
}

function drawFade() {
  if (!fadeActive) return;
  if (fadePhase === "out") {
    fadeAlpha += 12;
    if (fadeAlpha >= 255) {
      fadeAlpha = 255;
      if (fadeCallback) {
        fadeCallback();
        fadeCallback = null;
      }
      fadePhase = "in";
    }
  } else if (fadePhase === "in") {
    fadeAlpha -= 12;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fadeActive = false;
      fadePhase = "";
    }
  }
  push();
  noStroke();
  fill(0, fadeAlpha);
  rect(0, 0, width, height);
  pop();
}

// ---------------------------------------------------------------------
//  INPUT
// ---------------------------------------------------------------------
function handleAdvance() {
  // The menu handles its own clicks/keys now; this only dismisses the
  // tutorial's opening card.
  if (gameState === "tutorial" && !tutorialIntroDismissed) {
    tutorialIntroDismissed = true;
  }
}

// Leaving the menu for level 1: unlock audio, drop the music back to its quiet
// muffled in-game level, kill the menu rain, and start the tutorial.
function startGame() {
  startAudio();
  if (musicReady && bgMusic) {
    try {
      bgMusic.setVolume(0.01);
    } catch (e) {}
  }
  stopRain();
  initTutorial();
}

// Browsers block sound until a gesture, so the menu is silent until the first
// click/keypress — then the music, rain and distant thunder come in.
function unlockMenuAudio() {
  if (menuAudioOn) return;
  menuAudioOn = true;
  startAudio(); // music + the eerie ambiance
  startRain();
  nextMenuFlashAt = millis() + random(6000, 11000);
}

function keyPressed() {
  if (key && key.length === 1) pressedKeys[key.toLowerCase()] = true;

  // Toggle Debug Panel
  if (key === "m" || key === "M") {
    showDebug = !showDebug;
  }

  // ------------------------------------------------------------
  // DEBUG SHORTCUTS (ACTIVE ONLY WHEN DEBUG PANEL IS OPEN)
  // ------------------------------------------------------------
  if (showDebug) {
    // Level Jump Shortcuts (1, 2, 3)
    if (key === "1") {
      initGame(0);
    }
    if (key === "2") {
      initGame(1);
    }
    if (key === "3") {
      initGame(2);
    }

    // Collect Key (K Key - No Teleport)
    if (key === "k" || key === "K") {
      if (keyItem && player) {
        keyItem.collected = true;
        player.hasKey = true;
        if (door) door.isOpen = true;
      }
    }

    // Screen Jumps (9 = Title, 8 = Win, 0 = Game Over)
    if (key === "9") {
      gameState = "start";
    }
    if (key === "8") {
      gameState = "win";
    }
    if (key === "0") {
      gameState = "gameover";
    }
  }

  // Power box QTE (level 3): while it's up, every keypress is judged against
  // the next expected key instead of reaching normal gameplay input.
  if (qteActive) {
    handleQteKey(key);
    return;
  }

  // Confirm the "flashlight dying" card on the street.
  if (l3WarnActive && (keyCode === ENTER || keyCode === RETURN)) {
    l3WarnActive = false;
    return;
  }

  if (key === " " || keyCode === 32) {
    if (gameState === "start") {
      unlockMenuAudio();
      startGame();
      return;
    }
    if (gameState === "howto") {
      gameState = "start";
      return;
    }
    if (gameState === "play" && currentLevel === 2) {
      const box = nearestPowerBox(player.x, player.y);
      if (box) {
        startQte(box);
        return;
      }
    }
    handleAdvance();
  }

  if (
    (key === "r" || key === "R") &&
    (gameState === "win" || gameState === "gameover")
  )
    restartGame();
}

function keyReleased() {
  if (key && key.length === 1) pressedKeys[key.toLowerCase()] = false;
}

function mousePressed() {
  if (gameState === "start" || gameState === "howto") {
    unlockMenuAudio();
    for (const b of menuButtons) {
      if (
        mouseX >= b.x &&
        mouseX <= b.x + b.w &&
        mouseY >= b.y &&
        mouseY <= b.y + b.h
      ) {
        b.action();
        return;
      }
    }
    return; // clicking empty menu space just unlocks the ambiance
  }
  if (gameState === "win") {
    for (const b of winButtons) {
      if (
        mouseX >= b.x &&
        mouseX <= b.x + b.w &&
        mouseY >= b.y &&
        mouseY <= b.y + b.h
      ) {
        b.action();
        return;
      }
    }
    return;
  }
  // Level 3: left click toggles the torch on/off instead of holding SHIFT.
  if (gameState === "play" && currentLevel === 2 && mouseButton === LEFT) {
    lightOn = !lightOn;
    return;
  }
  handleAdvance();
}

// =====================================================================
//  EFFECTS  (blood puddles, bats, storm + rain + lightning, level
//  intros, lamp sparks, tree hints)
// =====================================================================

// A dark, irregular pool of blood with a wet sheen — drawn in place of the old
// blue water tile. The per-tile seed rotates and reshapes it so a field of them
// never looks stamped.
function drawBloodPuddle(x, y, col, row) {
  const cx = x + TILE_SIZE / 2,
    cy = y + TILE_SIZE / 2;
  const seed = col * 7 + row * 13;
  push();
  translate(cx, cy);
  rotate((seed % 4) * HALF_PI);
  noStroke();
  fill(40, 4, 6);
  ellipse(0, 0, TILE_SIZE * 0.94, TILE_SIZE * 0.8);
  fill(70, 6, 8);
  ellipse(-TILE_SIZE * 0.18, TILE_SIZE * 0.1, TILE_SIZE * 0.5, TILE_SIZE * 0.4);
  ellipse(
    TILE_SIZE * 0.22,
    -TILE_SIZE * 0.08,
    TILE_SIZE * 0.42,
    TILE_SIZE * 0.34,
  );
  fill(105, 10, 12);
  ellipse(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.56);
  fill(170, 40, 40, 120);
  ellipse(
    -TILE_SIZE * 0.12,
    -TILE_SIZE * 0.1,
    TILE_SIZE * 0.22,
    TILE_SIZE * 0.12,
  );
  pop();
}

// Warning beacons over the blood: a faint red glow plus a few tiny bats
// circling, drawn ABOVE the fog so a nearby puddle reads as danger even in the
// dark. Courtyard only, and only for puddles close to the player.
function drawPuddleBeacons() {
  if (gameState !== "play") return;
  if (currentLevel !== 1) return;
  if (!(tileMapData && tileMapData.tiles)) return;
  const now = millis();
  const range = 460;
  const v = visibleTiles();
  const ctx = drawingContext;
  for (let row = v.r0; row <= v.r1; row++) {
    const line = tileMapData.tiles[row] || "";
    for (let col = v.c0; col <= v.c1; col++) {
      if (line[col] !== "*") continue;
      const cx = col * TILE_SIZE + TILE_SIZE / 2;
      const cy = row * TILE_SIZE + TILE_SIZE / 2;
      if (dist(player.x, player.y, cx, cy) > range) continue;

      const pulse = 0.5 + 0.5 * sin(now / 500 + col);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 1.05);
      g.addColorStop(0, `rgba(150,10,10,${0.15 + 0.08 * pulse})`);
      g.addColorStop(1, "rgba(120,0,0,0)");
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE_SIZE * 1.05, 0, TWO_PI);
      ctx.fill();
      ctx.restore();

      const nb = 4;
      for (let i = 0; i < nb; i++) {
        const ph = now / 650 + i * (TWO_PI / nb) + col;
        const rr = TILE_SIZE * 0.5;
        const bx = cx + cos(ph) * rr;
        const by = cy + sin(ph) * rr * 0.5 - 6;
        drawBat(bx, by, 9, ph * 3, color(10, 4, 8, 240));
      }
    }
  }
}

// One small flapping-bat silhouette. Shared by the menu swarm, the puddle
// warnings, and the death screen. `phase` drives the wing flap; `col` its fill.
function drawBat(x, y, s, phase, col) {
  const flap = 0.5 + 0.5 * sin(phase);
  const lift = lerp(0.2, 0.95, flap);
  push();
  translate(x, y);
  noStroke();
  fill(col);
  // body + head + ears
  ellipse(0, 0, s * 0.32, s * 0.5);
  ellipse(0, -s * 0.26, s * 0.26, s * 0.24);
  triangle(-s * 0.13, -s * 0.34, -s * 0.04, -s * 0.5, -s * 0.02, -s * 0.32);
  triangle(s * 0.13, -s * 0.34, s * 0.04, -s * 0.5, s * 0.02, -s * 0.32);
  // membranous wings, scalloped, flapping via the vertical scale
  for (const sgn of [-1, 1]) {
    beginShape();
    vertex(0, -s * 0.04);
    vertex(sgn * s * 0.42, -s * 0.3 * lift);
    vertex(sgn * s * 0.4, -s * 0.02);
    vertex(sgn * s * 0.72, -s * 0.1 * lift);
    vertex(sgn * s * 0.56, s * 0.1);
    vertex(sgn * s * 0.92, s * 0.02 * lift);
    vertex(sgn * s * 0.3, s * 0.2);
    vertex(0, s * 0.1);
    endShape(CLOSE);
  }
  pop();
}

// While the courtyard storm runs: ambient rumbles at random intervals, each one
// (right ear only) paired with a short lightning flash that throws the vampire
// into view for a fraction of a second wherever he is.
// ---------------------------------------------------------------------
//  LEVEL 3: dying flashlight battery (manual, hold SHIFT)
// ---------------------------------------------------------------------
function updateBattery() {
  const shift = keyIsDown(16); // SHIFT
  if (batteryDead) {
    updateDeadTorchFlicker();
    return;
  }
  if (shift && batteryMs > 0) {
    lightOn = true;
    batteryMs -= deltaTime; // drains only while actually on
    if (batteryMs <= 0) {
      batteryMs = 0;
      batteryDead = true;
      lightOn = false;
      nextDeadFlickerAt = millis() + random(2500, 6000);
    }
  } else {
    lightOn = false;
  }
}

// Once the battery is flat the torch is dead — it only sputters to life rarely
// and briefly, the way it used to flicker before.
function updateDeadTorchFlicker() {
  const now = millis();
  if (now < deadFlickerUntil) {
    lightOn = true;
  } else {
    lightOn = false;
    if (now >= nextDeadFlickerAt) {
      deadFlickerUntil = now + random(120, 320);
      nextDeadFlickerAt = now + random(3500, 8000);
    }
  }
}

// Battery pill above the player's head: green with a % that ticks down, turning
// red at 50%, and DEAD once it's flat.
function drawBatteryHud() {
  if (currentLevel !== 2 || gameState !== "play") return;
  const pct = batteryDead ? 0 : batteryMs / BATTERY_MAX_MS;
  const sx = player.x - camera.x + shakeX;
  const sy = player.y - camera.y + shakeY - 46;
  push();
  translate(sx, sy);
  const w = 46,
    h = 18;
  const red = pct <= 0.5;
  const col = batteryDead
    ? color(120, 120, 130)
    : red
      ? color(220, 60, 50)
      : color(70, 210, 110);
  // body
  noStroke();
  fill(0, 170);
  rect(-w / 2 - 2, -h / 2 - 2, w + 8, h + 4, 4);
  stroke(col);
  strokeWeight(2);
  noFill();
  rect(-w / 2, -h / 2, w, h, 3);
  // terminal nub
  noStroke();
  fill(col);
  rect(w / 2 + 1, -4, 3, 8, 1);
  // fill level
  const fw = (w - 4) * pct;
  rect(-w / 2 + 2, -h / 2 + 2, fw, h - 4, 2);
  // label
  fill(255);
  textAlign(CENTER, CENTER);
  textFont("monospace");
  textSize(10);
  text(batteryDead ? "DEAD" : Math.round(pct * 100) + "%", 0, -h / 2 - 12);
  pop();
  textAlign(LEFT, BASELINE);
}

// "Your flashlight is dying" card shown when the street begins. Waits for ENTER.
function drawL3Warning() {
  push();
  noStroke();
  fill(0, 210);
  rect(0, 0, width, height);

  const pw = min(420, width * 0.72),
    ph = 250;
  const px = width / 2 - pw / 2,
    py = height / 2 - ph / 2;
  const cx = width / 2;

  // panel: stone body, soft inner edge, red accent frame
  fill(46, 44, 54, 248);
  rect(px, py, pw, ph, 12);
  stroke(0, 0, 0, 120);
  strokeWeight(1);
  noFill();
  rect(px + 4, py + 4, pw - 8, ph - 8, 9);
  stroke(150, 30, 30, 230);
  strokeWeight(2);
  rect(px, py, pw, ph, 12);
  noStroke();

  // battery glyph with a low-charge bolt, gently pulsing
  const pulse = 0.5 + 0.5 * sin(millis() / 420);
  const by = py + 52,
    bw = 60,
    bh = 28;
  stroke(210, 90, 70, 200 + 40 * pulse);
  strokeWeight(2.5);
  noFill();
  rect(cx - bw / 2, by - bh / 2, bw, bh, 4);
  noStroke();
  fill(210, 90, 70, 220);
  rect(cx + bw / 2 + 2, by - 5, 4, 10, 1);
  // a low red charge sliver
  fill(220, 70, 55, 180 + 60 * pulse);
  rect(cx - bw / 2 + 3, by - bh / 2 + 3, (bw - 6) * 0.25, bh - 6, 2);
  // bolt
  fill(255, 216, 96);
  beginShape();
  vertex(cx - 5, by - 9);
  vertex(cx + 2, by - 1);
  vertex(cx - 2, by - 1);
  vertex(cx + 5, by + 9);
  vertex(cx - 2, by + 1);
  vertex(cx + 2, by + 1);
  endShape(CLOSE);

  // title — shorter so it fits at a smaller size
  textAlign(CENTER, CENTER);
  textFont(TITLE_FONT);
  fill(206, 46, 46);
  textSize(30);
  text("FLASHLIGHT DYING", cx, py + 96);

  // thin divider
  stroke(150, 30, 30, 120);
  strokeWeight(1);
  line(cx - pw * 0.32, py + 118, cx + pw * 0.32, py + 118);
  noStroke();

  // body copy, wrapped inside the panel
  textFont("monospace");
  fill(224, 224, 230);
  textSize(13);
  textLeading(19);
  text(
    "Hold SHIFT to use it — only seconds of\nlight remain. Watch the battery above\nyour head.",
    cx,
    py + 152,
  );

  // ENTER prompt in a subtle chip
  const a = 150 + 90 * sin(millis() / 400);
  const cw = 190,
    chy = py + ph - 34;
  noFill();
  stroke(200, 200, 210, a * 0.6);
  strokeWeight(1);
  rect(cx - cw / 2, chy - 15, cw, 26, 6);
  noStroke();
  fill(235, 235, 240, a);
  textSize(13);
  text("Press  ENTER  to continue", cx, chy - 1);

  pop();
  textAlign(LEFT, BASELINE);
}

function updateStorm() {
  if (!stormActive) return;
  const now = millis();
  if (now >= nextRumbleAt) {
    nextRumbleAt = now + random(13000, 24000);
    // Only the courtyard (level 2) has thunder + lightning. The street (level 3)
    // is rain and rain only — nothing flashes or claps out there.
    if (currentLevel === 1) {
      playRightEar(thunder2Sound, thunder2Ready, 0.06); // much quieter, right ear
      triggerLightning(random(0.55, 0.75), random(220, 320), random(140, 220));
    }
  }
}

// 0..1 brightness of the current lightning flash (shared by the overlay, which
// thins the fog during a strike, and by drawLightning's tint).
function lightningBrightness() {
  if (lightningDur <= 0) return 0;
  const t = (millis() - lightningStart) / lightningDur;
  if (t < 0 || t > 1) return 0;
  let b = exp(-pow((t - 0.05) / 0.06, 2));
  b = max(b, 0.8 * exp(-pow((t - 0.26) / 0.11, 2)));
  return constrain(b * lightningPeak, 0, 1);
}

// Slanted rain in screen space, advanced and recycled each frame.
function drawRain() {
  if (rainDrops.length === 0) buildRain();
  push();
  stroke(180, 195, 220, 90);
  strokeWeight(1.4);
  const wind = 2.2;
  for (const d of rainDrops) {
    line(d.x, d.y, d.x - wind * (d.len / 16), d.y + d.len);
    d.y += d.spd;
    d.x -= wind * 0.5;
    if (d.y > height + 20) {
      d.y = random(-40, -4);
      d.x = random(-40, width + 40);
    }
    if (d.x < -50) d.x = width + random(0, 40);
  }
  pop();
}

function triggerLightning(peak, durMs, revealMs) {
  lightningPeak = peak;
  lightningStart = millis();
  lightningDur = durMs;
  if (revealMs) lightningRevealUntil = millis() + revealMs;
}

// The flash itself is now a fairly soft blue-white wash — the real "see the
// map" effect comes from lightningBrightness() thinning the fog in the overlay,
// so a strike lights the whole scene dimly instead of whiting it out.
function drawLightning() {
  const b = lightningBrightness();
  if (b <= 0) return;
  push();
  noStroke();
  fill(206, 220, 255, 120 * b);
  rect(0, 0, width, height);
  pop();
}

// ---------------------------------------------------------------------
//  LEVEL INTROS
// ---------------------------------------------------------------------
function updateLevelIntro() {
  const now = millis();
  const el = now - levelIntroStart;

  if (!introFired) {
    introFired = true;
    if (levelIntroKind === "storm") {
      // The courtyard's opening clap is meant to jump you — full volume, hard
      // right ear, with the one big strike.
      playRightEar(thunderSound, thunderReady, 1.0);
      startRain();
      triggerLightning(0.9, 320, 0);
    } else if (levelIntroKind === "dread") {
      // The street opens silent but for the rain — no thunder, no lightning.
      startRain();
    }
  }

  const total = levelIntroKind === "storm" ? STORM_INTRO_MS : DREAD_INTRO_MS;
  if (el >= total) {
    levelIntroActive = false;
    // Both storm levels switch their weather fully on once the intro ends.
    if (levelIntroKind === "storm" || levelIntroKind === "dread") {
      stormActive = true;
      buildRain();
      startRain();
      nextRumbleAt = now + random(7000, 14000);
    }
    // The street then holds on the "flashlight dying" card until the player
    // presses ENTER.
    if (levelIntroKind === "dread") l3WarnActive = true;
  }
}

// A single pixel-art vampire eye: a blocky blood-red almond with a hard slit
// pupil and an outer glow. `open` 0..1 sets how far the lid is up, `glow` scales
// intensity, `tilt` angles it into a glare. Deliberately chunky — no smooth
// curves — to read as pixel horror.
function drawPixelEye(cx, cy, open, glow, tilt) {
  if (open <= 0.02 || glow <= 0.01) return;
  const dc = drawingContext;
  const PX = 6;
  const fullW = 56,
    fullH = 30;
  const h = fullH * open;

  // outer bloom
  const g = dc.createRadialGradient(cx, cy, 0, cx, cy, 64);
  g.addColorStop(0, `rgba(255,28,18,${0.55 * glow})`);
  g.addColorStop(0.5, `rgba(175,0,0,${0.22 * glow})`);
  g.addColorStop(1, "rgba(80,0,0,0)");
  dc.save();
  dc.fillStyle = g;
  dc.beginPath();
  dc.arc(cx, cy, 64, 0, TWO_PI);
  dc.fill();
  dc.restore();

  push();
  translate(cx, cy);
  rotate(tilt);
  noStroke();
  const rows = max(1, round(h / PX));
  for (let i = 0; i <= rows; i++) {
    const yy = -h / 2 + i * PX;
    const f = 1 - abs(yy / (h / 2 || 1)); // 1 at centre row, 0 at the lids
    if (f <= 0) continue;
    let rowW = round((fullW * pow(f, 0.7)) / PX) * PX;
    if (rowW < PX) continue;
    fill(255, round(38 + 95 * f), round(18 + 42 * f), 245 * glow); // hotter mid
    rect(-rowW / 2, yy, rowW, PX);
  }
  // hard vertical slit pupil
  const ph = round((h * 0.74) / PX) * PX;
  fill(26, 0, 0, 245 * glow);
  rect(-PX * 0.75, -ph / 2, PX * 1.5, ph);
  pop();
}

function drawLevelIntro() {
  const el = millis() - levelIntroStart;
  const ctx = drawingContext;
  push();
  if (levelIntroKind === "storm") {
    // black settling to the scene while the strike (already fired) flares
    const k = constrain(1 - el / STORM_INTRO_MS, 0, 1);
    noStroke();
    fill(0, 200 * k);
    rect(0, 0, width, height);
    const a = 255 * constrain(1 - abs(el - 850) / 850, 0, 1);
    textAlign(CENTER, CENTER);
    textFont(TITLE_FONT);
    fill(200, 40, 40, a);
    textSize(64);
    text("THE COURTYARD", width / 2, height * 0.42);
    textFont("monospace");
    fill(220, a * 0.8);
    textSize(18);
    text("the rain will hide him", width / 2, height * 0.42 + 60);
  } else {
    // DREAD: pitch black, two red eyes swell open, a red vignette creeps in
    const p = constrain(el / DREAD_INTRO_MS, 0, 1);
    noStroke();
    fill(0);
    rect(0, 0, width, height);

    // Two pixel-art vampire eyes drag open in the dark, with a hard blink
    // partway through to make you flinch.
    let open = constrain((p - 0.12) / 0.34, 0, 1);
    if (p > 0.6 && p < 0.7) {
      const b = (p - 0.6) / 0.1;
      open *= abs(b * 2 - 1); // snaps shut at mid-blink, then back open
    }
    const glow = open * (0.78 + 0.22 * sin(millis() / 110));
    const sep = max(84, width * 0.062);
    drawPixelEye(width / 2 - sep, height * 0.4, open, glow, -0.12);
    drawPixelEye(width / 2 + sep, height * 0.4, open, glow, 0.12);

    const vg = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.2,
      width / 2,
      height / 2,
      height * 0.7,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(90,0,0,${0.5 * p})`);
    ctx.save();
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const a =
      255 *
      constrain((p - 0.45) / 0.3, 0, 1) *
      (p < 0.92 ? 1 : constrain((1 - p) / 0.08, 0, 1));
    textAlign(CENTER, CENTER);
    textFont(TITLE_FONT);
    fill(190, 30, 30, a);
    textSize(64);
    text("THE STREET", width / 2, height * 0.62);
    textFont("monospace");
    fill(210, a * 0.8);
    textSize(18);
    text(
      "the lamps will not last — and you cannot run",
      width / 2,
      height * 0.62 + 56,
    );

    // fade the whole card down into play at the very end
    const fo = 255 * constrain((p - 0.9) / 0.1, 0, 1);
    fill(0, fo);
    rect(0, 0, width, height);
  }
  textAlign(LEFT, BASELINE);
  pop();
}

// ---------------------------------------------------------------------
//  LAMP SPARKS (street) — embers off the lamp tops, heavier as they die
// ---------------------------------------------------------------------
function updateLampSparks() {
  if (currentLevel !== 2) return;
  const now = millis();
  if (now >= nextLampSparkAt) {
    nextLampSparkAt = now + random(28, 70); // frequent bursts
    for (const L of lamps) {
      if (L.state !== "dying") continue; // sparks are the "it's failing!" tell
      const burst = floor(random(6, 11)); // lots of sparks shooting out
      for (let i = 0; i < burst; i++) {
        lampSparks.push({
          x: L.x + random(-7, 7),
          y: L.y - TILE_SIZE * 0.28,
          vx: random(-2.6, 2.6),
          vy: random(-3.4, -0.5),
          born: now,
          life: random(280, 680),
        });
      }
    }
  }
  for (let i = lampSparks.length - 1; i >= 0; i--) {
    const s = lampSparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.12; // gravity, so they arc up then fall
    if (now - s.born > s.life) lampSparks.splice(i, 1);
  }
}

function drawLampSparks() {
  if (gameState !== "play") return;
  if (currentLevel !== 2 || lampSparks.length === 0) return;
  const now = millis();
  push();
  noStroke();
  for (const s of lampSparks) {
    const t = (now - s.born) / s.life;
    const a = 255 * (1 - t);
    fill(255, 200 - 120 * t, 70, a);
    const r = 2.6 * (1 - 0.5 * t);
    ellipse(s.x, s.y, r, r);
  }
  pop();
}

// ---------------------------------------------------------------------
//  TREE HINTS (street) — a faint outline on nearby trees/bushes so the
//  treeline is legible in the dark and you stop walking into it blind.
// ---------------------------------------------------------------------
function drawTreeHints() {
  if (gameState !== "play") return;
  if (currentLevel !== 2) return;
  if (!(tileMapData && tileMapData.tiles)) return;
  const range = 120;
  const v = visibleTiles();
  push();
  for (let row = v.r0; row <= v.r1; row++) {
    const line = tileMapData.tiles[row] || "";
    for (let col = v.c0; col <= v.c1; col++) {
      const ch = line[col] || ".";
      if (ch !== "t" && ch !== "b") continue;
      const cx = col * TILE_SIZE + TILE_SIZE / 2;
      const cy = row * TILE_SIZE + TILE_SIZE / 2;
      const d = dist(player.x, player.y, cx, cy);
      if (d > range) continue;
      const a = map(d, range, 40, 0, 90, true);
      noFill();
      stroke(120, 180, 130, a);
      strokeWeight(2);
      rect(
        col * TILE_SIZE + 3,
        row * TILE_SIZE + 3,
        TILE_SIZE - 6,
        TILE_SIZE - 6,
        4,
      );
    }
  }
  pop();
}

// ============================================================
// DRAW DEBUG PANEL - Vampiric Crimson Edition
// ============================================================
function drawDebugPanel() {
  push();

  // Position: top-right corner with a 15px margin
  let panelWidth = 270;
  let panelHeight = 270;
  let x = width - panelWidth - 15;
  let y = 15;

  // Deep blood-black background with crimson border
  fill(20, 5, 8, 240);
  stroke(220, 20, 60); // Crimson Red Border
  strokeWeight(2);
  rectMode(CORNER);
  rect(x, y, panelWidth, panelHeight, 8);

  // Panel Title
  noStroke();
  fill(220, 20, 60);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("🩸 VAMPIRE DEBUG ACTIVE", x + 12, y + 10);

  // Dark blood-tinted dividing line
  stroke(80, 15, 25);
  strokeWeight(1);
  line(x + 5, y + 30, x + panelWidth - 5, y + 30);
  noStroke();

  // Diagnostics Info
  fill(230, 213, 213); // Soft bone-pale text
  textSize(11);
  textStyle(NORMAL);
  textFont("monospace");
  text(`State: ${gameState.toUpperCase()}`, x + 12, y + 38);
  text(
    `Level: ${currentLevel + 1} (${LEVELS[currentLevel] ? LEVELS[currentLevel].name : "N/A"})`,
    x + 12,
    y + 53,
  );

  if (player) {
    text(`Has Key: ${player.hasKey ? "YES" : "NO"}`, x + 12, y + 68);
  }

  if (vampire && gameState === "play") {
    let d = floor(dist(player.x, player.y, vampire.x, vampire.y));
    text(`Vampire Dist: ${d}px`, x + 12, y + 83);
    text(`Vampire State: ${vampire.state.toUpperCase()}`, x + 12, y + 98);
  } else {
    text(`Vampire: INACTIVE`, x + 12, y + 83);
  }

  text(`Torch Beam: ${lightOn ? "ON" : "OFF"}`, x + 12, y + 113);

  // Dark blood-tinted dividing line
  stroke(80, 15, 25);
  strokeWeight(1);
  line(x + 5, y + 132, x + panelWidth - 5, y + 132);
  noStroke();

  // Keyboard binds directory
  fill(180, 40, 40); // Soft blood red header
  textStyle(BOLD);
  text("DEBUG CONTROL BINDS:", x + 12, y + 142);

  fill(170, 150, 150);
  textStyle(NORMAL);
  text("[M] Toggle Debug Panel", x + 12, y + 160);
  text("[1, 2, 3] Jump to Level", x + 12, y + 175);
  text("[K] Collect Key", x + 12, y + 190);
  text("[9] Jump to Title Screen", x + 12, y + 205);
  text("[8] Jump to Win Screen", x + 12, y + 220);
  text("[0] Jump to Game Over Screen", x + 12, y + 235);

  pop();
}
