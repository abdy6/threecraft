import * as THREE from 'three';

// Generate wireframe edges for visible block faces
export function generateChunkWireframe(chunk, chunkX, chunkZ) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
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

  // Add an edge (line segment) between two points
  function addEdge(v1, v2) {
    vertices.push(...v1, ...v2);
    indices.push(vertexOffset, vertexOffset + 1);
    vertexOffset += 2;
  }

  // Generate wireframe edges for visible faces
  for (let z = 0; z < CHUNK_DEPTH; z++) {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        if (!isSolid(x, y, z)) continue;

        // Top face edges
        if (y === CHUNK_HEIGHT - 1 || !isSolid(x, y + 1, z)) {
          // Top face: 4 edges
          addEdge([x, y + 1, z], [x + 1, y + 1, z]);           // Front edge
          addEdge([x + 1, y + 1, z], [x + 1, y + 1, z + 1]);   // Right edge
          addEdge([x + 1, y + 1, z + 1], [x, y + 1, z + 1]);   // Back edge
          addEdge([x, y + 1, z + 1], [x, y + 1, z]);           // Left edge
        }

        // Bottom face edges
        if (y === 0 || !isSolid(x, y - 1, z)) {
          // Bottom face: 4 edges
          addEdge([x, y, z + 1], [x + 1, y, z + 1]);           // Back edge
          addEdge([x + 1, y, z + 1], [x + 1, y, z]);           // Right edge
          addEdge([x + 1, y, z], [x, y, z]);                   // Front edge
          addEdge([x, y, z], [x, y, z + 1]);                   // Left edge
        }

        // Front face edges (+Z)
        if (z === CHUNK_DEPTH - 1 || !isSolid(x, y, z + 1)) {
          // Front face: 4 edges
          addEdge([x, y, z + 1], [x, y + 1, z + 1]);           // Left edge
          addEdge([x, y + 1, z + 1], [x + 1, y + 1, z + 1]);   // Top edge
          addEdge([x + 1, y + 1, z + 1], [x + 1, y, z + 1]);   // Right edge
          addEdge([x + 1, y, z + 1], [x, y, z + 1]);           // Bottom edge
        }

        // Back face edges (-Z)
        if (z === 0 || !isSolid(x, y, z - 1)) {
          // Back face: 4 edges
          addEdge([x + 1, y, z], [x + 1, y + 1, z]);           // Right edge
          addEdge([x + 1, y + 1, z], [x, y + 1, z]);           // Top edge
          addEdge([x, y + 1, z], [x, y, z]);                   // Left edge
          addEdge([x, y, z], [x + 1, y, z]);                   // Bottom edge
        }

        // Right face edges (+X)
        if (x === CHUNK_WIDTH - 1 || !isSolid(x + 1, y, z)) {
          // Right face: 4 edges
          addEdge([x + 1, y, z], [x + 1, y, z + 1]);           // Bottom edge
          addEdge([x + 1, y, z + 1], [x + 1, y + 1, z + 1]);   // Back edge
          addEdge([x + 1, y + 1, z + 1], [x + 1, y + 1, z]);   // Top edge
          addEdge([x + 1, y + 1, z], [x + 1, y, z]);           // Front edge
        }

        // Left face edges (-X)
        if (x === 0 || !isSolid(x - 1, y, z)) {
          // Left face: 4 edges
          addEdge([x, y, z + 1], [x, y, z]);                   // Bottom edge
          addEdge([x, y, z], [x, y + 1, z]);                   // Front edge
          addEdge([x, y + 1, z], [x, y + 1, z + 1]);           // Top edge
          addEdge([x, y + 1, z + 1], [x, y, z + 1]);           // Back edge
        }
      }
    }
  }

  if (vertices.length === 0) {
    return null; // Empty chunk
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);

  return geometry;
}

