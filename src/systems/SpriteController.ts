import Phaser from 'phaser';

// Direction indices matching spritesheet rows: N=0, NE=1, E=2, SE=3, S=4, SW=5, W=6, NW=7
export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

function angleToDir(angleDeg: number): Direction {
  const a = ((angleDeg % 360) + 360) % 360;
  const index = Math.round(a / 45) % 8;
  // atan2 y-down: index 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE → sheet rows N=0,NE=1,E=2,SE=3,S=4,SW=5,W=6,NW=7
  const remap: Direction[] = [2, 3, 4, 5, 6, 7, 0, 1];
  return remap[index];
}

const frames = (key: string, totalCols: number, row: number, useCols: number, startCol = 0) =>
  Array.from({ length: useCols }, (_, col) => ({ key, frame: row * totalCols + startCol + col }));

export class SpriteController {
  private sprite: Phaser.GameObjects.Sprite;
  private currentDir: Direction = 2; // default face East

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite;
    this.registerAnims();
  }

  private registerAnims(): void {
    const mgr = this.sprite.scene.anims;
    if (mgr.exists('idle_0')) return;

    for (let dir = 0; dir < 8; dir++) {
      mgr.create({ key: `idle_${dir}`,  frames: frames('char_walk', 14, dir,  5, 9), frameRate:  6, repeat: -1 });
      mgr.create({ key: `walk_${dir}`,  frames: frames('char_walk', 14, dir,  9, 0), frameRate: 12, repeat: -1 });
      mgr.create({ key: `atk_${dir}`,   frames: frames('char_atk',   14, dir, 14), frameRate: 16, repeat:  0 });
      mgr.create({ key: `block_${dir}`, frames: frames('char_block', 10, dir, 10), frameRate:  8, repeat: -1 });
      mgr.create({ key: `death_${dir}`, frames: frames('char_death', 11, dir, 11), frameRate:  8, repeat:  0 });
    }
  }

  update(vx: number, vy: number, moving: boolean): void {
    if (vx !== 0 || vy !== 0) {
      this.currentDir = angleToDir(Phaser.Math.RadToDeg(Math.atan2(vy, vx)));
    }
    if (moving) {
      this.sprite.play(`walk_${this.currentDir}`, true);
    } else {
      this.sprite.play(`idle_${this.currentDir}`, true);
    }
  }

  playAction(action: 'atk' | 'block' | 'death'): void {
    this.sprite.play(`${action}_${this.currentDir}`, true);
  }

  setDir(dir: Direction): void {
    this.currentDir = dir;
  }

  getDir(): Direction {
    return this.currentDir;
  }
}
