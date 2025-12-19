import * as THREE from 'three';
import { Block } from '../world/Block.js';

// Optimized voxel mesh generation
export function generateChunkMesh(chunk, chunkX, chunkZ) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vertexOffset = 0;

  const CHUNK_WIDTH = 16;
  const CHUNK_HEIGHT = 128;
  const CHUNK_DEPTH = 16;

  // Helper to check if a block is solid
  function isSolid(x, y, z) {
    const block = chunk.getBlock(x, y, z);
    return block && block.solid;
  }

  // Helper to get block color
  function getBlockColor(x, y, z) {
    const block = chunk.getBlock(x, y, z);
    return block ? block.color : 0xffffff;
  }

  // Add a face to the geometry
  function addFace(x, y, z, face, color) {
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    // Define face vertices based on face direction
    let faceVertices, faceNormal;
    
    switch(face) {
      case 'top': // +Y
        faceVertices = [
          [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]
        ];
        faceNormal = [0, 1, 0];
        break;
      case 'bottom': // -Y
        faceVertices = [
          [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [x, y, z]
        ];
        faceNormal = [0, -1, 0];
        break;
      case 'front': // +Z
        faceVertices = [
          [x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]
        ];
        faceNormal = [0, 0, 1];
        break;
      case 'back': // -Z
        faceVertices = [
          [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z], [x, y, z]
        ];
        faceNormal = [0, 0, -1];
        break;
      case 'right': // +X
        faceVertices = [
          [x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]
        ];
        faceNormal = [1, 0, 0];
        break;
      case 'left': // -X
        faceVertices = [
          [x, y, z + 1], [x, y, z], [x, y + 1, z], [x, y + 1, z + 1]
        ];
        faceNormal = [-1, 0, 0];
        break;
    }

    // Add vertices
    for (const vertex of faceVertices) {
      vertices.push(...vertex);
      normals.push(...faceNormal);
      colors.push(r, g, b);
    }

    // Add indices (two triangles per face)
    // Clockwise winding when viewed from outside (normal direction)
    // This makes faces visible from the outside with FrontSide
    indices.push(
      vertexOffset, vertexOffset + 2, vertexOffset + 1,
      vertexOffset, vertexOffset + 3, vertexOffset + 2
    );

    vertexOffset += 4;
  }

  // Generate mesh by checking each block and its neighbors
  for (let z = 0; z < CHUNK_DEPTH; z++) {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        if (!isSolid(x, y, z)) continue;

        const color = getBlockColor(x, y, z);

        // Check each face and add if neighbor is air or outside chunk
        // Top face
        if (y === CHUNK_HEIGHT - 1 || !isSolid(x, y + 1, z)) {
          addFace(x, y, z, 'top', color);
        }

        // Bottom face
        if (y === 0 || !isSolid(x, y - 1, z)) {
          addFace(x, y, z, 'bottom', color);
        }

        // Front face (+Z)
        if (z === CHUNK_DEPTH - 1 || !isSolid(x, y, z + 1)) {
          addFace(x, y, z, 'front', color);
        }

        // Back face (-Z)
        if (z === 0 || !isSolid(x, y, z - 1)) {
          addFace(x, y, z, 'back', color);
        }

        // Right face (+X)
        if (x === CHUNK_WIDTH - 1 || !isSolid(x + 1, y, z)) {
          addFace(x, y, z, 'right', color);
        }

        // Left face (-X)
        if (x === 0 || !isSolid(x - 1, y, z)) {
          addFace(x, y, z, 'left', color);
        }
      }
    }
  }

  if (vertices.length === 0) {
    return null; // Empty chunk
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

