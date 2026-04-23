export type CombatState = 'idle' | 'windup' | 'active' | 'recovery' | 'staggered';

export class Character {
  hp: number;
  readonly maxHp: number;
  stamina: number;
  readonly maxStamina: number;
  combatState: CombatState = 'idle';
  stateTimer = 0;

  constructor(maxHp: number, maxStamina: number) {
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.stamina = maxStamina;
    this.maxStamina = maxStamina;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  isAlive(): boolean {
    return this.hp > 0;
  }
}
