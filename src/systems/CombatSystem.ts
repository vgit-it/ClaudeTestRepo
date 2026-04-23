import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const ATTACK_DAMAGE = 25;
const BLOCK_DAMAGE_MULT = 0.3; // 30% of hit damage passes through a block

export class CombatSystem {
  private hitDealt = false;

  // Called by Step 5 enemy attack logic instead of player.takeDamage() directly
  resolvePlayerHit(player: Player, rawDamage: number): void {
    if (player.isParrying)   { player.notifyParrySuccess(); return; }
    if (player.isBlocking)   { player.takeDamage(rawDamage * BLOCK_DAMAGE_MULT); return; }
    if (player.isInvincible) { return; }
    player.takeDamage(rawDamage);
  }

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
