import * as THREE from 'three';
import { World } from '../world/World.js';
import { generateChunkMesh } from '../utils/VoxelGeometry.js';
import { generateChunkWireframe } from '../utils/WireframeGeometry.js';
import { CONFIG } from '../config.js';

// Chunk dimensions (hardcoded)
const CHUNK_WIDTH = 16;
const CHUNK_DEPTH = 16;

export class Renderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = CONFIG.SHADOWS_ENABLED;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = CONFIG.SHADOWS_ENABLED;

    // Shadow setup (only if shadows are enabled)
    if (CONFIG.SHADOWS_ENABLED) {
      const half = CONFIG.WORLD_SIZE.WIDTH * CHUNK_WIDTH / 2;

      // Center shadows over the middle of the world
      directionalLight.position.set(50, 100, 50);
      directionalLight.target.position.set(half, 0, half);
      this.scene.add(directionalLight.target);

      // Make the shadow camera cover the whole world
      directionalLight.shadow.camera.left   = -half;
      directionalLight.shadow.camera.right  =  half;
      directionalLight.shadow.camera.top    =  half;
      directionalLight.shadow.camera.bottom = -half;

      // Shadow depth range
      directionalLight.shadow.camera.near = 1;
      directionalLight.shadow.camera.far  = 250;

      // Reduce acne
      directionalLight.shadow.bias = -0.0005;

      // const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
      // this.scene.add(helper);
      // this.shadowHelper = helper;
    }

    this.scene.add(directionalLight);
    this.directionalLight = directionalLight;

    // const light = new THREE.HemisphereLight(0x87ceeb, 0x444444, 1);
    // this.scene.add(light);

    // Store chunk meshes
    this.chunkMeshes = new Map();
    this.chunkWireframes = new Map();
    this.wireframeVisible = false;
    this.highlightBox = null;
    this.setupHighlightBox();

    // Store camera reference for resize
    this.camera = null;
  }

  setupHighlightBox() {
    // Create a wireframe box to highlight selected blocks
    const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    this.highlightBox = new THREE.Mesh(geometry, material);
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);
  }

  // Initialize world meshes
  initializeWorld(world) {
    this.world = world;
    // Mark all chunks for update to ensure wireframes are generated
    for (const chunk of world.chunks.values()) {
      chunk.markForUpdate();
    }
    this.updateChunkMeshes();
  }

  // Update chunk meshes
  updateChunkMeshes() {
    if (!this.world) return;

    const chunksToUpdate = this.world.getChunksNeedingUpdate();

    for (const chunk of chunksToUpdate) {
      // Remove old mesh if it exists
      const key = `${chunk.chunkX},${chunk.chunkZ}`;
      const oldMesh = this.chunkMeshes.get(key);
      if (oldMesh) {
        this.scene.remove(oldMesh);
        oldMesh.geometry.dispose();
        oldMesh.material.dispose();
      }

      // Remove old wireframe if it exists
      const oldWireframe = this.chunkWireframes.get(key);
      if (oldWireframe) {
        this.scene.remove(oldWireframe);
        oldWireframe.geometry.dispose();
        oldWireframe.material.dispose();
      }

      // Generate new mesh
      const geometry = generateChunkMesh(chunk, chunk.chunkX, chunk.chunkZ);
      
      if (geometry) {
        const material = new THREE.MeshLambertMaterial({
          vertexColors: true,
          side: THREE.FrontSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Enable shadows on mesh if shadows are enabled
        if (CONFIG.SHADOWS_ENABLED) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
        
        // Position mesh at world coordinates
        mesh.position.set(
          chunk.chunkX * CHUNK_WIDTH,
          0,
          chunk.chunkZ * CHUNK_DEPTH
        );

        this.scene.add(mesh);
        this.chunkMeshes.set(key, mesh);
      }

      // Generate wireframe
      const wireframeGeometry = generateChunkWireframe(chunk, chunk.chunkX, chunk.chunkZ);
      if (wireframeGeometry) {
        const wireframeMaterial = new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 1,
          transparent: true,
          opacity: 0.3
        });

        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        
        wireframe.position.set(
          chunk.chunkX * CHUNK_WIDTH,
          0,
          chunk.chunkZ * CHUNK_DEPTH
        );

        wireframe.visible = this.wireframeVisible;
        this.scene.add(wireframe);
        this.chunkWireframes.set(key, wireframe);
      }

      this.world.markChunkUpdated(chunk);
    }
  }

  // Toggle wireframe visibility
  toggleWireframe() {
    this.wireframeVisible = !this.wireframeVisible;
    for (const wireframe of this.chunkWireframes.values()) {
      wireframe.visible = this.wireframeVisible;
    }
  }

  // Update highlight box based on raycast
  updateHighlight(raycastResult) {
    if (raycastResult && raycastResult.hit) {
      this.highlightBox.position.set(
        raycastResult.blockX + 0.5,
        raycastResult.blockY + 0.5,
        raycastResult.blockZ + 0.5
      );
      this.highlightBox.visible = true;
    } else {
      this.highlightBox.visible = false;
    }
  }

  // Render the scene
  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  // Handle window resize
  onWindowResize(camera) {
    if (this.renderer && camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Get the canvas element
  get domElement() {
    return this.renderer.domElement;
  }
}

