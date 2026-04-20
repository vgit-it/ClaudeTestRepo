import Phaser from 'phaser';
import { Player } from '../entities/Player';

const ARENA_CX = 640;
const ARENA_CY = 360;
const ARENA_RADIUS = 300;

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private arenaGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(): void {
    this.drawArena();
    this.player = new Player(this, ARENA_CX, ARENA_CY);
  }

  private drawArena(): void {
    this.arenaGraphics = this.add.graphics();

    // Dirt floor
    this.arenaGraphics.fillStyle(0x5d4037, 1);
    this.arenaGraphics.fillCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS);

    // Arena wall ring
    this.arenaGraphics.lineStyle(8, 0x8d6e63, 1);
    this.arenaGraphics.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS);

    // Inner detail ring
    this.arenaGraphics.lineStyle(2, 0x6d4c41, 0.5);
    this.arenaGraphics.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS - 20);

    // Center marker
    this.arenaGraphics.fillStyle(0x6d4c41, 0.4);
    this.arenaGraphics.fillCircle(ARENA_CX, ARENA_CY, 40);
  }

  update(): void {
    this.player.update();
  }
}
