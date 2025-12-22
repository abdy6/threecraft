// Block type registry and definitions
export class Block {
  constructor(type) {
    this.type = type;
    this.properties = Block.REGISTRY[type] || Block.REGISTRY.AIR;
  }

  get solid() {
    return this.properties.solid;
  }

  get color() {
    return this.properties.color;
  }

  // String-based registry for backward compatibility
  static REGISTRY = {
    AIR: {
      solid: false,
      color: null
    },
    GRASS: {
      solid: true,
      color: 0x7cbd3a
    },
    STONE: {
      solid: true,
      color: 0x808080
    },
    DIRT: {
      solid: true,
      color: 0x422b1f
    }
  };

  // Numeric ID constants
  static ID = {
    AIR: 0,
    GRASS: 1,
    STONE: 2,
    DIRT: 3
  };

  // Map from type string to ID
  static TYPE_TO_ID = {
    'AIR': 0,
    'GRASS': 1,
    'STONE': 2,
    'DIRT': 3
  };

  // Map from ID to type string
  static ID_TO_TYPE = {
    0: 'AIR',
    1: 'GRASS',
    2: 'STONE',
    3: 'DIRT'
  };

  // Get numeric ID from type string
  static getId(type) {
    return Block.TYPE_TO_ID[type] ?? Block.ID.AIR;
  }

  // Get type string from numeric ID
  static getType(id) {
    return Block.ID_TO_TYPE[id] ?? 'AIR';
  }

  // Get properties directly from numeric ID
  static getProperties(id) {
    const type = Block.getType(id);
    return Block.REGISTRY[type] || Block.REGISTRY.AIR;
  }

  // Check if a block ID is air
  static isAirId(id) {
    return id === Block.ID.AIR || id === 0 || id === null || id === undefined;
  }

  // Helper method to check if a block is air (backward compatibility)
  static isAir(block) {
    if (typeof block === 'number') {
      return Block.isAirId(block);
    }
    return !block || block.type === 'AIR' || !block.solid;
  }

  // Check if a block ID is solid
  static isSolidId(id) {
    if (Block.isAirId(id)) return false;
    const props = Block.getProperties(id);
    return props.solid === true;
  }

  // Get color from block ID
  static getColorId(id) {
    const props = Block.getProperties(id);
    return props.color ?? 0xffffff;
  }

  // Register a new block type
  static register(type, properties) {
    Block.REGISTRY[type] = properties;
    // Auto-assign next available ID
    const maxId = Math.max(...Object.values(Block.ID_TO_TYPE).map((_, id) => id));
    const newId = maxId + 1;
    Block.TYPE_TO_ID[type] = newId;
    Block.ID_TO_TYPE[newId] = type;
    Block.ID[type] = newId;
  }
}

