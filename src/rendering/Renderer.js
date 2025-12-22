import * as THREE from 'three';
import { World } from '../world/World.js';
import { generateChunkMesh } from '../utils/VoxelGeometry.js';
import { generateChunkWireframe } from '../utils/WireframeGeometry.js';
import { CONFIG } from '../config.js';

// import { Sky } from 'three/examples/jsm/objects/Sky.js';

// Chunk dimensions (hardcoded)
const CHUNK_WIDTH = 16;
const CHUNK_DEPTH = 16;

export class Renderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.defaultBackground = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.background = this.defaultBackground;
    
    // Load skybox texture
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('/threecraft/assets/skybox/milkyway/');
    this.skyboxTexture = loader.load([
      'px.png', // right
      'nx.png', // left
      'py.png', // top
      'ny.png', // bottom
      'pz.png', // front
      'nz.png'  // back
    ]);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = CONFIG.SHADOWS_ENABLED;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    this.ambientLight = ambientLight;

    // const sky = new Sky();
    // sky.scale.setScalar(450000);
    // this.scene.add(sky);

    // const skyUniforms = sky.material.uniforms;
    // skyUniforms.turbidity.value = 10;
    // skyUniforms.rayleigh.value = 2;
    // skyUniforms.mieCoefficient.value = 0.005;
    // skyUniforms.mieDirectionalG.value = 0.8;

    // const sun = new THREE.Vector3();

    // // elevation: 0..90, azimuth: 0..360
    // const elevation = 45;
    // const azimuth = 180;

    // const phi = THREE.MathUtils.degToRad(90 - elevation);
    // const theta = THREE.MathUtils.degToRad(azimuth);

    // sun.setFromSphericalCoords(1, phi, theta);
    // skyUniforms.sunPosition.value.copy(sun);

    // const hemlight = new THREE.HemisphereLight(0xffffff, 0x7cbd3a, 0.8);
    // this.scene.add(hemlight);

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

    // Spotlight (flashlight) at player position
    const spotLight = new THREE.SpotLight(0xffffff, 1.3, 50, Math.PI / 3.5, 0.3, 1);
    spotLight.position.set(0, 0, 0);
    spotLight.castShadow = CONFIG.SHADOWS_ENABLED;
    spotLight.visible = false; // Disabled by default
    this.scene.add(spotLight);
    // Add target to scene so spotlight can point at it
    this.scene.add(spotLight.target);
    this.spotLight = spotLight;

    // const light = new THREE.HemisphereLight(0x87ceeb, 0x444444, 1);
    // this.scene.add(light);

    // Store chunk meshes
    this.chunkMeshes = new Map();
    this.chunkWireframes = new Map();
    this.wireframeVisible = false;
    this.highlightBox = null;
    // Cache materials for reuse
    this.chunkMaterial = null;
    this.wireframeMaterial = null;
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

  // Update chunk meshes (incremental - processes max 1 chunk per call)
  updateChunkMeshes() {
    if (!this.world) return;

    const chunksToUpdate = this.world.getChunksNeedingUpdate();
    
    // Process only the first chunk to avoid blocking the frame
    if (chunksToUpdate.length > 0) {
      const chunk = chunksToUpdate[0];
      
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
        // Reuse material instance if available, otherwise create new one
        let material = this.chunkMaterial;
        if (!material) {
          material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.FrontSide
          });
          this.chunkMaterial = material; // Cache for reuse
        }

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
        // Reuse wireframe material if available
        let wireframeMaterial = this.wireframeMaterial;
        if (!wireframeMaterial) {
          wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 1,
            transparent: true,
            opacity: 0.3
          });
          this.wireframeMaterial = wireframeMaterial; // Cache for reuse
        }

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

  // Toggle lights visibility
  toggleLights() {
    if (this.ambientLight && this.directionalLight) {
      // Check if lights are currently on by checking intensity
      // Kind of a dumb system but I'll fix it later
      const lightsCurrentlyOn = this.directionalLight.intensity > 0.5;
      
      if (lightsCurrentlyOn) {
        // Turning lights off - use dim ambient light and show skybox
        this.ambientLight.intensity = 0.075;
        this.directionalLight.intensity = 0.075;
        this.directionalLight.castShadow = false;
        this.scene.background = this.skyboxTexture;
      } else {
        // Turning lights on - use bright ambient light and show default background
        this.ambientLight.intensity = 0.5;
        this.directionalLight.intensity = 1;
        this.directionalLight.castShadow = CONFIG.SHADOWS_ENABLED;
        this.scene.background = this.defaultBackground;
      }
    }
  }

  // Toggle spotlight visibility
  toggleSpotLight() {
    if (this.spotLight) {
      this.spotLight.visible = !this.spotLight.visible;
    }
  }

  // Update spotlight position and direction to follow player
  updateSpotLight(eyePosition, forwardDirection) {
    if (this.spotLight) {
      // Position spotlight at player's eye position
      this.spotLight.position.copy(eyePosition);
      // Point spotlight in the direction player is looking
      this.spotLight.target.position.copy(eyePosition).add(forwardDirection);
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

