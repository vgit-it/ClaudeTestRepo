# Arena Combat Game — Design & Implementation Plan

## Concept

Top-down 3/4 view (Diablo-style) 2D arena combat game for the web. Player fights through 10 rounds in a circular arena, culminating in a boss. Combat feels grounded but responsive — between snappy arcade and weighty soulslike. Hidden dynamic difficulty adjustment (DDA) keeps the player in flow.

## Core Design

- **View:** Top-down 3/4 (not true isometric)
- **Controls:** WASD move, LMB attack, RMB hold-block / tap-parry, Space dodge
- **Sprite directions:** 8 (S, SE, E, NE, N, NW, W, SW)
- **Player resources:** HP + Stamina + Poise/Stagger
- **Combat scope v1:** Melee only, designed for ranged expansion
- **Enemies v1:** One archetype, variants via tuning. Boss = buffed variant
- **Round structure:** 10 fixed rounds, boss at round 10
- **Progression:** Score + time tracked
- **Difficulty:** Hidden auto-adjust based on tracked metrics

## Combat Feel

- Attacks have commit frames (windup → active → recovery)
- Parry window ~12 frames
- Dodge i-frames ~10 frames
- Stamina gates dodge / attack / block
- Poise breaks cause stagger

## Tech Stack

- **Phaser 3** (v3.80+)
- **TypeScript** — catches bugs early, worth the small setup cost
- **Vite** — dev server + build tool, near-zero config
- **Arcade Physics** (built into Phaser) — enough for top-down

Scaffold:
```
npm create vite@latest    # vanilla-ts template
npm i phaser
```

## Project Structure

```
src/
  main.ts                 // Phaser game config, scene list
  scenes/
    BootScene.ts          // load assets
    ArenaScene.ts         // gameplay
    UIScene.ts            // HUD overlay
  entities/
    Character.ts          // base: HP, stamina, poise
    Player.ts             // extends Character
    Enemy.ts              // extends Character
  systems/
    InputController.ts
    CombatSystem.ts       // state machine per character
    SpriteController.ts   // 8-dir + state → frame
    AIBrain.ts
    RoundManager.ts
    MetricsTracker.ts
    DDATuner.ts
  data/
    weapons.ts            // weapon configs
    enemies.ts
    difficulty.ts         // base profile + tuning ranges
  assets/
    sprites/
    audio/
```

Data files = plain TS objects. Same modularity as Unity ScriptableObjects, simpler.

## Key Implementation Notes

**8-directional sprites:** compute facing from input/aim vector → index 0-7 → pick row in sprite sheet. Animation names like `player_attack_E`, `player_run_NE`.

**Combat state machine:** simple object per character — `{state, stateTime, currentAction}`. States: Idle, Windup, Active, Recovery, Blocking, Parrying, Dodging, Staggered. Hitboxes = invisible Phaser zones spawned on specific animation frames, killed after active frames.

**Animation events:** Phaser's `anim.on('animationupdate', ...)` fires per frame. Use frame index to trigger hitbox on/off, i-frame windows, footstep SFX. Define in a config object next to each animation, not scattered.

**Top-down 3/4 depth sorting:** sort sprites by `y` each frame so closer things render in front.

**DDA:** metrics object per round, tuner writes into a `currentDifficulty` object the AI reads. Clamp + smooth (max 10-15% change per round).

## Sprite Sheet Contract

- One sheet per character per action state (idle, run, attack1, hit, death, block, dodge, parry)
- 8 rows, order: **S, SE, E, NE, N, NW, W, SW** (consistent across all sheets)
- Fixed frame size per sheet, power-of-2 friendly (e.g. 64×64, 96×96)
- Tiny JSON next to each sheet specifying:
  - frame count per action
  - frame rate
  - which frame = hitbox active
  - which frames = i-frames

Loader reads JSON, sets up animations automatically. Zero code changes for new actions.

## Metrics for DDA (track everything)

- Hits taken / hits landed
- Dodge timing (close-call dodges right before hit)
- Parry success rate
- Time-to-kill per enemy
- Damage taken per round
- Deaths

Compute "challenge score" → adjust next round's `DifficultyProfile`:
- Enemy reaction time
- Attack telegraph length
- Aggression %
- Move speed
- HP

Clamp ranges so it never feels broken. Smooth transitions.

## Build Order

1. Vite + Phaser + TS scaffold. Player moves WASD with 8-dir animation
2. Attack with hitbox, one dummy enemy taking damage
3. Stamina + dodge (i-frames via a flag)
4. Block + parry
5. Enemy AI (chase → telegraph → attack → recover)
6. Round manager, metrics, 3 rounds end-to-end
7. DDA tuner wired in
8. 10 rounds + boss variant (reuse enemy, buffed stats + bigger sprite)
9. Juice: hit stop, camera shake, SFX, particles
10. `npm run build` → static files → host on itch.io / Netlify / GitHub Pages

## Open Questions to Lock Before Coding

1. **Pixels-per-unit / sprite display size?** e.g. 64×64 source, displayed at 2× = 128px on screen
2. **Target resolution?** 1280×720 logical, scaled to fit is the common default

## Next Step

Write the starter scaffold: `main.ts`, `BootScene`, `ArenaScene`, working 8-dir player with placeholder sprite.
