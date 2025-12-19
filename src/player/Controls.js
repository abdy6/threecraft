import { CONFIG } from '../config.js';

export class Controls {
  constructor(player, renderer, world) {
    this.player = player;
    this.renderer = renderer;
    this.world = world;

    // Movement state
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

    // Mouse state
    this.mouseX = 0;
    this.mouseY = 0;
    this.yaw = 0; // Horizontal rotation
    this.pitch = 0; // Vertical rotation
    this.sensitivity = 0.002;

    // Pointer lock
    this.isLocked = false;
    
    // Track frames since lock to ignore initial large movements
    this.framesSinceLock = 0;

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
    switch (event.code) {
      case 'KeyW':
        this.keys.forward = true;
        break;
      case 'KeyS':
        this.keys.backward = true;
        break;
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.jump = true;
        event.preventDefault();
        break;
      case 'KeyE':
        this.keys.up = true;
        break;
      case 'KeyQ':
        this.keys.down = true;
        break;
      default:
        // Check for wireframe toggle key
        if (event.code === CONFIG.TOGGLE_WIREFRAME_KEY) {
          this.renderer.toggleWireframe();
          event.preventDefault();
        }
        // Check for fly mode toggle key
        else if (event.code === CONFIG.TOGGLE_FLY_KEY) {
          this.flyMode = !this.flyMode;
          // Reset velocity when toggling fly mode to prevent unwanted movement
          if (this.flyMode) {
            this.player.velocity.set(0, 0, 0);
          }
          event.preventDefault();
        }
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
      case 'KeyE':
        this.keys.up = false;
        break;
      case 'KeyQ':
        this.keys.down = false;
        break;
    }
  }

  onMouseMove(event) {
    // Only process if pointer is locked (this listener should only be active when locked)
    if (!this.isLocked) return;

    // Ignore the first few mouse events after locking to prevent initial jump
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
      this.yaw -= movementX * this.sensitivity;
      this.pitch -= movementY * this.sensitivity;

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
            this.world.setBlock(result.blockX, result.blockY, result.blockZ, null);
            this.renderer.updateChunkMeshes();
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
                // Use the selected block type instead of hardcoded 'GRASS'
                this.world.setBlock(placePos.x, placePos.y, placePos.z, new Block(this.selectedBlockType));
                this.renderer.updateChunkMeshes();
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

    // Always update camera rotation if locked
    if (this.isLocked) {
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

    if (this.isLocked) {
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

      // Handle jump (only when not in fly mode)
      if (!this.flyMode && this.keys.jump) {
        this.player.jump();
        this.keys.jump = false; // Prevent continuous jumping
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
}

