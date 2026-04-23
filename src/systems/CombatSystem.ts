import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const ATTACK_DAMAGE = 25;

export class CombatSystem {
  private hitDealt = false;

  update(player: Player, enemies: Enemy[]): void {
    const rect = player.getAttackRect();
    if (!rect) {
      this.hitDealt = false;
      return;
    }
    if (this.hitDealt) return;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, enemy.sprite.getBounds())) {
        enemy.takeDamage(ATTACK_DAMAGE);
        this.hitDealt = true;
        break;
      }
    }
  }
}
