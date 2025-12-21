import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { Controls } from './player/Controls.js';
import { Renderer } from './rendering/Renderer.js';
import { raycast } from './utils/Raycast.js';

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
const hudSelectedBlock = document.getElementById('hud-selected-block');

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
  
  // Selected block
  hudSelectedBlock.textContent = `Block: ${controls.getSelectedBlockType()}`;
}

// Handle window resize
window.addEventListener('resize', () => {
  renderer.onWindowResize(player.getCamera());
});

// Setup pause menu button handlers
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseInfoBtn = document.getElementById('pause-info-btn');

if (pauseResumeBtn) {
  pauseResumeBtn.addEventListener('click', () => {
    controls.togglePause();
  });
}

if (pauseControlsBtn) {
  pauseControlsBtn.addEventListener('click', () => {
    // Placeholder for controls
    console.log('Controls clicked');
  });
}

if (pauseInfoBtn) {
  pauseInfoBtn.addEventListener('click', () => {
    // Placeholder for info & changelog
    console.log('Info & Changelog clicked');
  });
}

// Start game loop
animate();

