import Phaser from 'phaser';

// Frame layout: 8 rows (S,SE,E,NE,N,NW,W,SW) × 4 cols, 64×64 each.
// Two sheets: player_idle, player_run — generated procedurally until real art exists.

const FRAME_W = 64;
const FRAME_H = 64;
const COLS = 4;
const ROWS = 8;

const DIR_COLORS: number[] = [
  0x4fc3f7, // S
  0x81d4fa, // SE
  0x29b6f6, // E
  0x0288d1, // NE
  0x01579b, // N
  0x0277bd, // NW
  0x039be5, // W
  0x03a9f4, // SW
];

function makeSheet(scene: Phaser.Scene, key: string, bodyColor: number, dotColor: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * COLS;
  canvas.height = FRAME_H * ROWS;
  const ctx = canvas.getContext('2d')!;

  for (let row = 0; row < ROWS; row++) {
    const dirColor = DIR_COLORS[row];
    for (let col = 0; col < COLS; col++) {
      const x = col * FRAME_W;
      const y = row * FRAME_H;

      // Body
      ctx.fillStyle = `#${bodyColor.toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.ellipse(x + 32, y + 36, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Direction pip (shows which way we face)
      ctx.fillStyle = `#${dirColor.toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.arc(x + 32, y + 20, 8, 0, Math.PI * 2);
      ctx.fill();

      // Frame indicator dot (to make animation visible)
      ctx.fillStyle = `#${dotColor.toString(16).padStart(6, '0')}`;
      const dotOffsets = [[8, 8], [FRAME_W - 16, 8], [8, FRAME_H - 16], [FRAME_W - 16, FRAME_H - 16]];
      const [dx, dy] = dotOffsets[col];
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  scene.textures.addSpriteSheet(key, canvas, { frameWidth: FRAME_W, frameHeight: FRAME_H });
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    makeSheet(this, 'player_idle', 0xe8f5e9, 0xffffff);
    makeSheet(this, 'player_run', 0xc8e6c9, 0xffeb3b);

    this.scene.start('ArenaScene');
  }
}
