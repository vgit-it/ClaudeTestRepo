import Phaser from 'phaser';
import { InputController } from './InputController';

export class TouchControls {
  private thumb: Phaser.GameObjects.Arc;
  private baseX: number;
  private baseY: number;
  private maxRadius: number;
  private joystickPointerId = -1;

  constructor(scene: Phaser.Scene, input: InputController) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const s = Math.min(W, H) / 800;

    // Joystick
    this.maxRadius = 60 * s;
    this.baseX = this.maxRadius + 30 * s;
    this.baseY = H - this.maxRadius - 30 * s;

    scene.add.arc(this.baseX, this.baseY, this.maxRadius, 0, 360, false, 0xffffff, 0.15)
      .setDepth(20);
    this.thumb = scene.add.arc(this.baseX, this.baseY, 30 * s, 0, 360, false, 0xffffff, 0.5)
      .setDepth(21);

    // Buttons
    const btnRadius = 38 * s;
    const btnY = H - btnRadius - 20 * s;
    const gap = btnRadius * 2 + 15 * s;
    const atkX   = W - btnRadius - 20 * s;
    const dodgeX = atkX - gap;
    const defX   = dodgeX - gap;

    this.makeButton(scene, atkX,   btnY, btnRadius, 0xe53935, 'ATK',   s, {
      down: () => input.notifyTouchAttack(),
    });
    this.makeButton(scene, dodgeX, btnY, btnRadius, 0xffeb3b, 'DODGE', s, {
      down: () => input.notifyTouchDodge(),
    });
    this.makeButton(scene, defX,   btnY, btnRadius, 0x42a5f5, 'DEF',   s, {
      down: () => input.notifyTouchDefendDown(),
      up:   () => input.notifyTouchDefendUp(),
    });

    // Joystick pointer tracking via global scene input
    scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.x < W / 2 && this.joystickPointerId === -1) {
        this.joystickPointerId = ptr.id;
        this.moveThumb(ptr.x, ptr.y, input);
      }
    });

    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id === this.joystickPointerId) {
        this.moveThumb(ptr.x, ptr.y, input);
      }
    });

    scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id === this.joystickPointerId) {
        this.joystickPointerId = -1;
        this.thumb.x = this.baseX;
        this.thumb.y = this.baseY;
        input.notifyTouchMove(0, 0);
      }
    });
  }

  private moveThumb(ptrX: number, ptrY: number, input: InputController): void {
    const dx = ptrX - this.baseX;
    const dy = ptrY - this.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      input.notifyTouchMove(0, 0);
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const clamped = Math.min(dist, this.maxRadius);
    this.thumb.x = this.baseX + nx * clamped;
    this.thumb.y = this.baseY + ny * clamped;
    input.notifyTouchMove(nx * (clamped / this.maxRadius), ny * (clamped / this.maxRadius));
  }

  private makeButton(
    scene: Phaser.Scene,
    x: number, y: number, radius: number,
    color: number, label: string, s: number,
    handlers: { down?: () => void; up?: () => void },
  ): void {
    const circle = scene.add.arc(x, y, radius, 0, 360, false, color, 0.85)
      .setDepth(20)
      .setInteractive();

    scene.add.text(x, y, label, {
      fontSize: `${Math.round(13 * s)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    if (handlers.down) circle.on('pointerdown', handlers.down);
    if (handlers.up) {
      circle.on('pointerup',  handlers.up);
      circle.on('pointerout', handlers.up);
    }
  }
}
