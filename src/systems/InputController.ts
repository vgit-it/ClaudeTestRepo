import Phaser from 'phaser';

export interface MoveVector {
  x: number;
  y: number;
}

const PARRY_TAP_MS = 200;

export class InputController {
  private scene: Phaser.Scene;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Space: Phaser.Input.Keyboard.Key;
    J: Phaser.Input.Keyboard.Key;
    K: Phaser.Input.Keyboard.Key;
  };
  private kDownAt = -1;
  private kParryConsumed = false;

  // Touch state
  private touchVx = 0;
  private touchVy = 0;
  private touchAttackPending = false;
  private touchDodgePending = false;
  private touchParryPending = false;
  private touchDefendDownAt = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      J: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      K: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    };
    this.keys.K.on('down', () => {
      this.kDownAt = scene.time.now;
      this.kParryConsumed = false;
    });
    this.keys.K.on('up', () => {
      this.kDownAt = -1;
      this.kParryConsumed = false;
    });
  }

  getMoveVector(): MoveVector {
    let x = 0;
    let y = 0;

    if (this.keys.A.isDown) x -= 1;
    if (this.keys.D.isDown) x += 1;
    if (this.keys.W.isDown) y -= 1;
    if (this.keys.S.isDown) y += 1;

    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }

    if (x !== 0 || y !== 0) return { x, y };
    return { x: this.touchVx, y: this.touchVy };
  }

  isMoving(): boolean {
    return this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown
      || this.touchVx !== 0 || this.touchVy !== 0;
  }

  consumeAttack(): boolean {
    const kb = Phaser.Input.Keyboard.JustDown(this.keys.J);
    const touch = this.touchAttackPending;
    if (touch) this.touchAttackPending = false;
    return kb || touch;
  }

  consumeDodge(): boolean {
    const kb = Phaser.Input.Keyboard.JustDown(this.keys.Space);
    const touch = this.touchDodgePending;
    if (touch) this.touchDodgePending = false;
    return kb || touch;
  }

  consumeParry(): boolean {
    let kbParry = false;
    if (this.kDownAt !== -1 && !this.kParryConsumed) {
      if (this.scene.time.now - this.kDownAt < PARRY_TAP_MS) {
        this.kParryConsumed = true;
        kbParry = true;
      }
    }
    const touch = this.touchParryPending;
    if (touch) this.touchParryPending = false;
    return kbParry || touch;
  }

  isBlockHeld(): boolean {
    const kbBlock = this.keys.K.isDown;
    const touchBlock = this.touchDefendDownAt > -1
      && (this.scene.time.now - this.touchDefendDownAt >= PARRY_TAP_MS);
    return kbBlock || touchBlock;
  }

  // --- Touch notify methods (called by TouchControls) ---

  notifyTouchMove(vx: number, vy: number): void {
    this.touchVx = vx;
    this.touchVy = vy;
  }

  notifyTouchAttack(): void {
    this.touchAttackPending = true;
  }

  notifyTouchDodge(): void {
    this.touchDodgePending = true;
  }

  notifyTouchDefendDown(): void {
    this.touchDefendDownAt = this.scene.time.now;
  }

  notifyTouchDefendUp(): void {
    if (this.touchDefendDownAt > -1
        && this.scene.time.now - this.touchDefendDownAt < PARRY_TAP_MS) {
      this.touchParryPending = true;
    }
    this.touchDefendDownAt = -1;
  }
}
