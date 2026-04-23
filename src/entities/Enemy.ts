import Phaser from 'phaser';
import { Character } from './Character';

const HIT_FLASH_MS = 200;
const BAR_W = 60;
const BAR_H = 6;
const BAR_OFFSET_Y = 46;

export class Enemy extends Character {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private hpBarGfx: Phaser.GameObjects.Graphics;
  private hitTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(100, 0);
    this.sprite = scene.physics.add.sprite(x, y, 'enemy_idle', 0);
    this.hpBarGfx = scene.add.graphics();
    this.drawHpBar();
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);
    this.hitTimer = HIT_FLASH_MS;
    if (!this.isAlive()) {
      this.sprite.setTint(0x555555);
      this.sprite.setActive(false);
      this.hpBarGfx.setVisible(false);
    }
  }

  update(delta: number): void {
    if (!this.isAlive()) return;
    this.hitTimer = Math.max(0, this.hitTimer - delta);
    this.sprite.setTint(this.hitTimer > 0 ? 0xff4444 : 0xffffff);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    const x = this.sprite.x - BAR_W / 2;
    const y = this.sprite.y - BAR_OFFSET_Y;
    const pct = this.hp / this.maxHp;

    this.hpBarGfx.clear();
    this.hpBarGfx.fillStyle(0x222222);
    this.hpBarGfx.fillRect(x, y, BAR_W, BAR_H);
    this.hpBarGfx.fillStyle(0xe53935);
    this.hpBarGfx.fillRect(x, y, BAR_W * pct, BAR_H);
  }
}
