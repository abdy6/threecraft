// Configuration for the game
export const CONFIG = {
  // World settings
  CHUNK_SIZE: {
    WIDTH: 16,
    HEIGHT: 128,
    DEPTH: 16
  },
  WORLD_SIZE: {
    WIDTH: 5,  // chunks
    DEPTH: 5   // chunks
  },
  
  // Player settings
  PLAYER: {
    SPEED: 5.0,
    JUMP_HEIGHT: 8.0,
    GRAVITY: -25.0,
    HEIGHT: 1.8,
    WIDTH: 0.6,
    EYE_HEIGHT: 1.6
  },
  
  // Block interaction
  REACH_DISTANCE: 10.0,
  
  // Rendering
  RENDER_DISTANCE: 8,  // chunks (for future infinite world)
  
  // Controls
  TOGGLE_WIREFRAME_KEY: 'KeyG',  // Key to toggle wireframe grid (default: G)
  
  // Placeable blocks (blocks the player can place)
  PLACEABLE_BLOCKS: ['GRASS', 'STONE', 'DIRT']  // Add more block types here as you create them
};

