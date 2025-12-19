import { Block } from './Block.js';

// Chunk dimensions (hardcoded)
const CHUNK_WIDTH = 16;
const CHUNK_HEIGHT = 128;
const CHUNK_DEPTH = 16;

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.blocks = [];
    this.mesh = null;
    this.needsUpdate = true;

    // Initialize 3D array: blocks[z][y][x]
    for (let z = 0; z < CHUNK_DEPTH; z++) {
      this.blocks[z] = [];
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        this.blocks[z][y] = [];
        for (let x = 0; x < CHUNK_WIDTH; x++) {
          this.blocks[z][y][x] = null; // Air by default
        }
      }
    }
  }

  // Get block at local chunk coordinates (0-15, 0-127, 0-15)
  getBlock(x, y, z) {
    if (this.isOutOfBounds(x, y, z)) {
      return null;
    }
    return this.blocks[z][y][x];
  }

  // Set block at local chunk coordinates
  setBlock(x, y, z, block) {
    if (this.isOutOfBounds(x, y, z)) {
      return false;
    }
    this.blocks[z][y][x] = block;
    this.needsUpdate = true;
    return true;
  }

  // Check if coordinates are out of bounds
  isOutOfBounds(x, y, z) {
    return x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH;
  }

  // Check if chunk is empty (no solid blocks)
  isEmpty() {
    for (let z = 0; z < CHUNK_DEPTH; z++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_WIDTH; x++) {
          const block = this.blocks[z][y][x];
          if (block && block.solid) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Mark chunk as needing mesh update
  markForUpdate() {
    this.needsUpdate = true;
  }
}

