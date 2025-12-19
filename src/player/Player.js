import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.position = new THREE.Vector3(8, 22, 8); // Start above ground (grass is at y=20)
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    // Player dimensions
    this.height = CONFIG.PLAYER.HEIGHT;
    this.width = CONFIG.PLAYER.WIDTH;
    this.eyeHeight = CONFIG.PLAYER.EYE_HEIGHT;
  }

  updateCameraPosition() {
    this.camera.position.copy(this.position);
    this.camera.position.y += this.eyeHeight;
  }

  // AABB collision detection
  checkCollision(newPos) {
    const halfWidth = this.width / 2;
    const minX = Math.floor(newPos.x - halfWidth);
    const maxX = Math.floor(newPos.x + halfWidth);
    const minY = Math.floor(newPos.y);
    const maxY = Math.floor(newPos.y + this.height);
    const minZ = Math.floor(newPos.z - halfWidth);
    const maxZ = Math.floor(newPos.z + halfWidth);

    // Check all blocks in player's bounding box
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.isSolid(x, y, z)) {
            return true; // Collision detected
          }
        }
      }
    }
    return false;
  }

  // Move player in fly mode (no collision, no gravity)
  flyMove(deltaTime, moveDirection) {
    const speed = CONFIG.PLAYER.FLY_SPEED;
    
    // Calculate movement vector based on camera direction
    const moveVector = new THREE.Vector3(
      moveDirection.x * speed * deltaTime,
      moveDirection.y * speed * deltaTime,  // Vertical movement
      moveDirection.z * speed * deltaTime
    );

    // Apply movement directly without collision checks
    this.position.add(moveVector);
    
    // Reset velocity to prevent gravity from accumulating
    this.velocity.set(0, 0, 0);
    this.onGround = false;

    this.updateCameraPosition();
  }

  // Move player with collision detection
  move(deltaTime, moveDirection) {
    const speed = CONFIG.PLAYER.SPEED;
    const moveVector = new THREE.Vector3(
      moveDirection.x * speed * deltaTime,
      0,
      moveDirection.z * speed * deltaTime
    );

    // Apply movement in X and Z separately for better collision
    const newPosX = this.position.clone();
    newPosX.x += moveVector.x;
    if (!this.checkCollision(newPosX)) {
      this.position.x = newPosX.x;
    }

    const newPosZ = this.position.clone();
    newPosZ.z += moveVector.z;
    if (!this.checkCollision(newPosZ)) {
      this.position.z = newPosZ.z;
    }

    // Apply gravity and vertical movement
    const gravity = CONFIG.PLAYER.GRAVITY;
    this.velocity.y += gravity * deltaTime;

    // Apply vertical velocity
    const newPosY = this.position.clone();
    newPosY.y += this.velocity.y * deltaTime;

    // Check collision for Y movement
    if (!this.checkCollision(newPosY)) {
      this.position.y = newPosY.y;
      this.onGround = false;
    } else {
      // Hit ground or ceiling
      if (this.velocity.y < 0) {
        // Hit ground - find the top of the highest block in player's footprint
        const halfWidth = this.width / 2;
        const minX = Math.floor(this.position.x - halfWidth);
        const maxX = Math.floor(this.position.x + halfWidth);
        const minZ = Math.floor(this.position.z - halfWidth);
        const maxZ = Math.floor(this.position.z + halfWidth);
        
        let highestBlockY = -1;
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            // Check blocks from the attempted new position downward
            const checkY = Math.floor(newPosY.y);
            for (let y = checkY; y >= checkY - 2; y--) {
              if (this.world.isSolid(x, y, z)) {
                highestBlockY = Math.max(highestBlockY, y);
                break;
              }
            }
          }
        }
        
        // Snap to top of the highest block
        if (highestBlockY >= 0) {
          this.position.y = highestBlockY + 1;
          this.onGround = true;
        } else {
          // Fallback: use current position
          this.position.y = Math.floor(newPosY.y) + 1;
          this.onGround = true;
        }
      } else {
        // Hit ceiling - find the bottom of the lowest block above player's head
        const halfWidth = this.width / 2;
        const minX = Math.floor(this.position.x - halfWidth);
        const maxX = Math.floor(this.position.x + halfWidth);
        const minZ = Math.floor(this.position.z - halfWidth);
        const maxZ = Math.floor(this.position.z + halfWidth);
        
        let lowestBlockY = Infinity;
        const headY = Math.floor(newPosY.y + this.height);
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            // Check blocks from the attempted head position upward
            for (let y = headY; y <= headY + 2; y++) {
              if (this.world.isSolid(x, y, z)) {
                lowestBlockY = Math.min(lowestBlockY, y);
                break;
              }
            }
          }
        }
        
        // Snap to just below the lowest block
        if (lowestBlockY !== Infinity) {
          this.position.y = lowestBlockY - this.height - 0.01;
        } else {
          // Fallback
          this.position.y = Math.ceil(newPosY.y + this.height) - this.height - 0.01;
        }
      }
      this.velocity.y = 0;
    }

    this.updateCameraPosition();
  }

  // Jump
  jump() {
    if (this.onGround) {
      const jumpVelocity = Math.sqrt(2 * -CONFIG.PLAYER.GRAVITY * CONFIG.PLAYER.JUMP_HEIGHT);
      this.velocity.y = jumpVelocity;
      this.onGround = false;
    }
  }

  // Get camera for rendering
  getCamera() {
    return this.camera;
  }

  // Get eye position for raycasting
  getEyePosition() {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
  }

  // Get forward direction from camera
  getForwardDirection() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }
}

