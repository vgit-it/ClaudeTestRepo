import Phaser from 'phaser';
import { InputController } from '../systems/InputController';
import { SpriteController } from '../systems/SpriteController';

const MOVE_SPEED = 220;

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private input: InputController;
  private spriteCtrl: SpriteController;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle', 0);
    this.sprite.setCollideWorldBounds(true);

    this.input = new InputController(scene);
    this.spriteCtrl = new SpriteController(this.sprite);
  }

  update(): void {
    const { x, y } = this.input.getMoveVector();
    const moving = this.input.isMoving();

    this.sprite.setVelocity(x * MOVE_SPEED, y * MOVE_SPEED);
    this.spriteCtrl.update(x, y, moving);
  }
}
