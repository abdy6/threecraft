import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { Controls } from './player/Controls.js';
import { Renderer } from './rendering/Renderer.js';
import { raycast } from './utils/Raycast.js';
import { CONFIG } from './config.js';

// Initialize game
const container = document.getElementById('canvas-container');
const renderer = new Renderer(container);
const world = new World();
const player = new Player(world);
const controls = new Controls(player, renderer, world);

// Initialize world rendering
renderer.initializeWorld(world);
renderer.camera = player.getCamera();

// Game loop
let lastTime = performance.now();
let isTabVisible = true;
let frameCount = 0;
let fpsLastTime = performance.now();
let currentFPS = 0;

// HUD elements
const hudWorldPos = document.getElementById('hud-world-pos');
const hudChunkPos = document.getElementById('hud-chunk-pos');
const hudFPS = document.getElementById('hud-fps');
const hudFlyMode = document.getElementById('hud-fly-mode');
const hudSelectedBlock = document.getElementById('hud-selected-block');
const hud = document.getElementById('hud');

// HUD visibility state
let hudVisible = true;

// Changelog content (loaded once at startup)
let changelogText = '';

// Handle tab visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    isTabVisible = false;
  } else {
    isTabVisible = true;
    // Reset lastTime when tab becomes visible to prevent huge deltaTime
    lastTime = performance.now();
  }
});

function animate() {
  const currentTime = performance.now();
  let deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  
  // Clamp deltaTime to prevent huge time steps (max 100ms)
  // This prevents the player from falling through blocks when tab is inactive
  deltaTime = Math.min(deltaTime, 0.1);
  
  lastTime = currentTime;

  // Calculate FPS
  frameCount++;
  if (currentTime - fpsLastTime >= 1000) {
    currentFPS = frameCount;
    frameCount = 0;
    fpsLastTime = currentTime;
  }

  // Always check pause input (even when paused, so we can unpause)
  controls.checkPauseInput();

  // Only update game logic if tab is visible and not paused
  if (isTabVisible && !controls.getPaused()) {
    // Update controls and player
    controls.update(deltaTime);

    // Update highlight box (raycast for block selection)
    // Show highlight when pointer is locked (desktop) or touch controls are enabled (mobile)
    const shouldShowHighlight = controls.isLocked || 
      (controls.touchControls && controls.touchControls.isEnabled());
    if (shouldShowHighlight) {
      const eyePos = player.getEyePosition();
      const direction = player.getForwardDirection();
      const raycastResult = raycast(world, eyePos, direction);
      renderer.updateHighlight(raycastResult);
    }
  }

  // Update HUD
  updateHUD();

  // Always render (even when tab is hidden, to prevent issues)
  renderer.render(player.getCamera());

  requestAnimationFrame(animate);
}

function updateHUD() {
  const pos = player.position;
  
  // World position
  hudWorldPos.textContent = `World: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
  
  // Chunk position (only show on non-touch devices)
  if (!document.body.classList.contains('touch-device')) {
    const { chunkX, chunkZ, localX, localZ } = world.worldToLocal(pos.x, pos.y, pos.z);
    hudChunkPos.textContent = `Chunk: (${chunkX}, ${chunkZ}) Local: (${Math.floor(localX)}, ${Math.floor(localZ)})`;
  }
  
  // FPS
  hudFPS.textContent = `FPS: ${currentFPS}`;
  
  // Fly mode
  hudFlyMode.textContent = `Flying: ${controls.getFlyMode()}`;
  
  // Selected block
  hudSelectedBlock.textContent = `Block: ${controls.getSelectedBlockType()}`;
}

// Handle window resize
window.addEventListener('resize', () => {
  renderer.onWindowResize(player.getCamera());
});

// Setup pause menu button handlers
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseToggleHudBtn = document.getElementById('pause-toggle-hud-btn');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseInfoBtn = document.getElementById('pause-info-btn');
const pauseMenuScreen = document.getElementById('pause-menu-screen');
const controlsScreen = document.getElementById('controls-screen');
const controlsBackBtn = document.getElementById('controls-back-btn');
const controlsList = document.getElementById('controls-list');
const changelogScreen = document.getElementById('changelog-screen');
const changelogBackBtn = document.getElementById('changelog-back-btn');
const changelogContent = document.getElementById('changelog-content');

// Function to toggle HUD visibility
function toggleHUD() {
  hudVisible = !hudVisible;
  if (hud) {
    if (hudVisible) {
      // Remove inline style to restore default CSS display
      hud.style.display = '';
    } else {
      hud.style.display = 'none';
    }
  }
}

// Function to format key code for display
function formatKeyCode(keyCode) {
  // Remove "Key" prefix from key codes like "KeyW" -> "W"
  if (keyCode.startsWith('Key')) {
    return keyCode.substring(3);
  }
  // Return as-is for special keys like "Space"
  return keyCode;
}

// Function to show controls screen
function showControlsScreen() {
  if (pauseMenuScreen) pauseMenuScreen.style.display = 'none';
  if (controlsScreen) controlsScreen.style.display = 'flex';
  
  // Populate controls list
  if (controlsList) {
    controlsList.innerHTML = '';
    for (const [key, keyCode] of Object.entries(CONFIG.KEYBINDS)) {
      const description = CONFIG.KEYBIND_DESCRIPTIONS[key] || key;
      const controlItem = document.createElement('div');
      controlItem.className = 'control-item';
      
      const descSpan = document.createElement('span');
      descSpan.className = 'control-description';
      descSpan.textContent = description;
      
      const keySpan = document.createElement('span');
      keySpan.className = 'control-key';
      keySpan.textContent = formatKeyCode(keyCode);
      
      controlItem.appendChild(descSpan);
      controlItem.appendChild(keySpan);
      controlsList.appendChild(controlItem);
    }
  }
}

// Function to show pause menu screen
function showPauseMenuScreen() {
  if (pauseMenuScreen) pauseMenuScreen.style.display = 'flex';
  if (controlsScreen) controlsScreen.style.display = 'none';
  if (changelogScreen) changelogScreen.style.display = 'none';
}

// Function to show changelog screen
function showChangelogScreen() {
  if (pauseMenuScreen) pauseMenuScreen.style.display = 'none';
  if (controlsScreen) controlsScreen.style.display = 'none';
  if (changelogScreen) changelogScreen.style.display = 'flex';
  
  // Display cached changelog content
  if (changelogContent) {
    changelogContent.textContent = changelogText;
  }
}

// Load changelog once at startup
async function loadChangelog() {
  try {
    const response = await fetch('/threecraft/changelog.txt');
    if (response.ok) {
      changelogText = await response.text();
    } else {
      changelogText = 'Unable to load changelog.';
    }
  } catch (error) {
    changelogText = 'Error loading changelog.';
    console.error('Error loading changelog:', error);
  }
  
  // Display initial content (even if empty)
  if (changelogContent) {
    changelogContent.textContent = changelogText;
  }
}

if (pauseResumeBtn) {
  pauseResumeBtn.addEventListener('click', () => {
    controls.togglePause();
  });
}

if (pauseToggleHudBtn) {
  pauseToggleHudBtn.addEventListener('click', () => {
    toggleHUD();
  });
}

if (pauseControlsBtn) {
  pauseControlsBtn.addEventListener('click', () => {
    showControlsScreen();
  });
}

if (controlsBackBtn) {
  controlsBackBtn.addEventListener('click', () => {
    showPauseMenuScreen();
  });
}

if (pauseInfoBtn) {
  pauseInfoBtn.addEventListener('click', () => {
    showChangelogScreen();
  });
}

if (changelogBackBtn) {
  changelogBackBtn.addEventListener('click', () => {
    showPauseMenuScreen();
  });
}

// Load changelog at startup
loadChangelog();

// Start game loop
animate();

