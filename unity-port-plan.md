# Unity Port Plan — Arena Combat Game

## What the Game Is

**Top-down 3/4 arena combat** (think Diablo perspective). Survive 10 rounds of escalating enemies in a circular stone ring.

**Core loop:** Move → Attack → Block/Parry/Dodge → Repeat until round clear → Next round

---

## Existing Systems (what needs to be ported)

### Combat State Machine

Every character (player and enemy) cycles through these states:

```
idle → windup (180ms) → active (100ms) → recovery (280ms) → idle
               ↕
        blocking / parrying / dodging / staggered
```

Key timings to preserve: 200ms parry window, 167ms dodge i-frames, 380ms dodge duration.

### Stamina Resource

- Max 100. Attack costs 25, dodge costs 30, parry costs 20
- Blocking drains 15/sec. Regenerates 30/sec when idle
- This is the whole risk/reward system — running out of stamina is death

### Damage System

- Player attack: 25 damage
- Block reduction: 70% (attacker does ×0.3)
- Parry: full negation + staggers the attacker (900ms stagger)
- Hitbox: 44×44 box projected 52px in facing direction, active only during the 100ms window

### Enemy AI

Simple but effective: chase → stop in range → telegraph (windup) → attack → cooldown. Scales with round:

- HP: 100 + 20% per round
- Damage: 20 base + 5/round
- Telegraph gets shorter (faster/harder to parry)
- Round 10 = boss (HP 300, damage 35, much faster telegraph)

### Round Structure

- Rounds 1–2: 1 enemy
- Rounds 3–4: 2 enemies
- Rounds 5–9: 3 enemies
- Round 10: 1 buffed boss

---

## Unity Architecture Plan

### Camera & Rendering Setup

The approach is **2.5D**: 2D background, 3D characters with a pixel shader.

**Recommended:** Single perspective camera, angled down at ~55–65°, slightly back. Characters move on the **XZ plane** (horizontal ground plane). Background is a flat quad mesh or `Sprite Renderer` at `y = 0`.

```
Camera (55° down angle, perspective)
  ├── Layer: Background  → flat quad with arena texture
  └── Layer: Characters  → 3D meshes with pixel shader
```

Use **URP (Universal Render Pipeline)** — it has Shader Graph, render layers, and is mobile-friendly.

**Pixel shader options (pick one):**

| Approach | How | Look |
|---|---|---|
| Render texture downscale | Render chars to 128×128 RT, upscale with point filter | True pixel art — "chunky" pixels |
| Posterization | Quantize colors to N steps in shader | Painterly, smooth edges |
| Outline + palette limit | Edge detection + restricted color count | Cel-shaded, clean |

Recommended: **posterization + hard-edged outlines** in Shader Graph — lets the 3D movement read clearly while looking hand-drawn.

---

### Scene Hierarchy

```
ArenaScene
├── CameraRig
│   └── MainCamera (URP, perspective, ~60° down)
├── Arena
│   ├── FloorQuad (arena_bg texture, y=0)
│   └── BoundaryTrigger (cylinder trigger, radius ~6 Unity units)
├── Characters
│   ├── Player
│   └── EnemyPool (spawned at runtime)
└── Managers
    ├── GameManager (round state, score)
    ├── CombatManager (hitbox resolution)
    └── UIManager (health/stamina bars, HUD)
```

---

### Character Architecture

Each character = one prefab:

```
CharacterRoot (Rigidbody, no gravity, freeze Y+rotation)
├── Model (MeshRenderer + pixel shader material)
├── HurtboxCollider (CapsuleCollider, trigger, "Hurtbox" layer)
├── AttackHitbox (BoxCollider, trigger, "Hitbox" layer, enabled only during active state)
└── Animator
```

**Physics layers:**

```
Layer 8:  Characters     (Rigidbody movement, collision with arena)
Layer 9:  Hurtbox        (receives damage)
Layer 10: Hitbox         (deals damage)
Layer 11: Arena          (boundary)
```

Set the layer collision matrix so Hitbox only hits Hurtbox. Characters collide with Arena but not with each other's Characters layer — handle separation in code like the original does.

---

### State Machine

Use a **C# enum state machine** rather than Unity Animator transitions — the timing logic is precise and you don't want Animator transitions fighting you:

```csharp
public enum CombatState { Idle, Windup, Active, Recovery, Blocking, Parrying, Dodging, Staggered }
```

Each `Update()` ticks `stateTimer -= Time.deltaTime` and transitions when it hits zero. The Animator is driven *by* the state (not the other way around) — state changes set Animator parameters.

---

### Hitbox System

Instead of manual rectangle intersection checks:

```csharp
// During Active state
Collider[] hits = Physics.OverlapBox(
    attackHitbox.transform.position,
    attackHitbox.size / 2,
    transform.rotation,       // rotation is free — no direction mapping needed
    hurtboxLayerMask
);
```

The rotation follows the character's `transform.forward` automatically. No more `atan2` math and 8-direction sprite mapping.

---

### Ball and Chain (future weapon)

Joint-simulated physics:

```
Chain Prefab:
├── Anchor (attached to hand bone via HingeJoint)
├── ChainLink_1..N (Rigidbody + HingeJoint + SphereCollider)
└── Ball (Rigidbody + SphereCollider trigger → damage on velocity threshold)
```

Use `Rigidbody.velocity.magnitude > threshold` to decide if the ball deals damage on contact. Completely impractical in 2D — native in 3D.

---

### Movement

```csharp
// Characters move on XZ plane
Vector3 moveDir = new Vector3(input.x, 0, input.y).normalized;
rb.velocity = moveDir * currentSpeed;

// Arena boundary
if (Vector3.Distance(transform.position, arenaCenter) > arenaRadius) {
    Vector3 toCenter = (arenaCenter - transform.position).normalized;
    rb.velocity += toCenter * bounceForce;
}
```

Speeds to port over:
- Normal: 110 px/sec → tune to Unity units (suggest ~5 units/sec as starting point)
- Blocking: 66 px/sec (~60% of normal)
- Dodging: 112 px/sec (~102% of normal — nearly same speed as walking)

---

### Character Facing

Original: complex 8-direction sprite mapping via `atan2`.

Unity 3D: just rotate the model.

```csharp
Vector3 toTarget = (target.position - transform.position);
toTarget.y = 0;
transform.rotation = Quaternion.LookRotation(toTarget);
```

The pixel shader + camera angle still reads as "top-down 2D" visually, but you get full 360° for free.

---

## Decisions Still to Make

| Decision | Options | Recommendation |
|---|---|---|
| Camera projection | Perspective vs Orthographic | **Perspective** (~60°) — reads better in 3D, ball and chain looks great |
| Pixel shader style | Render texture vs posterize vs outline | **Posterize + outline** — easiest to tune, no RT complexity |
| Character models | Low-poly custom vs capsule placeholder | Start with capsule to validate feel, replace with models later |
| Physics joint for chain | ConfigurableJoint vs SpringJoint vs custom | **ConfigurableJoint** — most control |
| Mobile input | Same virtual joystick system | Port the existing joystick layout to Unity UI directly |
| Audio | Not in original | Good time to add — FMOD or Unity AudioSource |

---

## What You Get for Free by Going 3D

- **Rotation**: attack arc follows character facing without any direction-remapping code
- **Ball and chain**: physics simulation is native
- **New weapon types**: sword sweeps, spear thrusts, shields — all work with `OverlapBox` at any angle
- **Camera shake**: just move the CameraRig, trivial
- **Knockback**: apply force to Rigidbody, it just works
- **Shadow**: free from 3D lighting

## Main Costs

- Need 3D character models (even low-poly)
- Pixel shader needs tuning to look intentional rather than like a bad filter
- URP setup and render layer configuration has upfront overhead

---

## Key Constants Reference

| Property | Value |
|---|---|
| Windup duration | 180ms |
| Active (hitbox) duration | 100ms |
| Recovery duration | 280ms |
| Dodge duration | 380ms |
| Dodge i-frames | 167ms |
| Parry window | 200ms |
| Stagger duration | 900ms |
| Max HP (player) | 100 |
| Max Stamina | 100 |
| Attack cost | 25 stamina |
| Dodge cost | 30 stamina |
| Parry cost | 20 stamina |
| Block drain | 15 stamina/sec |
| Stamina regen | 30 stamina/sec |
| Player attack damage | 25 |
| Block damage reduction | 70% |
| Enemy base HP | 100 |
| Enemy HP scaling | +20% per round |
| Enemy base damage | 20 |
| Enemy damage scaling | +5 per round |
| Boss HP (round 10) | 300 |
| Boss damage | 35 |
