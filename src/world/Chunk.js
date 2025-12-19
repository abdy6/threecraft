import { Block } from './Block.js';
import { CONFIG } from '../config.js';

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.blocks = [];
    this.mesh = null;
    this.needsUpdate = true;

    // Initialize 3D array: blocks[z][y][x]
    const { WIDTH, HEIGHT, DEPTH } = CONFIG.CHUNK_SIZE;
    for (let z = 0; z < DEPTH; z++) {
      this.blocks[z] = [];
      for (let y = 0; y < HEIGHT; y++) {
        this.blocks[z][y] = [];
        for (let x = 0; x < WIDTH; x++) {
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
    const { WIDTH, HEIGHT, DEPTH } = CONFIG.CHUNK_SIZE;
    return x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || z < 0 || z >= DEPTH;
  }

  // Check if chunk is empty (no solid blocks)
  isEmpty() {
    const { WIDTH, HEIGHT, DEPTH } = CONFIG.CHUNK_SIZE;
    for (let z = 0; z < DEPTH; z++) {
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
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

