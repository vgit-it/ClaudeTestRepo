import Phaser from 'phaser';
import { Character } from './Character';
import { InputController } from '../systems/InputController';
import { SpriteController } from '../systems/SpriteController';

const MOVE_SPEED = 220;
const BLOCK_MOVE_SPEED = 132; // 60% of MOVE_SPEED
const ATTACK_COST = 25;
const DODGE_COST = 30;
const PARRY_COST = 20;
const STAMINA_REGEN = 30;   // per second, idle only
const BLOCK_DRAIN = 15;     // per second while blocking
const WINDUP_MS = 180;
const ACTIVE_MS = 100;
const RECOVERY_MS = 280;
const DODGE_MS = 380;
const IFRAMES_MS = 167;     // ~10 frames at 60fps
const PARRY_MS = 200;       // ~12 frames — active parry window
const PARRY_FLASH_MS = 300; // success flash duration (triggered by CombatSystem in Step 5)
const DODGE_SPEED = 450;
const HITBOX_REACH = 52;
const HITBOX_SIZE = 44;

// Normalized direction vectors matching spritesheet row order: N NE E SE S SW W NW
const DIR_OFFSETS = [
  { x: 0, y: -1 },
  { x: 0.707, y: -0.707 },
  { x: 1, y: 0 },
  { x: 0.707, y: 0.707 },
  { x: 0, y: 1 },
  { x: -0.707, y: 0.707 },
  { x: -1, y: 0 },
  { x: -0.707, y: -0.707 },
];

export class Player extends Character {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly spriteScale: number;
  private readonly gameScale: number;
  private input: InputController;
  private spriteCtrl: SpriteController;
  private dodgeVx = 0;
  private dodgeVy = 0;
  private iframeTimer = 0;
  private parrySuccessTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, spriteScale = 1, gameScale = 1) {
    super(100, 100);
    this.spriteScale = spriteScale;
    this.gameScale = gameScale;
    this.sprite = scene.physics.add.sprite(x, y, 'char_walk', 0);
    this.sprite.setScale(spriteScale);
    this.input = new InputController(scene);
    this.spriteCtrl = new SpriteController(this.sprite);
  }

  get isInvincible(): boolean { return this.iframeTimer > 0; }
  get isBlocking(): boolean { return this.combatState === 'blocking' || this.combatState === 'parrying'; }
  get isParrying(): boolean { return this.combatState === 'parrying'; }

  notifyParrySuccess(): void {
    this.parrySuccessTimer = PARRY_FLASH_MS;
  }

  update(delta: number): void {
    this.regenStamina(delta);
    this.iframeTimer = Math.max(0, this.iframeTimer - delta);
    this.parrySuccessTimer = Math.max(0, this.parrySuccessTimer - delta);

    // Parry window expiry — handled before advanceState since advanceState has no input access
    if (this.combatState === 'parrying' && this.stateTimer <= 0) {
      this.combatState = this.input.isBlockHeld() ? 'blocking' : 'idle';
    } else {
      this.advanceState(delta);
    }

    if (this.combatState === 'idle') {
      const { x, y } = this.input.getMoveVector();
      this.sprite.setVelocity(x * MOVE_SPEED * this.gameScale, y * MOVE_SPEED * this.gameScale);
      this.spriteCtrl.update(x, y, this.input.isMoving());

      if (this.input.consumeParry() && this.stamina >= PARRY_COST) {
        this.stamina -= PARRY_COST;
        this.combatState = 'parrying';
        this.stateTimer = PARRY_MS;
      } else if (this.input.consumeDodge() && this.stamina >= DODGE_COST) {
        this.startDodge();
      } else if (this.input.consumeAttack() && this.stamina >= ATTACK_COST) {
        this.stamina -= ATTACK_COST;
        this.combatState = 'windup';
        this.stateTimer = WINDUP_MS;
      } else if (this.input.isBlockHeld() && this.stamina > 0) {
        this.combatState = 'blocking';
      }
    } else if (this.combatState === 'blocking') {
      if (!this.input.isBlockHeld() || this.stamina <= 0) {
        this.combatState = 'idle';
        this.sprite.setVelocity(0, 0);
      } else {
        this.stamina = Math.max(0, this.stamina - BLOCK_DRAIN * (delta / 1000));
        const { x, y } = this.input.getMoveVector();
        this.sprite.setVelocity(x * BLOCK_MOVE_SPEED * this.gameScale, y * BLOCK_MOVE_SPEED * this.gameScale);
        if (x !== 0 || y !== 0) this.spriteCtrl.update(x, y, false);
        this.spriteCtrl.playAction('block');
      }
    } else if (this.combatState === 'parrying') {
      this.sprite.setVelocity(0, 0);
      this.spriteCtrl.playAction('block');
    } else if (this.combatState === 'dodging') {
      this.sprite.setVelocity(this.dodgeVx, this.dodgeVy);
      this.spriteCtrl.update(this.dodgeVx / (DODGE_SPEED * this.gameScale), this.dodgeVy / (DODGE_SPEED * this.gameScale), true);
    } else {
      // windup / active / recovery
      this.sprite.setVelocity(0, 0);
      if (this.combatState === 'windup') {
        this.spriteCtrl.playAction('windup');
      } else {
        this.spriteCtrl.playAction('hit');
      }
    }

    this.applyVisuals();
  }

  getAttackRect(): Phaser.Geom.Rectangle | null {
    if (this.combatState !== 'active') return null;
    const off = DIR_OFFSETS[this.spriteCtrl.getDir()];
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

  private startDodge(): void {
    this.stamina -= DODGE_COST;
    const mv = this.input.getMoveVector();
    if (mv.x !== 0 || mv.y !== 0) {
      this.dodgeVx = mv.x * DODGE_SPEED * this.gameScale;
      this.dodgeVy = mv.y * DODGE_SPEED * this.gameScale;
    } else {
      const off = DIR_OFFSETS[this.spriteCtrl.getDir()];
      this.dodgeVx = -off.x * DODGE_SPEED * this.gameScale;
      this.dodgeVy = -off.y * DODGE_SPEED * this.gameScale;
    }
    this.combatState = 'dodging';
    this.stateTimer = DODGE_MS;
    this.iframeTimer = IFRAMES_MS;
  }

  private advanceState(delta: number): void {
    if (this.combatState === 'idle' || this.combatState === 'blocking') return;
    this.stateTimer -= delta;
    if (this.stateTimer > 0) return;

    if (this.combatState === 'windup') { this.combatState = 'active'; this.stateTimer = ACTIVE_MS; }
    else if (this.combatState === 'active') { this.combatState = 'recovery'; this.stateTimer = RECOVERY_MS; }
    else if (this.combatState === 'recovery') { this.combatState = 'idle'; }
    else if (this.combatState === 'dodging') { this.combatState = 'idle'; }
  }

  private regenStamina(delta: number): void {
    // Stamina only regens in idle — blocking and parrying intentionally suppressed
    if (this.combatState === 'idle') {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * (delta / 1000));
    }
  }

  private applyVisuals(): void {
    if (this.parrySuccessTimer > 0) {
      this.sprite.setTint(0xffffff);
      this.sprite.setAlpha(1);
    } else if (this.combatState === 'parrying') {
      this.sprite.setTint(0xffd700);
      this.sprite.setAlpha(1);
    } else if (this.combatState === 'blocking') {
      this.sprite.setTint(0x42a5f5);
      this.sprite.setAlpha(1);
    } else if (this.combatState === 'windup') {
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
