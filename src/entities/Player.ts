import Phaser from 'phaser';
import { Character } from './Character';
import { InputController } from '../systems/InputController';
import { SpriteController } from '../systems/SpriteController';

const MOVE_SPEED = 220;
const ATTACK_COST = 25;
const DODGE_COST = 30;
const STAMINA_REGEN = 30; // per second
const WINDUP_MS = 180;
const ACTIVE_MS = 100;
const RECOVERY_MS = 280;
const DODGE_MS = 380;
const IFRAMES_MS = 167; // ~10 frames at 60fps
const DODGE_SPEED = 450;
const HITBOX_REACH = 52;
const HITBOX_SIZE = 44;

// Normalized direction vectors matching spritesheet row order: S SE E NE N NW W SW
const DIR_OFFSETS = [
  { x: 0, y: 1 },
  { x: 0.707, y: 0.707 },
  { x: 1, y: 0 },
  { x: 0.707, y: -0.707 },
  { x: 0, y: -1 },
  { x: -0.707, y: -0.707 },
  { x: -1, y: 0 },
  { x: -0.707, y: 0.707 },
];

export class Player extends Character {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private input: InputController;
  private spriteCtrl: SpriteController;
  private dodgeVx = 0;
  private dodgeVy = 0;
  private iframeTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(100, 100);
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle', 0);
    this.sprite.setCollideWorldBounds(true);
    this.input = new InputController(scene);
    this.spriteCtrl = new SpriteController(this.sprite);
  }

  get isInvincible(): boolean {
    return this.iframeTimer > 0;
  }

  update(delta: number): void {
    this.regenStamina(delta);
    this.advanceState(delta);
    this.iframeTimer = Math.max(0, this.iframeTimer - delta);

    if (this.combatState === 'idle') {
      const { x, y } = this.input.getMoveVector();
      this.sprite.setVelocity(x * MOVE_SPEED, y * MOVE_SPEED);
      this.spriteCtrl.update(x, y, this.input.isMoving());

      if (this.input.consumeDodge() && this.stamina >= DODGE_COST) {
        this.startDodge();
      } else if (this.input.consumeAttack() && this.stamina >= ATTACK_COST) {
        this.stamina -= ATTACK_COST;
        this.combatState = 'windup';
        this.stateTimer = WINDUP_MS;
      }
    } else if (this.combatState === 'dodging') {
      this.sprite.setVelocity(this.dodgeVx, this.dodgeVy);
    } else {
      this.sprite.setVelocity(0, 0);
    }

    this.applyVisuals();
  }

  getAttackRect(): Phaser.Geom.Rectangle | null {
    if (this.combatState !== 'active') return null;
    const off = DIR_OFFSETS[this.spriteCtrl.getDir()];
    const cx = this.sprite.x + off.x * HITBOX_REACH;
    const cy = this.sprite.y + off.y * HITBOX_REACH;
    return new Phaser.Geom.Rectangle(cx - HITBOX_SIZE / 2, cy - HITBOX_SIZE / 2, HITBOX_SIZE, HITBOX_SIZE);
  }

  private startDodge(): void {
    this.stamina -= DODGE_COST;
    const mv = this.input.getMoveVector();
    if (mv.x !== 0 || mv.y !== 0) {
      this.dodgeVx = mv.x * DODGE_SPEED;
      this.dodgeVy = mv.y * DODGE_SPEED;
    } else {
      // No input — backstep away from current facing direction
      const off = DIR_OFFSETS[this.spriteCtrl.getDir()];
      this.dodgeVx = -off.x * DODGE_SPEED;
      this.dodgeVy = -off.y * DODGE_SPEED;
    }
    this.combatState = 'dodging';
    this.stateTimer = DODGE_MS;
    this.iframeTimer = IFRAMES_MS;
  }

  private advanceState(delta: number): void {
    if (this.combatState === 'idle') return;
    this.stateTimer -= delta;
    if (this.stateTimer > 0) return;

    if (this.combatState === 'windup') { this.combatState = 'active'; this.stateTimer = ACTIVE_MS; }
    else if (this.combatState === 'active') { this.combatState = 'recovery'; this.stateTimer = RECOVERY_MS; }
    else if (this.combatState === 'recovery') { this.combatState = 'idle'; }
    else if (this.combatState === 'dodging') { this.combatState = 'idle'; }
  }

  private regenStamina(delta: number): void {
    if (this.combatState === 'idle') {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * (delta / 1000));
    }
  }

  private applyVisuals(): void {
    if (this.combatState === 'windup') {
      this.sprite.setTint(0xffeb3b);
      this.sprite.setAlpha(1);
    } else if (this.combatState === 'active') {
      this.sprite.setTint(0xff5722);
      this.sprite.setAlpha(1);
    } else if (this.iframeTimer > 0) {
      this.sprite.clearTint();
      this.sprite.setAlpha(0.35);
    } else {
      this.sprite.clearTint();
      this.sprite.setAlpha(1);
    }
  }
}
