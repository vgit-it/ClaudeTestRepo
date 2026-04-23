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
  };
  private attackPressed = false;
  private rmbDownAt = -1;
  private rmbParryConsumed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.attackPressed = true;
      if (pointer.rightButtonDown()) {
        this.rmbDownAt = scene.time.now;
        this.rmbParryConsumed = false;
      }
    });
    const clearRmb = () => { this.rmbDownAt = -1; this.rmbParryConsumed = false; };
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) clearRmb();
    });
    scene.input.on('pointerout', clearRmb);
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

    return { x, y };
  }

  isMoving(): boolean {
    return this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown;
  }

  consumeAttack(): boolean {
    const was = this.attackPressed;
    this.attackPressed = false;
    return was;
  }

  consumeDodge(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.Space);
  }

  consumeParry(): boolean {
    if (this.rmbDownAt === -1 || this.rmbParryConsumed) return false;
    if (this.scene.time.now - this.rmbDownAt >= PARRY_TAP_MS) return false;
    this.rmbParryConsumed = true;
    return true;
  }

  isBlockHeld(): boolean {
    return this.rmbDownAt !== -1;
  }
}
