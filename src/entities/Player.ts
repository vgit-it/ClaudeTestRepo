import Phaser from 'phaser';
import { Character } from './Character';
import { InputController } from '../systems/InputController';
import { SpriteController } from '../systems/SpriteController';

const MOVE_SPEED = 220;
const ATTACK_COST = 25;
const STAMINA_REGEN = 30; // per second
const WINDUP_MS = 180;
const ACTIVE_MS = 100;
const RECOVERY_MS = 280;
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(100, 100);
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle', 0);
    this.sprite.setCollideWorldBounds(true);
    this.input = new InputController(scene);
    this.spriteCtrl = new SpriteController(this.sprite);
  }

  update(delta: number): void {
    this.regenStamina(delta);
    this.advanceState(delta);

    if (this.combatState === 'idle') {
      const { x, y } = this.input.getMoveVector();
      this.sprite.setVelocity(x * MOVE_SPEED, y * MOVE_SPEED);
      this.spriteCtrl.update(x, y, this.input.isMoving());

      if (this.input.consumeAttack() && this.stamina >= ATTACK_COST) {
        this.stamina -= ATTACK_COST;
        this.combatState = 'windup';
        this.stateTimer = WINDUP_MS;
      }
    } else {
      this.sprite.setVelocity(0, 0);
    }

    this.applyTint();
  }

  getAttackRect(): Phaser.Geom.Rectangle | null {
    if (this.combatState !== 'active') return null;
    const off = DIR_OFFSETS[this.spriteCtrl.getDir()];
    const cx = this.sprite.x + off.x * HITBOX_REACH;
    const cy = this.sprite.y + off.y * HITBOX_REACH;
    return new Phaser.Geom.Rectangle(cx - HITBOX_SIZE / 2, cy - HITBOX_SIZE / 2, HITBOX_SIZE, HITBOX_SIZE);
  }

  private advanceState(delta: number): void {
    if (this.combatState === 'idle') return;
    this.stateTimer -= delta;
    if (this.stateTimer > 0) return;

    if (this.combatState === 'windup') { this.combatState = 'active'; this.stateTimer = ACTIVE_MS; }
    else if (this.combatState === 'active') { this.combatState = 'recovery'; this.stateTimer = RECOVERY_MS; }
    else if (this.combatState === 'recovery') { this.combatState = 'idle'; }
  }

  private regenStamina(delta: number): void {
    if (this.combatState === 'idle') {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * (delta / 1000));
    }
  }

  private applyTint(): void {
    if (this.combatState === 'windup') this.sprite.setTint(0xffeb3b);
    else if (this.combatState === 'active') this.sprite.setTint(0xff5722);
    else this.sprite.clearTint();
  }
}
