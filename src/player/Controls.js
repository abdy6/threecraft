import { CONFIG } from '../config.js';
import { TouchControls } from './TouchControls.js';

export class Controls {
  constructor(player, renderer, world) {
    this.player = player;
    this.renderer = renderer;
    this.world = world;
    
    // Initialize touch controls
    this.touchControls = new TouchControls();

    // Track pressed keys using Set for reliable input handling
    this.pressed = new Set();

    // Movement state (populated from pressed Set in update())
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      up: false,    // E key - fly up
      down: false   // Q key - fly down
    };

    // Fly mode state
    this.flyMode = false;

    // Track previous key states for edge detection
    this.wasPausePressed = false;
    this.wasWireframeTogglePressed = false;
    this.wasFlyTogglePressed = false;

    // Mouse state
    this.mouseX = 0;
    this.mouseY = 0;
    this.yaw = 0; // Horizontal rotation
    this.pitch = 0; // Vertical rotation
    this.mouseSensitivity = CONFIG.MOUSE_SENSITIVITY;
    this.touchSensitivity = CONFIG.TOUCH_SENSITIVITY;

    // Pointer lock
    this.isLocked = false;
    
    // Track frames since lock to ignore initial large movements
    this.framesSinceLock = 0;

    // Pause state
    this.isPaused = false;

    // Block selection
    this.placeableBlocks = CONFIG.PLACEABLE_BLOCKS;
    this.selectedBlockIndex = 0;
    this.selectedBlockType = this.placeableBlocks[this.selectedBlockIndex] || 'GRASS';

    // Bind the handler so we can remove it later (must be before setupEventListeners)
    this.mouseMoveHandler = (e) => this.onMouseMove(e);

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Mouse events
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    
    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Pointer lock events
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });

    // Handle pointer lock changes
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.isLocked;
      this.isLocked = document.pointerLockElement === canvas;
      
      // Only listen to mousemove when pointer is locked
      if (this.isLocked && !wasLocked) {
        // Reset frame counter to ignore initial large movements
        this.framesSinceLock = 0;
        // Pointer just locked - add mousemove listener
        document.addEventListener('mousemove', this.mouseMoveHandler);
      } else if (!this.isLocked && wasLocked) {
        // Pointer just unlocked - remove mousemove listener
        document.removeEventListener('mousemove', this.mouseMoveHandler);
      }
    });
  }

  onKeyDown(event) {
    // Add key to pressed Set
    this.pressed.add(event.code);
    // console.log('down', event.code);
    // Prevent default for keys that shouldn't trigger browser behavior
    if (event.code === CONFIG.KEYBINDS.JUMP ||
        event.code === CONFIG.KEYBINDS.PAUSE ||
        event.code === CONFIG.KEYBINDS.TOGGLE_WIREFRAME ||
        event.code === CONFIG.KEYBINDS.TOGGLE_FLY) {
      event.preventDefault();
    }
  }

  onKeyUp(event) {
    // Remove key from pressed Set
    this.pressed.delete(event.code);
    // console.log('up', event.code);
  }

  onMouseMove(event) {
    // Only process if pointer is locked (this listener should only be active when locked)
    if (!this.isLocked) return;

    // Ignore the first few mouse events after locking to prevent initial 
    if (this.framesSinceLock < 2) {
      return;
    }

    // Use movementX/Y which are only available with pointer lock
    const movementX = event.movementX ?? 0;
    const movementY = event.movementY ?? 0;

    // Ignore excessively large movements (can happen on focus changes)
    const maxMovement = 100;
    if (Math.abs(movementX) > maxMovement || Math.abs(movementY) > maxMovement) {
      return;
    }

    // Only update if there's actual movement
    if (movementX !== 0 || movementY !== 0) {
      this.yaw -= movementX * this.mouseSensitivity;
      this.pitch -= movementY * this.mouseSensitivity;

      // Clamp pitch to prevent flipping
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }
  }

  onWheel(event) {
    if (!this.isLocked) return;
    
    event.preventDefault();
    
    // Scroll up = next block, scroll down = previous block
    if (event.deltaY > 0) {
      // Scroll down - previous block
      this.selectedBlockIndex = (this.selectedBlockIndex - 1 + this.placeableBlocks.length) % this.placeableBlocks.length;
    } else {
      // Scroll up - next block
      this.selectedBlockIndex = (this.selectedBlockIndex + 1) % this.placeableBlocks.length;
    }
    
    this.selectedBlockType = this.placeableBlocks[this.selectedBlockIndex];
    
    // Notify renderer to update HUD (if needed)
    if (this.renderer.updateSelectedBlock) {
      this.renderer.updateSelectedBlock(this.selectedBlockType);
    }
  }

  onMouseDown(event) {
    if (!this.isLocked) return;

    // Import raycast here to avoid circular dependencies
    import('../utils/Raycast.js').then(({ raycast, getPlacePosition }) => {
      import('../world/Block.js').then(({ Block }) => {
        const eyePos = this.player.getEyePosition();
        const direction = this.player.getForwardDirection();

        const result = raycast(this.world, eyePos, direction);

        if (event.button === 0) {
          // Left click - break block
          if (result.hit) {
            this.world.setBlock(result.blockX, result.blockY, result.blockZ, Block.ID.AIR);
            // Update highlight immediately after breaking
            const newRaycast = raycast(this.world, eyePos, direction);
            this.renderer.updateHighlight(newRaycast);
          }
        } else if (event.button === 2) {
          // Right click - place block
          if (result.hit) {
            const placePos = getPlacePosition(result);
            if (placePos) {
              // Check if position is not inside player
              const playerPos = this.player.position;
              const halfWidth = this.player.width / 2;
              const minY = playerPos.y;
              const maxY = playerPos.y + this.player.height;

              const inPlayerBounds = 
                placePos.x >= playerPos.x - halfWidth && placePos.x <= playerPos.x + halfWidth &&
                placePos.y >= minY && placePos.y <= maxY &&
                placePos.z >= playerPos.z - halfWidth && placePos.z <= playerPos.z + halfWidth;

              if (!inPlayerBounds && !this.world.isSolid(placePos.x, placePos.y, placePos.z)) {
                // Use the selected block type (convert to ID)
                const blockId = Block.getId(this.selectedBlockType);
                this.world.setBlock(placePos.x, placePos.y, placePos.z, blockId);
                // Update highlight immediately after placing
                const newRaycast = raycast(this.world, eyePos, direction);
                this.renderer.updateHighlight(newRaycast);
              } else {
                // Even if we didn't place, update highlight to reflect current state
                const newRaycast = raycast(this.world, eyePos, direction);
                this.renderer.updateHighlight(newRaycast);
              }
            }
          }
        }
      });
    });

    event.preventDefault();
  }

  update(deltaTime) {
    // Track frames since pointer lock
    if (this.isLocked) {
      this.framesSinceLock++;
    }
    
    // Update keys state from pressed Set
    this.keys.forward = this.pressed.has(CONFIG.KEYBINDS.MOVE_FORWARD);
    this.keys.backward = this.pressed.has(CONFIG.KEYBINDS.MOVE_BACKWARD);
    this.keys.left = this.pressed.has(CONFIG.KEYBINDS.MOVE_LEFT);
    this.keys.right = this.pressed.has(CONFIG.KEYBINDS.MOVE_RIGHT);
    this.keys.up = this.pressed.has(CONFIG.KEYBINDS.FLY_UP);
    this.keys.down = this.pressed.has(CONFIG.KEYBINDS.FLY_DOWN);
    
    // Handle edge-detected actions (toggle once per press)
    // Note: Pause is handled separately in checkPauseInput() so it works even when paused
    const isWireframeTogglePressed = this.pressed.has(CONFIG.KEYBINDS.TOGGLE_WIREFRAME);
    if (isWireframeTogglePressed && !this.wasWireframeTogglePressed) {
      this.renderer.toggleWireframe();
    }
    this.wasWireframeTogglePressed = isWireframeTogglePressed;

    const isFlyTogglePressed = this.pressed.has(CONFIG.KEYBINDS.TOGGLE_FLY);
    if (isFlyTogglePressed && !this.wasFlyTogglePressed) {
      this.flyMode = !this.flyMode;
      // Reset velocity when toggling fly mode to prevent unwanted movement
      if (this.flyMode) {
        this.player.velocity.set(0, 0, 0);
      }
    }
    this.wasFlyTogglePressed = isFlyTogglePressed;

    // Handle jump (continuous while held, only when not in fly mode)
    this.keys.jump = this.pressed.has(CONFIG.KEYBINDS.JUMP);
    if (!this.flyMode) {
      if (this.keys.jump || (this.touchControls.isEnabled() && this.touchControls.isTouchJumpPressed())) {
        this.player.jump();
      }
    }
    
    // Handle touch camera rotation
    if (this.touchControls.isEnabled() && this.touchControls.cameraRotationActive) {
      const touchRotation = this.touchControls.getTouchRotation();
      if (touchRotation.deltaX !== 0 || touchRotation.deltaY !== 0) {
        this.yaw -= touchRotation.deltaX * this.touchSensitivity;
        this.pitch -= touchRotation.deltaY * this.touchSensitivity;
        // Clamp pitch to prevent flipping
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
      }
    }

    // Always update camera rotation if locked (mouse) or touch is active
    if (this.isLocked || (this.touchControls.isEnabled() && this.touchControls.cameraRotationActive)) {
      this.player.camera.rotation.order = 'YXZ';
      this.player.camera.rotation.y = this.yaw;
      this.player.camera.rotation.x = this.pitch;
    }

    // Calculate movement direction relative to camera
    const moveDirection = {
      x: 0,
      z: 0,
      y: 0  // Vertical movement for fly mode
    };
    
    // Check if touch controls are active
    const touchActive = this.touchControls.isEnabled() && this.touchControls.joystickActive;
    const useTouchMovement = touchActive;

    if (this.isLocked || useTouchMovement) {
      if (useTouchMovement) {
        // Use touch joystick movement
        const touchMovement = this.touchControls.getTouchMovement();
        // touchMovement.x is left/right (positive = right)
        // touchMovement.z is forward/back (positive = forward, but joystick y is up which should be forward)
        // Convert joystick direction to world space based on camera yaw
        // Forward/backward component (z in touchMovement, which is y in joystick)
        moveDirection.x -= Math.sin(this.yaw) * touchMovement.z;
        moveDirection.z -= Math.cos(this.yaw) * touchMovement.z;
        // Left/right component (x in touchMovement)
        moveDirection.x += Math.cos(this.yaw) * touchMovement.x;
        moveDirection.z -= Math.sin(this.yaw) * touchMovement.x;
      } else {
        // Use keyboard movement
        if (this.keys.forward) {
          moveDirection.x -= Math.sin(this.yaw);
          moveDirection.z -= Math.cos(this.yaw);
        }
        if (this.keys.backward) {
          moveDirection.x += Math.sin(this.yaw);
          moveDirection.z += Math.cos(this.yaw);
        }
        if (this.keys.left) {
          moveDirection.x -= Math.cos(this.yaw);
          moveDirection.z += Math.sin(this.yaw);
        }
        if (this.keys.right) {
          moveDirection.x += Math.cos(this.yaw);
          moveDirection.z -= Math.sin(this.yaw);
        }
      }

      // Normalize horizontal movement direction
      const length = Math.sqrt(moveDirection.x * moveDirection.x + moveDirection.z * moveDirection.z);
      if (length > 0) {
        moveDirection.x /= length;
        moveDirection.z /= length;
      }

      // Handle vertical movement in fly mode
      if (this.flyMode) {
        if (this.keys.up) {
          moveDirection.y = 1;
        }
        if (this.keys.down) {
          moveDirection.y = -1;
        }
      }
    }
    
    // Handle touch button actions (one-time actions)
    if (this.touchControls.isEnabled()) {
      if (this.touchControls.wasPlacePressedThisFrame()) {
        this.handlePlaceBlock();
      }
      if (this.touchControls.wasBreakPressedThisFrame()) {
        this.handleBreakBlock();
      }
      if (this.touchControls.wasCyclePressedThisFrame()) {
        this.handleCycleBlock();
      }
    }

    // Apply movement - use fly mode if enabled, otherwise use normal movement
    if (this.flyMode) {
      this.player.flyMove(deltaTime, moveDirection);
    } else {
      this.player.move(deltaTime, moveDirection);
    }
  }

  // Get currently selected block type
  getSelectedBlockType() {
    return this.selectedBlockType;
  }
  
  // Handle block placement (called from touch controls)
  handlePlaceBlock() {
    // Import raycast here to avoid circular dependencies
    import('../utils/Raycast.js').then(({ raycast, getPlacePosition }) => {
      import('../world/Block.js').then(({ Block }) => {
        const eyePos = this.player.getEyePosition();
        const direction = this.player.getForwardDirection();

        const result = raycast(this.world, eyePos, direction);

        if (result.hit) {
          const placePos = getPlacePosition(result);
          if (placePos) {
            // Check if position is not inside player
            const playerPos = this.player.position;
            const halfWidth = this.player.width / 2;
            const minY = playerPos.y;
            const maxY = playerPos.y + this.player.height;

            const inPlayerBounds = 
              placePos.x >= playerPos.x - halfWidth && placePos.x <= playerPos.x + halfWidth &&
              placePos.y >= minY && placePos.y <= maxY &&
              placePos.z >= playerPos.z - halfWidth && placePos.z <= playerPos.z + halfWidth;

            if (!inPlayerBounds && !this.world.isSolid(placePos.x, placePos.y, placePos.z)) {
              // Use the selected block type (convert to ID)
              const blockId = Block.getId(this.selectedBlockType);
              this.world.setBlock(placePos.x, placePos.y, placePos.z, blockId);
              // Update highlight immediately after placing
              const newRaycast = raycast(this.world, eyePos, direction);
              this.renderer.updateHighlight(newRaycast);
            } else {
              // Even if we didn't place, update highlight to reflect current state
              const newRaycast = raycast(this.world, eyePos, direction);
              this.renderer.updateHighlight(newRaycast);
            }
          }
        }
      });
    });
  }
  
  // Handle block breaking (called from touch controls)
  handleBreakBlock() {
    // Import raycast here to avoid circular dependencies
    import('../utils/Raycast.js').then(({ raycast }) => {
      import('../world/Block.js').then(({ Block }) => {
        const eyePos = this.player.getEyePosition();
        const direction = this.player.getForwardDirection();

        const result = raycast(this.world, eyePos, direction);

        if (result.hit) {
          this.world.setBlock(result.blockX, result.blockY, result.blockZ, Block.ID.AIR);
          // Update highlight immediately after breaking
          const newRaycast = raycast(this.world, eyePos, direction);
          this.renderer.updateHighlight(newRaycast);
        } else {
          // Even if we didn't break, update highlight to reflect current state
          const newRaycast = raycast(this.world, eyePos, direction);
          this.renderer.updateHighlight(newRaycast);
        }
      });
    });
  }
  
  // Handle block cycling (called from touch controls)
  handleCycleBlock() {
    this.selectedBlockIndex = (this.selectedBlockIndex + 1) % this.placeableBlocks.length;
    this.selectedBlockType = this.placeableBlocks[this.selectedBlockIndex];
    
    // Notify renderer to update HUD (if needed)
    if (this.renderer.updateSelectedBlock) {
      this.renderer.updateSelectedBlock(this.selectedBlockType);
    }
  }

  // Check pause key input (called even when paused)
  checkPauseInput() {
    const isPausePressed = this.pressed.has(CONFIG.KEYBINDS.PAUSE);
    if (isPausePressed && !this.wasPausePressed) {
      this.togglePause();
    }
    this.wasPausePressed = isPausePressed;
  }

  // Toggle pause state
  togglePause() {
    this.isPaused = !this.isPaused;
    
    // Unlock pointer when pausing
    if (this.isPaused) {
      if (this.isLocked && document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
    }
  }

  // Show pause menu
  showPauseMenu() {
    const pauseMenu = document.getElementById('pause-menu');
    const pauseMenuScreen = document.getElementById('pause-menu-screen');
    const controlsScreen = document.getElementById('controls-screen');
    const changelogScreen = document.getElementById('changelog-screen');
    
    if (pauseMenu) {
      pauseMenu.style.display = 'flex';
    }
    
    // Reset to pause menu screen (not controls or changelog screen)
    if (pauseMenuScreen) {
      pauseMenuScreen.style.display = 'flex';
    }
    if (controlsScreen) {
      controlsScreen.style.display = 'none';
    }
    if (changelogScreen) {
      changelogScreen.style.display = 'none';
    }
  }

  // Hide pause menu
  hidePauseMenu() {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.style.display = 'none';
    }
  }

  // Check if game is paused
  getPaused() {
    return this.isPaused;
  }

  // Get fly mode state
  getFlyMode() {
    return this.flyMode;
  }
}

