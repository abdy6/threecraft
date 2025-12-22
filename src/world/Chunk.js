import { Block } from './Block.js';

// Chunk dimensions (hardcoded)
const CHUNK_WIDTH = 16;
const CHUNK_HEIGHT = 128;
const CHUNK_DEPTH = 16;
const CHUNK_SIZE = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH; // 32,768

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    // Use Uint8Array for efficient block ID storage (16×128×16 = 32,768 bytes)
    this.blocks = new Uint8Array(CHUNK_SIZE);
    // Initialize all blocks to AIR (0)
    this.blocks.fill(Block.ID.AIR);
    this.mesh = null;
    this.needsUpdate = true;
  }

  // Convert 3D coordinates to flat array index
  // Index = z * (WIDTH * HEIGHT) + y * WIDTH + x
  _getIndex(x, y, z) {
    return z * (CHUNK_WIDTH * CHUNK_HEIGHT) + y * CHUNK_WIDTH + x;
  }

  // Get block ID at local chunk coordinates (0-15, 0-127, 0-15)
  getBlock(x, y, z) {
    if (this.isOutOfBounds(x, y, z)) {
      return Block.ID.AIR;
    }
    return this.blocks[this._getIndex(x, y, z)];
  }

  // Set block ID at local chunk coordinates
  // Accepts either numeric ID or Block instance/type string for backward compatibility
  setBlock(x, y, z, block) {
    if (this.isOutOfBounds(x, y, z)) {
      return false;
    }
    
    let blockId;
    if (typeof block === 'number') {
      blockId = block;
    } else if (block === null || block === undefined) {
      blockId = Block.ID.AIR;
    } else if (typeof block === 'string') {
      blockId = Block.getId(block);
    } else if (block && block.type) {
      // Block instance
      blockId = Block.getId(block.type);
    } else {
      blockId = Block.ID.AIR;
    }
    
    this.blocks[this._getIndex(x, y, z)] = blockId;
    this.needsUpdate = true;
    return true;
  }

  // Get block ID directly (explicit method)
  getBlockId(x, y, z) {
    return this.getBlock(x, y, z);
  }

  // Set block ID directly (explicit method)
  setBlockId(x, y, z, id) {
    return this.setBlock(x, y, z, id);
  }

  // Check if coordinates are out of bounds
  isOutOfBounds(x, y, z) {
    return x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH;
  }

  // Check if chunk is empty (no solid blocks)
  isEmpty() {
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const blockId = this.blocks[i];
      if (Block.isSolidId(blockId)) {
        return false;
      }
    }
    return true;
  }

  // Mark chunk as needing mesh update
  markForUpdate() {
    this.needsUpdate = true;
  }
}

