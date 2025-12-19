// Configuration for the game
export const CONFIG = {
  // World settings
  // World size in chunks. Must be square
  WORLD_SIZE: {
    WIDTH: 5,
    DEPTH: 5
  },
  
  // Player settings
  PLAYER: {
    SPEED: 5.0,       // default: 5.0
    JUMP_HEIGHT: 8.0, // default: 8.0
    GRAVITY: -25.0,   // default: -25.0
    HEIGHT: 1.8,      // default: 1.8
    WIDTH: 0.6,       // default: 0.6
    EYE_HEIGHT: 1.6,  // default: 1.6
    FLY_SPEED: 10.0,  // default: 10.0
  },
  
  // Block interaction  
  REACH_DISTANCE: 10.0,
  
  // Rendering
  RENDER_DISTANCE: 8,  // chunks
  SHADOWS_ENABLED: true,
  
  // Controls
  TOGGLE_WIREFRAME_KEY: 'KeyG',  // Key to toggle wireframe grid (default: G)
  TOGGLE_FLY_KEY: 'KeyF',
  SHOW_TOUCH_CONTROLS: false,  // Force show touch controls regardless of device
  MOUSE_SENSITIVITY: 0.002,
  TOUCH_SENSITIVITY: 0.005,
  CAMERA_FOV: 75,
  
  // Blocks the player can place
  PLACEABLE_BLOCKS: ['GRASS', 'STONE', 'DIRT']
};

