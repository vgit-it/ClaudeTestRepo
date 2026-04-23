import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const ATTACK_DAMAGE = 25;
const BLOCK_DAMAGE_MULT = 0.3;

export class CombatSystem {
  private hitDealt = false;

  resolvePlayerHit(player: Player, rawDamage: number): boolean {
    if (player.isParrying)   { player.notifyParrySuccess(); return true; }
    if (player.isBlocking)   { player.takeDamage(rawDamage * BLOCK_DAMAGE_MULT); return false; }
    if (player.isInvincible) { return false; }
    player.takeDamage(rawDamage);
    return false;
  }

  update(player: Player, enemies: Enemy[]): void {
    // Player → Enemy
    const rect = player.getAttackRect();
    if (!rect) {
      this.hitDealt = false;
    } else if (!this.hitDealt) {
      for (const enemy of enemies) {
        if (!enemy.isAlive()) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, enemy.sprite.getBounds())) {
          enemy.takeDamage(ATTACK_DAMAGE);
          this.hitDealt = true;
          break;
        }
      }
    }

    // Enemy → Player
    if (player.isAlive()) {
      for (const enemy of enemies) {
        if (!enemy.isAlive()) continue;
        const eRect = enemy.getAttackRect();
        if (!eRect) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(eRect, player.sprite.getBounds())) {
          const wasParried = this.resolvePlayerHit(player, enemy.attackDamage);
          enemy.registerHit(wasParried);
        }
      }
    }
  }
}
