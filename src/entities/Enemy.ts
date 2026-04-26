import Phaser from 'phaser';
import { Character } from './Character';
import { Player } from './Player';
import { SpriteController } from '../systems/SpriteController';
import type { Direction } from '../systems/SpriteController';

const HIT_FLASH_MS = 200;
const ENEMY_BASE_TINT = 0x8899ff;
const BAR_W = 60;
const BAR_H = 6;
const BAR_OFFSET_Y = 46;
const HITBOX_REACH = 52;
const HITBOX_SIZE = 44;

// N NE E SE S SW W NW
const DIR_OFFSETS = [
  { x: 0, y: -1 },
  { x: 0.707, y: -0.707 },
  { x: 1, y: 0 },
  { x: 0.707, y: 0.707 },
  { x: 0, y: 1 },
  { x: -0.707, y: 0.707 },
  { x: -1, y: 0 },
  { x: -0.707, y: -0.707 },
] as const;

export interface EnemyParams {
  maxHp: number;
  moveSpeed: number;
  chaseRange: number;
  attackRange: number;
  telegraphMs: number;  // DDA-tunable
  activeMs: number;
  recoveryMs: number;
  staggerMs: number;
  attackDamage: number;
  cooldownMs: number;
}

export const ENEMY_DEFAULT_PARAMS: EnemyParams = {
  maxHp: 100,
  moveSpeed: 110,
  chaseRange: 200,
  attackRange: 90,
  telegraphMs: 600,
  activeMs: 180,
  recoveryMs: 700,
  staggerMs: 900,
  attackDamage: 20,
  cooldownMs: 1200,
};

export const BOSS_PARAMS: EnemyParams = {
  maxHp: 300,
  moveSpeed: 145,
  chaseRange: 240,
  attackRange: 100,
  telegraphMs: 380,
  activeMs: 220,
  recoveryMs: 500,
  staggerMs: 600,
  attackDamage: 35,
  cooldownMs: 800,
};

export class Enemy extends Character {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly params: EnemyParams;
  private readonly spriteScale: number;
  private readonly gameScale: number;
  private readonly player: Player;
  private spriteCtrl: SpriteController;
  private hpBarGfx: Phaser.GameObjects.Graphics;
  private hitTimer = 0;
  private facing: Direction = 2; // default face East
  private attackHitDealt = false;
  private cooldownTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, params: EnemyParams = ENEMY_DEFAULT_PARAMS, spriteScale = 1, gameScale = 1) {
    super(params.maxHp, 0);
    this.player = player;
    this.params = params;
    this.spriteScale = spriteScale;
    this.gameScale = gameScale;
    this.sprite = scene.physics.add.sprite(x, y, 'char_walk', 0);
    this.sprite.setScale(spriteScale);
    this.spriteCtrl = new SpriteController(this.sprite);
    this.hpBarGfx = scene.add.graphics();
    this.drawHpBar();
  }

  get attackDamage(): number { return this.params.attackDamage; }

  getAttackRect(): Phaser.Geom.Rectangle | null {
    if (this.combatState !== 'active' || this.attackHitDealt) return null;
    const off = DIR_OFFSETS[this.facing];
    const reach = HITBOX_REACH * this.spriteScale;
    const size  = HITBOX_SIZE  * this.spriteScale;
    const cx = this.sprite.x + off.x * reach;
    const cy = this.sprite.y + off.y * reach;
    return new Phaser.Geom.Rectangle(cx - size / 2, cy - size / 2, size, size);
  }

  hurtRect(): Phaser.Geom.Rectangle {
    const w = 30 * this.spriteScale;
    const h = 50 * this.spriteScale;
    return new Phaser.Geom.Rectangle(this.sprite.x - w / 2, this.sprite.y - h / 2, w, h);
  }

  registerHit(wasParried: boolean): void {
    this.attackHitDealt = true;
    if (wasParried) {
      this.combatState = 'staggered';
      this.stateTimer = this.params.staggerMs;
      this.sprite.setVelocity(0, 0);
    }
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);
    this.hitTimer = HIT_FLASH_MS;
    if (!this.isAlive()) {
      this.hpBarGfx.setVisible(false);
      this.spriteCtrl.playAction('death');
      this.sprite.once('animationcomplete', () => {
        this.sprite.setActive(false).setVisible(false);
      });
    }
  }

  update(delta: number): void {
    if (!this.isAlive()) return;

    this.hitTimer = Math.max(0, this.hitTimer - delta);

    if (this.stateTimer > 0) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) this.onStateExpired();
    }

    this.runAI(delta);
    this.applyVisuals();
    this.drawHpBar();
  }

  private onStateExpired(): void {
    if (this.combatState === 'windup') {
      this.combatState = 'active';
      this.stateTimer = this.params.activeMs;
      this.attackHitDealt = false;
    } else if (this.combatState === 'active') {
      this.combatState = 'recovery';
      this.stateTimer = this.params.recoveryMs;
    } else if (this.combatState === 'recovery') {
      this.combatState = 'idle';
      this.cooldownTimer = this.params.cooldownMs;
    } else if (this.combatState === 'staggered') {
      this.combatState = 'idle';
      this.cooldownTimer = this.params.cooldownMs * 0.5;
    }
  }

  private runAI(delta: number): void {
    if (this.combatState !== 'idle') return;

    this.cooldownTimer = Math.max(0, this.cooldownTimer - delta);

    const dx = this.player.sprite.x - this.sprite.x;
    const dy = this.player.sprite.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    this.facing = this.computeDir(dx, dy);

    if (dist <= this.params.attackRange * this.gameScale && this.cooldownTimer <= 0) {
      this.sprite.setVelocity(0, 0);
      this.spriteCtrl.update(0, 0, false);
      this.combatState = 'windup';
      this.stateTimer = this.params.telegraphMs;
      this.attackHitDealt = false;
    } else if (dist <= this.params.chaseRange * this.gameScale) {
      this.sprite.setVelocity((dx / dist) * this.params.moveSpeed * this.gameScale, (dy / dist) * this.params.moveSpeed * this.gameScale);
      this.spriteCtrl.update(dx / dist, dy / dist, true);
    } else {
      this.sprite.setVelocity(0, 0);
      this.spriteCtrl.update(0, 0, false);
    }
  }

  private computeDir(dx: number, dy: number): Direction {
    const a = ((Phaser.Math.RadToDeg(Math.atan2(dy, dx)) % 360) + 360) % 360;
    const remap: Direction[] = [2, 3, 4, 5, 6, 7, 0, 1];
    return remap[Math.round(a / 45) % 8];
  }

  private applyVisuals(): void {
    if (this.hitTimer > 0) {
      this.sprite.setTint(0xff4444);
      this.sprite.setAlpha(1);
    } else if (this.combatState === 'windup') {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(this.sprite.scene.time.now * 0.008));
      this.sprite.setTint(0xff2222);
      this.sprite.setAlpha(pulse);
      this.spriteCtrl.setDir(this.facing);
      this.spriteCtrl.playAction('windup');
    } else if (this.combatState === 'active') {
      this.sprite.setTint(0xff5722);
      this.sprite.setAlpha(1);
      this.spriteCtrl.setDir(this.facing);
      this.spriteCtrl.playAction('hit');
    } else if (this.combatState === 'recovery') {
      this.sprite.setTint(ENEMY_BASE_TINT);
      this.sprite.setAlpha(1);
      this.spriteCtrl.setDir(this.facing);
      this.spriteCtrl.playAction('hit');
    } else if (this.combatState === 'staggered') {
      this.sprite.setTint(0x9c27b0);
      this.sprite.setAlpha(1);
      this.spriteCtrl.update(0, 0, false);
    } else {
      this.sprite.setTint(ENEMY_BASE_TINT);
      this.sprite.setAlpha(1);
    }
  }

  private drawHpBar(): void {
    const bw = BAR_W * this.spriteScale;
    const bh = BAR_H * this.spriteScale;
    const offset = BAR_OFFSET_Y * this.spriteScale;
    const x = this.sprite.x - bw / 2;
    const y = this.sprite.y - offset;
    const pct = this.hp / this.maxHp;

    this.hpBarGfx.clear();
    this.hpBarGfx.fillStyle(0x222222);
    this.hpBarGfx.fillRect(x, y, bw, bh);
    this.hpBarGfx.fillStyle(0xe53935);
    this.hpBarGfx.fillRect(x, y, bw * pct, bh);
  }
}
