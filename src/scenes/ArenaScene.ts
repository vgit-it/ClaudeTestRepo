import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { CombatSystem } from '../systems/CombatSystem';

const IMAGE_SIZE      = 1254;
const CIRCLE_FRACTION = 0.80; // inner stone-ring edge as fraction of image half-size; tune if needed

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private combatSystem!: CombatSystem;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private arenaCx!: number;
  private arenaCy!: number;
  private arenaRadius!: number;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.arenaCx = W / 2;
    this.arenaCy = H / 2;

    // portrait: fill width; landscape: fill height — single formula covers both
    const imgScale = Math.min(W, H) / IMAGE_SIZE * 1.5;
    this.arenaRadius = (IMAGE_SIZE / 2) * CIRCLE_FRACTION * imgScale;

    const bg = this.add.image(this.arenaCx, this.arenaCy, 'arena_bg');
    bg.setScale(imgScale);
    bg.setDepth(-1);

    this.player = new Player(this, this.arenaCx, this.arenaCy);
    this.enemies = [new Enemy(this, this.arenaCx + 160, this.arenaCy, this.player)];

    this.player.sprite.setScale(imgScale * 2.5);
    for (const enemy of this.enemies) enemy.sprite.setScale(imgScale * 2.5);

    this.combatSystem = new CombatSystem();
    this.hudGfx = this.add.graphics();
    this.debugGfx = this.add.graphics();
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    for (const enemy of this.enemies) enemy.update(delta);
    this.combatSystem.update(this.player, this.enemies);

    this.clampToArena(this.player.sprite);
    for (const enemy of this.enemies) this.clampToArena(enemy.sprite);

    this.drawDebugHitbox();
    this.drawHud();
  }

  private clampToArena(sprite: Phaser.Physics.Arcade.Sprite): void {
    const dx = sprite.x - this.arenaCx;
    const dy = sprite.y - this.arenaCy;
    const dist = Math.hypot(dx, dy);
    if (dist > this.arenaRadius) {
      sprite.x = this.arenaCx + (dx / dist) * this.arenaRadius;
      sprite.y = this.arenaCy + (dy / dist) * this.arenaRadius;
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const radialVel = (body.velocity.x * dx + body.velocity.y * dy) / dist;
      if (radialVel > 0) {
        body.setVelocity(
          body.velocity.x - radialVel * (dx / dist),
          body.velocity.y - radialVel * (dy / dist),
        );
      }
    }
  }

  private drawDebugHitbox(): void {
    this.debugGfx.clear();
    const rect = this.player.getAttackRect();
    if (rect) {
      this.debugGfx.lineStyle(2, 0xff5722, 0.8);
      this.debugGfx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    for (const enemy of this.enemies) {
      const eRect = enemy.getAttackRect();
      if (!eRect) continue;
      this.debugGfx.lineStyle(2, 0xe91e63, 0.8);
      this.debugGfx.strokeRect(eRect.x, eRect.y, eRect.width, eRect.height);
    }
  }

  private drawHud(): void {
    this.hudGfx.clear();

    const hpPct = this.player.hp / this.player.maxHp;
    this.hudGfx.fillStyle(0x333333);
    this.hudGfx.fillRect(20, 20, 200, 14);
    this.hudGfx.fillStyle(0xe53935);
    this.hudGfx.fillRect(20, 20, 200 * hpPct, 14);

    const stPct = this.player.stamina / this.player.maxStamina;
    this.hudGfx.fillStyle(0x333333);
    this.hudGfx.fillRect(20, 40, 200, 10);
    this.hudGfx.fillStyle(0xffeb3b);
    this.hudGfx.fillRect(20, 40, 200 * stPct, 10);

    if (this.player.isBlocking) {
      this.hudGfx.fillStyle(this.player.isParrying ? 0xffd700 : 0x42a5f5);
      this.hudGfx.fillRect(20, 58, 24, 14);
    }
  }
}
