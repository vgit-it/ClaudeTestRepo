import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const config = { frameWidth: 138, frameHeight: 111 };
    this.load.spritesheet('char_walk',  'assets/sprites/char_walk.png',  config);
    this.load.spritesheet('char_atk',   'assets/sprites/char_atk.png',   config);
    this.load.spritesheet('char_block', 'assets/sprites/char_block.png', config);
    this.load.spritesheet('char_death', 'assets/sprites/char_death.png', config);
  }

  create(): void {
    this.scene.start('ArenaScene');
  }
}
