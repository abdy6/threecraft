import { CONFIG } from '../config.js';
import { Block } from '../world/Block.js';

// DDA (Digital Differential Analyzer) algorithm for voxel raycasting
export function raycast(world, origin, direction, maxDistance = CONFIG.REACH_DISTANCE) {
  // Normalize direction
  const dirLength = Math.sqrt(
    direction.x * direction.x + 
    direction.y * direction.y + 
    direction.z * direction.z
  );
  if (dirLength === 0) {
    return { hit: false };
  }
  
  const dir = {
    x: direction.x / dirLength,
    y: direction.y / dirLength,
    z: direction.z / dirLength
  };

  // Current block position (integer coordinates)
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  // Use a local copy of origin that we can adjust
  let rayOrigin = { x: origin.x, y: origin.y, z: origin.z };

  // Check if we're starting inside a solid block - if so, allow breaking it
  let startBlockId = world.getBlock(x, y, z);
  if (Block.isSolidId(startBlockId)) {
    // We're inside a block, return it immediately so it can be broken
    return {
      hit: true,
      blockX: x,
      blockY: y,
      blockZ: z,
      face: 'top', // Default face since we're inside
      distance: 0
    };
  }

  // Step direction for each axis
  const stepX = dir.x > 0 ? 1 : -1;
  const stepY = dir.y > 0 ? 1 : -1;
  const stepZ = dir.z > 0 ? 1 : -1;

  // Calculate delta distances (distance to next grid line)
  const deltaX = dir.x === 0 ? Infinity : Math.abs(1 / dir.x);
  const deltaY = dir.y === 0 ? Infinity : Math.abs(1 / dir.y);
  const deltaZ = dir.z === 0 ? Infinity : Math.abs(1 / dir.z);

  // Calculate initial side distances (distance to first grid line)
  let sideDistX, sideDistY, sideDistZ;
  
  if (dir.x < 0) {
    sideDistX = (rayOrigin.x - x) * deltaX;
  } else {
    sideDistX = (x + 1.0 - rayOrigin.x) * deltaX;
  }

  if (dir.y < 0) {
    sideDistY = (rayOrigin.y - y) * deltaY;
  } else {
    sideDistY = (y + 1.0 - rayOrigin.y) * deltaY;
  }

  if (dir.z < 0) {
    sideDistZ = (rayOrigin.z - z) * deltaZ;
  } else {
    sideDistZ = (z + 1.0 - rayOrigin.z) * deltaZ;
  }

  // Face normal (which face was hit)
  let face = null;
  let distance = 0;

  // DDA loop
  while (distance < maxDistance) {
    // Determine which axis to step along (choose the one with smallest side distance)
    if (sideDistX < sideDistY && sideDistX < sideDistZ) {
      // Step along X axis
      distance = sideDistX;
      sideDistX += deltaX;
      x += stepX;
      // When stepping in +X direction, we hit the block's right face (+X)
      // When stepping in -X direction, we hit the block's left face (-X)
      face = stepX > 0 ? 'right' : 'left';
    } else if (sideDistY < sideDistZ) {
      // Step along Y axis
      distance = sideDistY;
      sideDistY += deltaY;
      y += stepY;
      
      face = stepY > 0 ? 'bottom' : 'top';
    } else {
      // Step along Z axis
      distance = sideDistZ;
      sideDistZ += deltaZ;
      z += stepZ;
      
      face = stepZ > 0 ? 'back' : 'front';
    }

    // Check the block we just stepped into
    const blockId = world.getBlock(x, y, z);
    if (Block.isSolidId(blockId)) {
      // Hit a solid block
      return {
        hit: true,
        blockX: x,
        blockY: y,
        blockZ: z,
        face: face,
        distance: distance
      };
    }
  }

  // No hit
  return {
    hit: false
  };
}

// Get the position where a new block should be placed (adjacent to hit face)
export function getPlacePosition(raycastResult) {
  if (!raycastResult.hit) return null;

  const { blockX, blockY, blockZ, face } = raycastResult;
  const offsets = {
    'top': { x: 0, y: 1, z: 0 },
    'bottom': { x: 0, y: -1, z: 0 },
    'front': { x: 0, y: 0, z: 1 },
    'back': { x: 0, y: 0, z: -1 },
    'left': { x: 1, y: 0, z: 0 },
    'right': { x: -1, y: 0, z: 0 }
  };

  const offset = offsets[face];
  if (!offset) return null;

  return {
    x: blockX + offset.x,
    y: blockY + offset.y,
    z: blockZ + offset.z
  };
}

