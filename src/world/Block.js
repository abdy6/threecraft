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
    }
  };

  // Helper method to check if a block is air
  static isAir(block) {
    return !block || block.type === 'AIR' || !block.solid;
  }

  // Register a new block type
  static register(type, properties) {
    Block.REGISTRY[type] = properties;
  }
}

