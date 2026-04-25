import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = Math.min(W, H) / 800;
    const round = this.game.registry.get('round') ?? 1;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8);

    this.add.text(W / 2, H / 2 - 80 * s, 'Game Over', {
      fontSize: `${Math.round(40 * s)}px`,
      color: '#e53935',
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 - 20 * s, `Reached Round ${round}`, {
      fontSize: `${Math.round(22 * s)}px`,
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const btn = this.add.text(W / 2, H / 2 + 60 * s, 'Play Again', {
      fontSize: `${Math.round(24 * s)}px`,
      color: '#ffffff',
      backgroundColor: '#8b0000',
      padding: { x: 20 * s, y: 10 * s },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#b71c1c' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#8b0000' }));
    btn.on('pointerdown', () => {
      this.game.registry.set('round', 1);
      this.scene.start('ArenaScene');
    });

    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', onResize, this));
  }
}
