import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { CombatSystem } from '../systems/CombatSystem';

const ARENA_CX = 640;
const ARENA_CY = 360;
const ARENA_RADIUS = 300;

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private combatSystem!: CombatSystem;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private debugGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(): void {
    this.drawArena();
    this.player = new Player(this, ARENA_CX, ARENA_CY);
    this.enemies = [new Enemy(this, ARENA_CX + 160, ARENA_CY, this.player)];
    this.combatSystem = new CombatSystem();
    this.hudGfx = this.add.graphics();
    this.debugGfx = this.add.graphics();
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    for (const enemy of this.enemies) enemy.update(delta);
    this.combatSystem.update(this.player, this.enemies);
    this.drawDebugHitbox();
    this.drawHud();
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

  private drawArena(): void {
    const gfx = this.add.graphics();

    gfx.fillStyle(0x5d4037, 1);
    gfx.fillCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS);

    gfx.lineStyle(8, 0x8d6e63, 1);
    gfx.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS);

    gfx.lineStyle(2, 0x6d4c41, 0.5);
    gfx.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS - 20);

    gfx.fillStyle(0x6d4c41, 0.4);
    gfx.fillCircle(ARENA_CX, ARENA_CY, 40);
  }
}
