import { Chunk } from './Chunk.js';
import { Block } from './Block.js';
import { CONFIG } from '../config.js';

export class World {
  constructor() {
    this.chunks = new Map();
    this.chunkMeshes = new Map();
    this.generateWorld();
  }

  // Generate a flat world
  generateWorld() {
    const { WIDTH, DEPTH } = CONFIG.WORLD_SIZE;
    const { WIDTH: CHUNK_WIDTH, DEPTH: CHUNK_DEPTH } = CONFIG.CHUNK_SIZE;

    // Generate chunks
    for (let chunkZ = 0; chunkZ < DEPTH; chunkZ++) {
      for (let chunkX = 0; chunkX < WIDTH; chunkX++) {
        const chunk = new Chunk(chunkX, chunkZ);
        
        // Fill bottom layer with grass blocks (flat world)
        for (let z = 0; z < CHUNK_DEPTH; z++) {
          for (let x = 0; x < CHUNK_WIDTH; x++) {
            chunk.setBlock(x, 0, z, new Block('GRASS'));
          }
        }

        const key = this.getChunkKey(chunkX, chunkZ);
        this.chunks.set(key, chunk);
      }
    }
  }

  // Get chunk key for map storage
  getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
  }

  // Convert world coordinates to chunk coordinates
  worldToChunk(worldX, worldZ) {
    const { WIDTH: CHUNK_WIDTH, DEPTH: CHUNK_DEPTH } = CONFIG.CHUNK_SIZE;
    const chunkX = Math.floor(worldX / CHUNK_WIDTH);
    const chunkZ = Math.floor(worldZ / CHUNK_DEPTH);
    return { chunkX, chunkZ };
  }

  // Convert world coordinates to local chunk coordinates
  worldToLocal(worldX, worldY, worldZ) {
    const { WIDTH: CHUNK_WIDTH, DEPTH: CHUNK_DEPTH } = CONFIG.CHUNK_SIZE;
    const chunkX = Math.floor(worldX / CHUNK_WIDTH);
    const chunkZ = Math.floor(worldZ / CHUNK_DEPTH);
    const localX = worldX - chunkX * CHUNK_WIDTH;
    const localZ = worldZ - chunkZ * CHUNK_DEPTH;
    return { chunkX, chunkZ, localX, localY: worldY, localZ };
  }

  // Get chunk at chunk coordinates
  getChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    return this.chunks.get(key);
  }

  // Get block at world coordinates
  getBlock(worldX, worldY, worldZ) {
    const { localX, localY, localZ, chunkX, chunkZ } = this.worldToLocal(worldX, worldY, worldZ);
    const chunk = this.getChunk(chunkX, chunkZ);
    if (!chunk) {
      return null;
    }
    return chunk.getBlock(localX, localY, localZ);
  }

  // Set block at world coordinates
  setBlock(worldX, worldY, worldZ, block) {
    const { localX, localY, localZ, chunkX, chunkZ } = this.worldToLocal(worldX, worldY, worldZ);
    const chunk = this.getChunk(chunkX, chunkZ);
    if (!chunk) {
      return false;
    }
    const success = chunk.setBlock(localX, localY, localZ, block);
    if (success) {
      chunk.markForUpdate();
    }
    return success;
  }

  // Check if a block position is solid (for collision)
  isSolid(worldX, worldY, worldZ) {
    const block = this.getBlock(worldX, worldY, worldZ);
    return block && block.solid;
  }

  // Get all chunks that need mesh updates
  getChunksNeedingUpdate() {
    const chunksToUpdate = [];
    for (const [key, chunk] of this.chunks.entries()) {
      if (chunk.needsUpdate) {
        chunksToUpdate.push(chunk);
      }
    }
    return chunksToUpdate;
  }

  // Mark chunk mesh as updated
  markChunkUpdated(chunk) {
    chunk.needsUpdate = false;
  }
}

