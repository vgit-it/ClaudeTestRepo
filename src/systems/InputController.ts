import Phaser from 'phaser';

export interface MoveVector {
  x: number;
  y: number;
}

export class InputController {
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Space: Phaser.Input.Keyboard.Key;
  };
  private attackPressed = false;

  constructor(scene: Phaser.Scene) {
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
}
