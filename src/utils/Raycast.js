import { CONFIG } from '../config.js';

// DDA (Digital Differential Analyzer) algorithm for voxel raycasting
export function raycast(world, origin, direction, maxDistance = CONFIG.REACH_DISTANCE) {
  // Normalize direction
  const dirLength = Math.sqrt(
    direction.x * direction.x + 
    direction.y * direction.y + 
    direction.z * direction.z
  );
  const dir = {
    x: direction.x / dirLength,
    y: direction.y / dirLength,
    z: direction.z / dirLength
  };

  // Current block position (integer coordinates)
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  // Step direction for each axis
  const stepX = dir.x > 0 ? 1 : -1;
  const stepY = dir.y > 0 ? 1 : -1;
  const stepZ = dir.z > 0 ? 1 : -1;

  // Calculate delta distances
  const deltaX = dir.x === 0 ? Infinity : Math.abs(1 / dir.x);
  const deltaY = dir.y === 0 ? Infinity : Math.abs(1 / dir.y);
  const deltaZ = dir.z === 0 ? Infinity : Math.abs(1 / dir.z);

  // Calculate initial side distances
  let sideDistX, sideDistY, sideDistZ;
  
  if (dir.x < 0) {
    sideDistX = (origin.x - x) * deltaX;
  } else {
    sideDistX = (x + 1 - origin.x) * deltaX;
  }

  if (dir.y < 0) {
    sideDistY = (origin.y - y) * deltaY;
  } else {
    sideDistY = (y + 1 - origin.y) * deltaY;
  }

  if (dir.z < 0) {
    sideDistZ = (origin.z - z) * deltaZ;
  } else {
    sideDistZ = (z + 1 - origin.z) * deltaZ;
  }

  // Face normal (which face was hit)
  let face = null;
  let distance = 0;

  // DDA loop
  while (distance < maxDistance) {
    // Check current block
    const block = world.getBlock(x, y, z);
    if (block && block.solid) {
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

    // Determine which axis to step along
    if (sideDistX < sideDistY && sideDistX < sideDistZ) {
      sideDistX += deltaX;
      x += stepX;
      // When stepping in +X direction, we hit the block's right face (+X)
      // When stepping in -X direction, we hit the block's left face (-X)
      face = stepX > 0 ? 'right' : 'left';
      distance = Math.abs((x - (stepX > 0 ? 0 : 1) - origin.x) / dir.x);
    } else if (sideDistY < sideDistZ) {
      sideDistY += deltaY;
      y += stepY;
      // When stepping in +Y direction, we hit the block's top face (+Y)
      // When stepping in -Y direction, we hit the block's bottom face (-Y)
      face = stepY > 0 ? 'bottom' : 'top';
      distance = Math.abs((y - (stepY > 0 ? 0 : 1) - origin.y) / dir.y);
    } else {
      sideDistZ += deltaZ;
      z += stepZ;
      // When stepping in +Z direction, we hit the block's front face (+Z)
      // When stepping in -Z direction, we hit the block's back face (-Z)
      face = stepZ > 0 ? 'back' : 'front';
      distance = Math.abs((z - (stepZ > 0 ? 0 : 1) - origin.z) / dir.z);
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

