import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy, ENEMY_DEFAULT_PARAMS, EnemyParams } from '../entities/Enemy';
import { CombatSystem } from '../systems/CombatSystem';
import { TouchControls } from '../systems/TouchControls';

const IMAGE_SIZE      = 1254;
const CIRCLE_FRACTION = 0.80; // inner stone-ring edge as fraction of image half-size; tune if needed

function buildParams(round: number): EnemyParams {
  return {
    ...ENEMY_DEFAULT_PARAMS,
    maxHp:       Math.round(100 * (1 + (round - 1) * 0.2)),
    attackDamage: 20 + (round - 1) * 5,
    telegraphMs:  Math.max(150, 600 - (round - 1) * 50),
  };
}

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private combatSystem!: CombatSystem;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private arenaCx!: number;
  private arenaCy!: number;
  private arenaRadius!: number;
  private imgScale!: number;
  private hitboxVisible = false;
  private roundOver = false;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.arenaCx = W / 2;
    this.arenaCy = H / 2;
    this.roundOver = false;

    // portrait: fill width; landscape: fill height — single formula covers both
    this.imgScale = Math.min(W, H) / IMAGE_SIZE * 1.5;
    const imgScale = this.imgScale;
    this.arenaRadius = (IMAGE_SIZE / 2) * CIRCLE_FRACTION * imgScale;

    const bg = this.add.image(this.arenaCx, this.arenaCy, 'arena_bg');
    bg.setScale(imgScale);
    bg.setDepth(-1);

    const spriteScale = imgScale * 2;
    const round = this.game.registry.get('round') ?? 1;
    const params = buildParams(round);
    const enemyCount = round >= 5 ? 3 : round >= 3 ? 2 : 1;
    const spawnDist = this.arenaRadius * 0.5;

    this.player = new Player(this, this.arenaCx, this.arenaCy, spriteScale, spriteScale);
    new TouchControls(this, this.player.inputController);

    this.enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      const angle = (i / enemyCount) * Math.PI * 2;
      const x = this.arenaCx + Math.cos(angle) * spawnDist;
      const y = this.arenaCy + Math.sin(angle) * spawnDist;
      this.enemies.push(new Enemy(this, x, y, this.player, params, spriteScale, spriteScale));
    }

    this.combatSystem = new CombatSystem();
    this.hudGfx = this.add.graphics();
    this.debugGfx = this.add.graphics();

    this.add.text(W / 2, 10, `Round ${round}`, {
      fontSize: `${Math.round(16 * imgScale)}px`,
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(10);

    const btn = this.add.text(W - 10, 10, 'HBX: OFF', {
      fontSize: `${Math.round(14 * imgScale)}px`,
      color: '#ffffff',
      backgroundColor: '#333333cc',
      padding: { x: 8, y: 5 },
    }).setOrigin(1, 0).setDepth(10).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.hitboxVisible = !this.hitboxVisible;
      btn.setText(this.hitboxVisible ? 'HBX: ON' : 'HBX: OFF');
      btn.setStyle({ backgroundColor: this.hitboxVisible ? '#1a6b1acc' : '#333333cc' });
    });

    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', onResize, this));
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    for (const enemy of this.enemies) enemy.update(delta);
    this.combatSystem.update(this.player, this.enemies);

    this.clampToArena(this.player.sprite);
    for (const enemy of this.enemies) this.clampToArena(enemy.sprite);

    this.drawDebugHitbox();
    this.drawHud();

    if (!this.roundOver && this.enemies.length > 0 && this.enemies.every(e => !e.isAlive())) {
      this.roundOver = true;
      this.time.delayedCall(800, () => this.scene.start('WinScene'));
    }

    if (!this.roundOver && this.player.hp <= 0) {
      this.roundOver = true;
      this.time.delayedCall(800, () => this.scene.start('GameOverScene'));
    }
  }

  private clampToArena(sprite: Phaser.Physics.Arcade.Sprite): void {
    const dx = sprite.x - this.arenaCx;
    const dy = sprite.y - this.arenaCy;
    const dist = Math.hypot(dx, dy);
    if (dist > this.arenaRadius) {
      sprite.x = this.arenaCx + (dx / dist) * this.arenaRadius;
      sprite.y = this.arenaCy + (dy / dist) * this.arenaRadius;
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const radialVel = (body.velocity.x * dx + body.velocity.y * dy) / dist;
      if (radialVel > 0) {
        body.setVelocity(
          body.velocity.x - radialVel * (dx / dist),
          body.velocity.y - radialVel * (dy / dist),
        );
      }
    }
  }

  private drawDebugHitbox(): void {
    this.debugGfx.clear();
    if (!this.hitboxVisible) return;

    // Hurtboxes — 60×100 centred on sprite, what CombatSystem checks
    const pb = this.player.hurtRect();
    this.debugGfx.lineStyle(2, 0x00e676, 0.9);
    this.debugGfx.strokeRect(pb.x, pb.y, pb.width, pb.height);

    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      const eb = enemy.hurtRect();
      this.debugGfx.lineStyle(2, 0x40c4ff, 0.9);
      this.debugGfx.strokeRect(eb.x, eb.y, eb.width, eb.height);
    }

    // Attack hitboxes — projected rectangle in front of the attacker
    const rect = this.player.getAttackRect();
    if (rect) {
      this.debugGfx.lineStyle(2, 0xff5722, 0.9);
      this.debugGfx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    for (const enemy of this.enemies) {
      const eRect = enemy.getAttackRect();
      if (!eRect) continue;
      this.debugGfx.lineStyle(2, 0xe91e63, 0.9);
      this.debugGfx.strokeRect(eRect.x, eRect.y, eRect.width, eRect.height);
    }
  }

  private drawHud(): void {
    this.hudGfx.clear();
    const s = this.imgScale;
    const margin = 20 * s;
    const barW   = 200 * s;
    const hpH    = 14 * s;
    const stH    = 10 * s;
    const gap    = 6 * s;
    const hpY    = margin;
    const stY    = hpY + hpH + gap;
    const blockY = stY + stH + gap;

    const hpPct = this.player.hp / this.player.maxHp;
    this.hudGfx.fillStyle(0x333333);
    this.hudGfx.fillRect(margin, hpY, barW, hpH);
    this.hudGfx.fillStyle(0xe53935);
    this.hudGfx.fillRect(margin, hpY, barW * hpPct, hpH);

    const stPct = this.player.stamina / this.player.maxStamina;
    this.hudGfx.fillStyle(0x333333);
    this.hudGfx.fillRect(margin, stY, barW, stH);
    this.hudGfx.fillStyle(0xffeb3b);
    this.hudGfx.fillRect(margin, stY, barW * stPct, stH);

    if (this.player.isBlocking) {
      this.hudGfx.fillStyle(this.player.isParrying ? 0xffd700 : 0x42a5f5);
      this.hudGfx.fillRect(margin, blockY, 24 * s, 14 * s);
    }
  }
}
