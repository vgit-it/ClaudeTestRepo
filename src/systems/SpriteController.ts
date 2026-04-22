import Phaser from 'phaser';

// Direction indices matching spritesheet rows: S=0, SE=1, E=2, NE=3, N=4, NW=5, W=6, SW=7
export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Maps atan2 angle (degrees, -180..180) to 8-direction index
function angleToDir(angleDeg: number): Direction {
  // Remap to 0..360
  const a = ((angleDeg % 360) + 360) % 360;
  // Each sector is 45°, offset by 22.5° so S (270°) is centered
  const index = Math.round(a / 45) % 8;
  // atan2 with y-down: 0°=E, 90°=S, 180°=W, 270°=N
  // Remap to our row order: S=0,SE=1,E=2,NE=3,N=4,NW=5,W=6,SW=7
  const remap: Direction[] = [2, 1, 0, 7, 6, 5, 4, 3];
  return remap[index];
}

export class SpriteController {
  private sprite: Phaser.GameObjects.Sprite;
  private currentDir: Direction = 0;
  private animsRegistered = false;

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite;
    this.registerAnims();
  }

  private registerAnims(): void {
    if (this.animsRegistered) return;
    this.animsRegistered = true;

    const mgr = this.sprite.scene.anims;
    const COLS = 4;

    const framesForRow = (textureKey: string, row: number, count: number) =>
      Array.from({ length: count }, (_, col) => ({
        key: textureKey,
        frame: row * COLS + col,
      }));

    for (let dir = 0; dir < 8; dir++) {
      mgr.create({
        key: `idle_${dir}`,
        frames: framesForRow('player_idle', dir, 4),
        frameRate: 6,
        repeat: -1,
      });
      mgr.create({
        key: `run_${dir}`,
        frames: framesForRow('player_run', dir, 4),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  update(vx: number, vy: number, moving: boolean): void {
    if (moving) {
      const angleDeg = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
      this.currentDir = angleToDir(angleDeg);
      this.sprite.play(`run_${this.currentDir}`, true);
    } else {
      this.sprite.play(`idle_${this.currentDir}`, true);
    }
  }

  getDir(): Direction {
    return this.currentDir;
  }
}
