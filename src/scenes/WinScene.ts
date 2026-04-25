import Phaser from 'phaser';

export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = Math.min(W, H) / 800;
    const round = this.game.registry.get('round') ?? 1;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);

    this.add.text(W / 2, H / 2 - 80 * s, `Round ${round} Complete!`, {
      fontSize: `${Math.round(36 * s)}px`,
      color: '#ffd700',
    }).setOrigin(0.5);

    const btn = this.add.text(W / 2, H / 2 + 20 * s, 'Next Level', {
      fontSize: `${Math.round(24 * s)}px`,
      color: '#ffffff',
      backgroundColor: '#1a6b1a',
      padding: { x: 20 * s, y: 10 * s },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#2e9e2e' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#1a6b1a' }));
    btn.on('pointerdown', () => {
      this.game.registry.set('round', round + 1);
      this.scene.start('ArenaScene');
    });

    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', onResize, this));
  }
}
