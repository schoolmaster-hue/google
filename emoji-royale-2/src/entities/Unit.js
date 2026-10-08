class Unit extends Entity {
    constructor(x, y, team, cardId, bunchId = null) {
        super(x, y, team);
        const data = CARD_DB[cardId] || CARD_DB['goblin'];
        
        const isCasual = GameData.mode === 'casual';
        
        let botLevel = 1;
        if (team === 1 && !isCasual) {
            let maxLvl = 1;
            for (let key in GameData.cardLevels) {
                if (GameData.cardLevels[key] > maxLvl) maxLvl = GameData.cardLevels[key];
            }
            botLevel = maxLvl + (Battle.botLevelOffset || 0);
        }
        this.level = isCasual ? 15 : (team === 0 ? (GameData.cardLevels[cardId] || 1) : botLevel);
        const multi = 1 + (this.level - 1) * 0.1;

        this.cardId = cardId;
        this.name = data.name;
        this.type = data.type; 
        this.maxHp = data.hp * multi; this.hp = this.maxHp;
        this.dmg = data.dmg * multi;
        this.range = data.range;
        this.speed = data.speed || 0;
        this.atkSpeed = data.atkSpeed;
        this.emoji = data.emoji;
        this.splash = data.splash || 0;
        this.projSpeed = data.projSpeed || 0;
        this.lifetime = data.lifetime || null;
        
        this.cooldown = 0;
        this.radius = 16;
        this.target = null;
        this.scale = 0.1; // pop in
        this.aura = data.aura || false;
        this.attackAnimation = 0; // used for visual effects
        this.stunTimer = 0;
        this.freezeTimer = 0;
        this.angerTimer = 0;

        // Special Unit Identifiers
        this.isInferno = data.isInferno || cardId === 'inferno_dragon';
        this.beamLockTime = 0;
        this.isElectroWizard = data.isElectroWizard || cardId === 'electro_wizard';
        this.isZappies = data.isZappies || cardId === 'zappies';
        this.isMegaKnight = data.isMegaKnight || cardId === 'mega_knight';
        this.megaKnightJumping = false;
        this.megaKnightJumpTimer = 0;
        this.megaKnightJumpDuration = 0.65;
        this.megaKnightJumpStartX = x;
        this.megaKnightJumpStartY = y;
        this.megaKnightJumpTargetX = x;
        this.megaKnightJumpTargetY = y;
        this.isSparky = data.isSparky || cardId === 'sparky';
        this.sparkyCharge = 0;
        this.isLumberjack = data.isLumberjack || cardId === 'lumberjack';
        this.isMagicArcher = data.isMagicArcher || cardId === 'magic_archer';
        this.isIceSpirit = data.isIceSpirit || cardId === 'ice_spirit';
        this.isLog = data.isLog || cardId === 'log';
        this.isSpell = data.type === 'spell' || data.targetType === 'Spell' || false;
        this.isAir = data.targetType === 'Air Unit' || false;
        this.airAltitude = this.isAir ? 18 : 0; // Hover height above ground shadow
        this.logDistance = 0;
        this.poisonTimer = 0;
        
        // EVO Attributes & Identification
        this.isEvo = data.isEvo || cardId.endsWith('_evo');
        this.isEvoSkeleton = data.isEvoSkeleton || cardId === 'skeleton_evo';
        this.isEvoKnight = data.isEvoKnight || cardId === 'knight_evo';
        this.isEvoGoblin = data.isEvoGoblin || cardId === 'goblin_gang_evo' || cardId === 'goblin_evo';

        // Bunch ID for Evo Skeletons and Evo Goblins
        this.bunchId = bunchId || ((this.isEvoSkeleton || this.isEvoGoblin) ? ('bunch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)) : null);

        // Evo Goblin Anchor / Ghost properties
        this.isGhostAnchor = false;
        this.pendingRevives = []; // Array of queued revive timers for souls
        this.currentReviveTimer = 0;
        this.slotOffset = { x: 0, y: 0 }; // Initial offset relative to center anchor

        // Evo Knight 3-attack reflection charges
        if (this.isEvoKnight) {
            this.reflectCharges = 3;
        } else {
            this.reflectCharges = 0;
        }

        // EVO Shield mechanic
        this.hasShield = data.hasShield || false;
        this.shieldDuration = data.shieldDuration || 0;
        this.shieldTimer = 0;
        this.shieldActive = false;
        this.cycles = data.cycles || 0;
        this.cyclesRepaired = true;
    }

    update(dt) {
        if (!this.active) return;
        if (this.scale < 1) this.scale = Math.min(1, this.scale + dt * 5);
        if (this.scale > 1) this.scale = Math.max(1, this.scale - dt * 5);
        
        const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;

        // Handle Freeze & Stun timers
        if (this.freezeTimer > 0) this.freezeTimer -= dt;
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.isInferno) this.beamLockTime = 0;
            return;
        }

        // Handle Poison timer (slows speed and atkSpeed by 30%)
        if (this.poisonTimer > 0) this.poisonTimer -= dt;
        const isPoisoned = this.poisonTimer > 0;

        // Check Anger Puddle (5s pool, grants +40% speed/atkSpeed while inside + 3s lingering after leaving)
        const inAngerPuddle = engine.angerZones && engine.angerZones.some(az => az.team === this.team && Math.hypot(az.x - this.x, az.y - this.y) <= az.radius);
        if (inAngerPuddle) {
            this.angerTimer = 3.0; // Refreshes continuously while inside
        } else if (this.angerTimer > 0) {
            this.angerTimer -= dt; // Lingers for 3 full seconds after leaving
        }
        const isAngered = this.angerTimer > 0;

        let speedMult = 1.0;
        if (isAngered) speedMult *= 1.4;
        if (isPoisoned) speedMult *= 0.7;
        const currentDt = dt * speedMult;

        if (isAngered && Math.random() < 0.25) {
            engine.spawnParticles(this.x, this.y - 12, 1, '#e74c3c', '✨');
        }
        if (isPoisoned && Math.random() < 0.2) {
            engine.spawnParticles(this.x, this.y - 10, 1, '#2ecc71', '🧪');
        }

        // THE LOG: Rolls forward horizontally across the lane width
        if (this.isLog) {
            const rollSpeed = this.speed || 130;
            const rollStep = rollSpeed * dt;
            const dir = this.team === 0 ? -1 : 1;
            this.y += dir * rollStep;
            this.logDistance += rollStep;

            const enemies = [...(engine.towers || []), ...(engine.units || [])].filter(e => e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell);
            enemies.forEach(e => {
                if (Math.abs(e.x - this.x) <= 35 && Math.abs(e.y - this.y) <= 18) {
                    if (!this.hitTargets) this.hitTargets = new Set();
                    if (!this.hitTargets.has(e)) {
                        this.hitTargets.add(e);
                        e.takeDamage(this.dmg, false, this);
                        if (e instanceof Unit && e.speed > 0 && e.type !== 'air') {
                            e.y += dir * 25; // Knockback
                            e.stunTimer = 0.4;
                        }
                    }
                }
            });

            if (Math.random() < 0.3) engine.spawnParticles(this.x, this.y, 2, '#d35400', '🪵');

            if (this.logDistance >= (this.range || 240) || this.y < 30 || this.y > CONSTANTS.CANVAS_H - 30) {
                this.active = false;
                engine.spawnParticles(this.x, this.y, 10, '#d35400', '🪵');
                if (typeof SoundManager !== 'undefined') SoundManager.play('pop');
            }
            return;
        }

        // MEGA KNIGHT JUMP ANIMATION
        if (this.isMegaKnight && this.megaKnightJumping) {
            this.megaKnightJumpTimer += dt;
            const progress = Math.min(1, this.megaKnightJumpTimer / this.megaKnightJumpDuration);
            this.x = this.megaKnightJumpStartX + (this.megaKnightJumpTargetX - this.megaKnightJumpStartX) * progress;
            const baseY = this.megaKnightJumpStartY + (this.megaKnightJumpTargetY - this.megaKnightJumpStartY) * progress;
            const arcHeight = 70 * Math.sin(progress * Math.PI);
            this.y = baseY - arcHeight;

            if (progress >= 1) {
                this.megaKnightJumping = false;
                this.y = this.megaKnightJumpTargetY;
                const slamDmg = Math.round(360 * (1 + (this.level - 1) * 0.1));
                engine.spawnParticles(this.x, this.y, 25, '#2c3e50', '💥');
                engine.spawnParticles(this.x, this.y, 15, '#7f8c8d', '🪨');
                engine.spawnText(this.x, this.y - 25, `CRATER SLAM! ${slamDmg}`, '#f1c40f', 16);
                if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
                if (engine.shakeScreen) engine.shakeScreen(10);

                [...engine.towers, ...engine.units].forEach(e => {
                    if (e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - this.x, e.y - this.y) <= 75) {
                        if (e instanceof Unit && e.isAir) return; // Ground crater slam does not hit flying units
                        e.takeDamage(slamDmg, false, this);
                        if (e instanceof Unit) e.stunTimer = 0.4;
                    }
                });
                this.cooldown = this.atkSpeed;
            }
            return;
        }

        // EVO Goblin Ghost Anchor Logic:
        if (this.isGhostAnchor) {
            const livingGoblins = engine.units.filter(u => u.active && !u.isGhostAnchor && u.team === this.team && u.isEvoGoblin && u.bunchId === this.bunchId);
            
            if (livingGoblins.length === 0) {
                this.active = false;
                this.pendingRevives = [];
                engine.spawnParticles(this.x, this.y, 15, '#9b59b6', '💨');
                return;
            }

            let avgX = 0, avgY = 0;
            livingGoblins.forEach(g => { avgX += g.x; avgY += g.y; });
            avgX /= livingGoblins.length;
            avgY /= livingGoblins.length;
            this.x += (avgX - this.x) * Math.min(1, dt * 5);
            this.y += (avgY - this.y) * Math.min(1, dt * 5);

            if (this.pendingRevives.length > 0) {
                this.currentReviveTimer += dt;
                if (Math.random() < 0.3) {
                    engine.spawnParticles(this.x, this.y - 10, 1, '#2ecc71', '✨');
                }

                if (this.currentReviveTimer >= 3.0) {
                    const reviveData = this.pendingRevives.shift();
                    this.currentReviveTimer = 0;

                    const spawnX = Math.max(20, Math.min(CONSTANTS.CANVAS_W - 20, this.x + (reviveData.offsetX || (Math.random() - 0.5) * 30)));
                    const spawnY = Math.max(20, Math.min(CONSTANTS.CANVAS_H - 20, this.y + (reviveData.offsetY || (Math.random() - 0.5) * 30)));

                    const revivedGoblin = new Unit(spawnX, spawnY, this.team, 'goblin_gang_evo', this.bunchId);
                    revivedGoblin.isEvoGoblin = true;
                    if (reviveData.isSpear) {
                        revivedGoblin.emoji = '👺🏹';
                        revivedGoblin.type = 'ranged';
                        revivedGoblin.range = 145;
                        revivedGoblin.projSpeed = 220;
                        revivedGoblin.dmg = Math.round(55 * (1 + (revivedGoblin.level - 1) * 0.1));
                        revivedGoblin.hp = Math.round(110 * (1 + (revivedGoblin.level - 1) * 0.1));
                        revivedGoblin.maxHp = revivedGoblin.hp;
                        revivedGoblin.atkSpeed = 1.1;
                        revivedGoblin.speed = 90;
                    } else {
                        revivedGoblin.emoji = '👺🗡️';
                        revivedGoblin.type = 'melee';
                        revivedGoblin.range = 30;
                        revivedGoblin.dmg = Math.round(45 * (1 + (revivedGoblin.level - 1) * 0.1));
                        revivedGoblin.hp = Math.round(140 * (1 + (revivedGoblin.level - 1) * 0.1));
                        revivedGoblin.maxHp = revivedGoblin.hp;
                        revivedGoblin.atkSpeed = 0.85;
                        revivedGoblin.speed = 95;
                    }
                    revivedGoblin.slotOffset = { x: reviveData.offsetX, y: reviveData.offsetY };
                    engine.units.push(revivedGoblin);

                    engine.spawnParticles(spawnX, spawnY, 15, '#2ecc71', '✨');
                    engine.spawnText(spawnX, spawnY - 20, 'REVIVED! 👺', '#2ecc71', 16);
                    if (typeof SoundManager !== 'undefined') SoundManager.play('magic');
                }
            }
            return;
        }

        // Update shield timer
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0 && this.shieldActive) {
                this.shieldActive = false;
                engine.spawnText(this.x, this.y, 'SHIELD DOWN', '#666', 16);
            }
        }
        
        // Handle Buildings decaying
        if (this.type === 'building' && this.lifetime) {
            this.hp -= (this.maxHp / this.lifetime) * dt;
            if (this.hp <= 0 && this.active) {
                this.takeDamage(0, true);
                return;
            }
        }

        if (this.attackAnimation > 0) this.attackAnimation -= dt;
        if (this.cooldown > 0) this.cooldown -= currentDt;

        // Dynamic Re-targeting: Don't chase ghosts across the map
        if (this.target && this.target.active && !this.target.isGhostAnchor && !this.target.isLog && !this.target.isSpell) {
            const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (dist > this.range && this.type !== 'building_target' && !this.isInferno) {
                const newTarget = this.findTarget();
                if (newTarget && newTarget !== this.target) {
                    if (newTarget instanceof Unit || (newTarget instanceof Tower && dist > Math.hypot(newTarget.x - this.x, newTarget.y - this.y))) {
                        this.target = newTarget;
                    }
                }
            }
        } else {
            this.target = this.findTarget();
            if (this.isInferno) this.beamLockTime = 0;
        }

        // INFERNO DRAGON CONTINUOUS RAMPING BEAM LOGIC:
        if (this.isInferno) {
            if (this.target && this.target.active && !this.target.isGhostAnchor && !this.target.isLog && !this.target.isSpell) {
                const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
                if (dist <= this.range + 18) {
                    this.beamLockTime = (this.beamLockTime || 0) + currentDt;
                    const multi = 1 + (this.level - 1) * 0.1;
                    let currentDps = 35 * multi;
                    if (this.beamLockTime >= 3.2) {
                        currentDps = 850 * multi;
                    } else if (this.beamLockTime >= 1.5) {
                        currentDps = 180 * multi;
                    }

                    this.target.takeDamage(currentDps * dt, true, this);

                    if (Math.random() < 0.4) {
                        const emberColor = this.beamLockTime >= 3.2 ? '#f1c40f' : (this.beamLockTime >= 1.5 ? '#e67e22' : '#e74c3c');
                        engine.spawnParticles(this.target.x, this.target.y, 1, emberColor, '🔥');
                    }
                    return;
                } else {
                    this.beamLockTime = 0;
                }
            } else {
                this.beamLockTime = 0;
            }
        }

        // SPARKY ELECTRICAL CHARGE ACCUMULATION
        if (this.isSparky) {
            this.sparkyCharge = Math.min(4.0, (this.sparkyCharge || 0) + currentDt);
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            // MEGA KNIGHT JUMP TRIGGER
            if (this.isMegaKnight && !this.megaKnightJumping && dist >= 75 && dist <= 165 && this.cooldown <= 0) {
                this.megaKnightJumping = true;
                this.megaKnightJumpTimer = 0;
                this.megaKnightJumpStartX = this.x;
                this.megaKnightJumpStartY = this.y;
                this.megaKnightJumpTargetX = this.target.x;
                this.megaKnightJumpTargetY = this.target.y;
                engine.spawnParticles(this.x, this.y, 10, '#2c3e50', '💨');
                engine.spawnText(this.x, this.y - 20, 'LEAP! 🔨', '#f1c40f', 15);
                return;
            }

            if (dist <= this.range) {
                if (this.isSparky) {
                    if (this.sparkyCharge >= 4.0 && this.cooldown <= 0) {
                        this.attack(this.target);
                        this.sparkyCharge = 0;
                        this.cooldown = this.atkSpeed;
                        this.scale = 1.4;
                    }
                } else if (this.cooldown <= 0) {
                    this.attack(this.target);
                    this.cooldown = this.atkSpeed;
                    this.scale = 1.3;
                }
            } else if (this.speed > 0) {
                let moveX = this.target.x;
                let moveY = this.target.y;
                
                // Only ground units need to pathfind across bridges; flying air units fly straight over the river!
                if (!this.isAir && ((this.team === 0 && this.y > CONSTANTS.RIVER_Y && this.target.y < CONSTANTS.RIVER_Y) ||
                    (this.team === 1 && this.y < CONSTANTS.RIVER_Y && this.target.y > CONSTANTS.RIVER_Y))) {
                    const distLeft = Math.abs(this.x - CONSTANTS.LEFT_BRIDGE_X);
                    const distRight = Math.abs(this.x - CONSTANTS.RIGHT_BRIDGE_X);
                    moveX = distLeft < distRight ? CONSTANTS.LEFT_BRIDGE_X : CONSTANTS.RIGHT_BRIDGE_X;
                    moveY = CONSTANTS.RIVER_Y; 
                }

                const mDx = moveX - this.x;
                const mDy = moveY - this.y;
                const mDist = Math.hypot(mDx, mDy) || 1;
                
                const moveSpeed = this.speed * speedMult;
                this.x += (mDx / mDist) * moveSpeed * dt;
                this.y += (mDy / mDist) * moveSpeed * dt;
            }
        }

        // UNIT-TO-UNIT SOFT COLLISION
        if (this.speed > 0 && !this.megaKnightJumping) {
            const allUnits = engine.units;
            for (let i = 0; i < allUnits.length; i++) {
                const other = allUnits[i];
                if (other === this || !other.active || other.isGhostAnchor || other.speed === 0 || other.isLog) continue;
                const cDx = this.x - other.x;
                const cDy = this.y - other.y;
                const cDist = Math.hypot(cDx, cDy);
                const minDist = this.radius + other.radius - 4;
                if (cDist < minDist && cDist > 0.01) {
                    const pushForce = (minDist - cDist) * 0.5 * Math.min(1, dt * 10);
                    const nX = cDx / cDist;
                    const nY = cDy / cDist;
                    this.x += nX * pushForce;
                    this.y += nY * pushForce;
                    other.x -= nX * pushForce;
                    other.y -= nY * pushForce;
                }
            }
        }
    }

    findTarget() {
        const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
        let enemies = [...engine.towers, ...engine.units].filter(e => e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell);
        if (enemies.length === 0) return null;

        // Ground Melee units CANNOT attack flying/air units. Only ranged units, spells, towers, and flying units can attack air units.
        const isGroundMelee = this.type === 'melee' && !this.isAir;
        if (isGroundMelee) {
            enemies = enemies.filter(e => !(e instanceof Unit && e.isAir));
            if (enemies.length === 0) return null;
        }
        
        const midX = CONSTANTS.CANVAS_W / 2;
        const mySideLeft = this.x <= midX;

        if (this.type === 'building_target') {
            const buildings = enemies.filter(e => e instanceof Tower || e.type === 'building');
            if (buildings.length === 0) return null;

            const sameLaneBuildings = buildings.filter(b => (b.x <= midX) === mySideLeft);
            const pool = sameLaneBuildings.length > 0 ? sameLaneBuildings : buildings;
            return pool.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
        }

        const immediateThreats = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= 45);
        if (immediateThreats.length > 0) {
            return immediateThreats.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
        }

        const sameLaneEnemies = enemies.filter(e => {
            const enemyLeft = e.x <= midX;
            return enemyLeft === mySideLeft;
        });

        const targetPool = sameLaneEnemies.length > 0 ? sameLaneEnemies : enemies;
        const laneUnits = targetPool.filter(e => e instanceof Unit && Math.hypot(e.x - this.x, e.y - this.y) <= 140);
        if (laneUnits.length > 0) {
            return laneUnits.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
        }

        return targetPool.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
    }

    attack(target) {
        const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
        this.attackAnimation = 0.4;

        // ICE SPIRIT SUICIDE FREEZE LEAP
        if (this.isIceSpirit) {
            this.active = false;
            engine.spawnParticles(target.x, target.y, 25, '#74b9ff', '❄️');
            engine.spawnParticles(target.x, target.y, 10, '#00cec9', '🧊');
            engine.spawnText(target.x, target.y - 20, `FREEZE! ${Math.round(this.dmg)}`, '#74b9ff', 15);
            if (typeof SoundManager !== 'undefined') SoundManager.play('magic');

            [...engine.towers, ...engine.units].forEach(e => {
                if (e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - target.x, e.y - target.y) <= (this.splash || 55)) {
                    e.takeDamage(this.dmg, false, this);
                    e.freezeTimer = 1.8;
                    e.stunTimer = 1.8;
                    if (e.isInferno) e.beamLockTime = 0;
                }
            });
            return;
        }

        // ELECTRO WIZARD DUAL ZAP + STUN
        if (this.isElectroWizard) {
            const enemies = [...engine.towers, ...engine.units].filter(e => e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - this.x, e.y - this.y) <= this.range + 10);
            enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            const targetsToHit = enemies.slice(0, 2);

            targetsToHit.forEach(t => {
                t.takeDamage(this.dmg, false, this);
                t.stunTimer = 0.5;
                t.cooldown = Math.max(t.cooldown, 0.5);
                if (t.isInferno) t.beamLockTime = 0;
                engine.spawnParticles(t.x, t.y, 8, '#f1c40f', '⚡');
                engine.spawnText(t.x, t.y - 15, `ZAP! ${Math.round(this.dmg)}`, '#3498db', 14);
            });

            if (typeof SoundManager !== 'undefined') SoundManager.play('spark');
            return;
        }

        // ZAPPIES MINI ZAP BOLT
        if (this.isZappies) {
            engine.spawnProjectile(this.x, this.y, target, this.dmg, this.projSpeed || 240, this.team, '⚡', 0, this);
            if (typeof SoundManager !== 'undefined') SoundManager.play('spark');
            return;
        }

        // SPARKY OVERCHARGE BLAST
        if (this.isSparky) {
            engine.spawnParticles(target.x, target.y, 35, '#f1c40f', '⚡');
            engine.spawnParticles(target.x, target.y, 20, '#e74c3c', '💥');
            engine.spawnText(target.x, target.y - 30, `BOOOM! ${Math.round(this.dmg)}`, '#f1c40f', 20);
            if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
            if (engine.shakeScreen) engine.shakeScreen(15);

            const rDx = this.x - target.x;
            const rDy = this.y - target.y;
            const rDist = Math.hypot(rDx, rDy) || 1;
            this.x += (rDx / rDist) * 16;
            this.y += (rDy / rDist) * 16;

            [...engine.towers, ...engine.units].forEach(e => {
                if (e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - target.x, e.y - target.y) <= (this.splash || 80)) {
                    e.takeDamage(this.dmg, false, this);
                }
            });
            return;
        }

        // MAGIC ARCHER PIERCING ARROW
        if (this.isMagicArcher) {
            const p = new Projectile(this.x, this.y, target, this.dmg, 280, this.team, '🏹', 0, this);
            p.isPiercing = true;
            p.piercedUnits = new Set();
            p.rangeLeft = 240;
            p.vx = ((target.x - this.x) / (Math.hypot(target.x - this.x, target.y - this.y) || 1)) * 280;
            p.vy = ((target.y - this.y) / (Math.hypot(target.x - this.x, target.y - this.y) || 1)) * 280;
            engine.projectiles.push(p);
            if (typeof SoundManager !== 'undefined') SoundManager.play('arrow_shoot');
            return;
        }

        // Regular Ranged / Splash / Melee Attacks
        if (this.range > 60) {
            engine.spawnProjectile(this.x, this.y, target, this.dmg, this.projSpeed, this.team, this.emoji.includes('🏹') || this.emoji === '🏹' ? '🏹' : '🔥', this.splash, this);
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play(this.emoji.includes('🏹') ? 'arrow_shoot' : 'fireball');
            }
        } else if (this.splash > 0) {
            this.attackAnimation = 0.4;
            engine.spawnParticles(this.x, this.y, 15, '#e74c3c', '💨');
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            const isGroundMelee = this.type === 'melee' && !this.isAir;
            [...engine.towers, ...engine.units].forEach(e => {
                if (e.team !== this.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - this.x, e.y - this.y) <= this.splash) {
                    if (isGroundMelee && e instanceof Unit && e.isAir) return; // Ground splash does not hit air units
                    e.takeDamage(this.dmg, false, this);
                }
            });
        } else {
            this.attackAnimation = 0.2;
            target.takeDamage(this.dmg, false, this);
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            engine.spawnParticles(target.x, target.y, 5, '#fff', '💨');
        }

        // Evo Skeletons on-attack cloning
        if (this.isEvoSkeleton && this.bunchId) {
            const bunchCount = engine.units.filter(u => u.active && u.team === this.team && u.isEvoSkeleton && u.bunchId === this.bunchId).length;
            if (bunchCount < 10) {
                const offsetAngle = Math.random() * Math.PI * 2;
                const spawnX = Math.max(20, Math.min(CONSTANTS.CANVAS_W - 20, this.x + Math.cos(offsetAngle) * 22));
                const spawnY = Math.max(20, Math.min(CONSTANTS.CANVAS_H - 20, this.y + Math.sin(offsetAngle) * 22));

                const clonedUnit = new Unit(spawnX, spawnY, this.team, this.cardId, this.bunchId);
                engine.units.push(clonedUnit);

                engine.spawnParticles(spawnX, spawnY, 8, '#e056fd', '✨');
                engine.spawnText(spawnX, spawnY - 15, 'CLONE!', '#e056fd', 14);
                if (typeof SoundManager !== 'undefined') SoundManager.play('pop');
            }
        }
    }

    takeDamage(amt, silent = false, source = null) {
        if (!this.active || this.isGhostAnchor || this.isLog || this.isSpell) return;
        
        // Evo Knight 3-Hit Reflection
        if (this.isEvoKnight && this.reflectCharges > 0 && source) {
            this.reflectCharges--;
            source.takeDamage(amt, false, this);
            const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
            engine.spawnText(this.x, this.y - 20, `REFLECT! ${Math.round(amt)}`, '#e056fd');
            engine.spawnParticles(this.x, this.y, 10, '#9b59b6', '🛡️');
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            return;
        }

        // Shield Night damage reversal
        if (this.shieldTimer > 0 && this.hasShield && source) {
            source.takeDamage(amt, false, this);
            const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
            engine.spawnText(this.x, this.y - 20, `REFLECT! ${amt}`, '#e056fd');
            engine.spawnParticles(this.x, this.y, 8, '#9b59b6', '🛡️');
        }
        
        this.hp -= amt;
        this.scale = 1.2;
        
        if (this.hasShield) {
            this.shieldTimer = this.shieldDuration;
            if (!this.shieldActive) {
                this.shieldActive = true;
                const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
                engine.spawnParticles(this.x, this.y, 12, '#9b59b6', '✨');
                engine.spawnText(this.x, this.y, 'SHIELD UP', '#9b59b6', 18);
            }
        }
        
        if (!silent) {
            const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
            engine.spawnText(this.x, this.y - 20, `-${Math.round(amt)}`, '#fff');
        }
        if (this.hp <= 0) {
            this.active = false;
            const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
            engine.spawnParticles(this.x, this.y, 10, '#95a5a6', '☠️');

            // TIMBER BERSERKER (LUMBERJACK) DEATH ANGER PUDDLE DROP (lasts 5s)
            if (this.isLumberjack) {
                if (!engine.angerZones) engine.angerZones = [];
                engine.angerZones.push({
                    x: this.x,
                    y: this.y,
                    radius: 95,
                    team: this.team,
                    life: 5.0,
                    maxLife: 5.0
                });
                engine.spawnParticles(this.x, this.y, 25, '#e74c3c', '✨');
                engine.spawnText(this.x, this.y - 20, 'ANGER DROP! 💢', '#e74c3c', 16);
                if (typeof SoundManager !== 'undefined') SoundManager.play('magic');
            }

            // EVO Goblin Soul Transfer
            if (this.isEvoGoblin && this.bunchId) {
                const ghostAnchor = engine.units.find(u => u.active && u.isGhostAnchor && u.bunchId === this.bunchId);
                if (ghostAnchor) {
                    ghostAnchor.pendingRevives.push({
                        offsetX: this.slotOffset ? this.slotOffset.x : 0,
                        offsetY: this.slotOffset ? this.slotOffset.y : 0,
                        isSpear: this.type === 'ranged' || (this.emoji && this.emoji.includes('🏹'))
                    });
                    engine.spawnParticles(this.x, this.y, 12, '#2ecc71', '👻');
                    engine.spawnText(this.x, this.y - 15, 'SOUL ✨', '#2ecc71', 14);
                    if (typeof SoundManager !== 'undefined') SoundManager.play('gem');
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // THE LOG HORIZONTAL ROLLING TRUNK RENDERING (No unit circles/emoji)
        if (this.isLog) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const rollAngle = (this.logDistance || 0) * 0.08;
            const logW = 56;
            const logH = 22;

            // Wooden trunk body
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath();
            ctx.roundRect(-logW / 2, -logH / 2, logW, logH, 6);
            ctx.fill();
            ctx.strokeStyle = '#4a2e12';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Iron bands
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(-logW / 2 + 10, -logH / 2, 5, logH);
            ctx.fillRect(logW / 2 - 15, -logH / 2, 5, logH);

            // Spikes
            ctx.fillStyle = '#f1c40f';
            for (let i = -logW / 2 + 6; i <= logW / 2 - 6; i += 11) {
                const spikeY = Math.sin(rollAngle + i) * 6;
                ctx.beginPath();
                ctx.arc(i, spikeY, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Trunk end caps
            ctx.fillStyle = '#d35400';
            ctx.beginPath();
            ctx.ellipse(-logW / 2 + 3, 0, 3, logH / 2 - 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(logW / 2 - 3, 0, 3, logH / 2 - 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            return; // Pure rolling log without unit base or bars
        }

        // INFERNO DRAGON CONTINUOUS RAMPING BEAM RENDERING
        if (this.isInferno && this.beamLockTime > 0 && this.target && this.target.active) {
            ctx.save();
            const stage = this.beamLockTime >= 3.2 ? 3 : (this.beamLockTime >= 1.5 ? 2 : 1);
            let beamWidth = stage === 3 ? 7 : (stage === 2 ? 4.5 : 2.5);
            let beamColor = stage === 3 ? '#f1c40f' : (stage === 2 ? '#e67e22' : '#e74c3c');
            let coreColor = stage === 3 ? '#ffffff' : (stage === 2 ? '#f9ca24' : '#ff7979');

            // Outer fiery glow
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.target.x, this.target.y);
            ctx.strokeStyle = beamColor;
            ctx.lineWidth = beamWidth + 4;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Inner intense core beam
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.target.x, this.target.y);
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = beamWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Beam impact flare
            ctx.beginPath();
            ctx.arc(this.target.x, this.target.y, stage === 3 ? 12 : (stage === 2 ? 8 : 5), 0, Math.PI * 2);
            ctx.fillStyle = stage === 3 ? 'rgba(241, 196, 15, 0.8)' : 'rgba(230, 126, 34, 0.6)';
            ctx.fill();

            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // EVO Goblin Ghost Anchor rendering
        if (this.isGhostAnchor) {
            ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(46, 204, 113, 0.4)'; ctx.fill();
            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2; ctx.stroke();

            ctx.font = `${this.radius * 2.2}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('👻', 0, -4);

            if (this.pendingRevives && this.pendingRevives.length > 0) {
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = '#fff';
                ctx.fillText(`✨x${this.pendingRevives.length}`, 0, -22);
            }
            ctx.restore();
            return;
        }

        // ANGER RED FURY AURA & SPARKLES
        if (this.angerTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(231, 76, 60, 0.45)';
            ctx.fill();
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = '14px Arial';
            ctx.fillText('😡', this.radius + 4, -this.radius);
        }

        // POISON VISUAL EFFECT
        if (this.poisonTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(39, 174, 96, 0.35)';
            ctx.fill();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // SPARKY CHARGING COILS VISUAL
        if (this.isSparky) {
            const chargePct = (this.sparkyCharge || 0) / 4.0;
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = chargePct >= 1 ? '#f1c40f' : '#3498db';
            ctx.lineWidth = chargePct >= 1 ? 3.5 : 2;
            ctx.stroke();
        }
        
        // Aura for all regular EVO units
        if (this.aura || this.isEvo) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
            ctx.fillStyle = this.isEvoGoblin ? 'rgba(46, 204, 113, 0.45)' : 'rgba(155, 89, 182, 0.45)';
            ctx.fill();
        }

        // Glowing shield visual for Evo Knight
        if (this.isEvoKnight && this.reflectCharges > 0) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#e056fd';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.font = '14px Arial';
            ctx.fillText('🛡️', this.radius + 2, -this.radius);
        }

        // Dedicated Ground Shadow for Flying Air Units to clearly indicate they are in the air!
        if (this.isAir) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(0, 10, this.radius + 3, (this.radius + 3) * 0.42, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
            ctx.fill();
            ctx.restore();

            // Elevate the flying unit and add subtle aerial hover bobbing
            const hoverBob = Math.sin((Date.now() / 250) + (this.x * 0.05)) * 3;
            ctx.translate(0, -this.airAltitude + hoverBob);
        }

        // Solid Cartoony Base (Ground units have a grounded base; air units have sleek aerial ring base)
        if (this.isAir) {
            ctx.beginPath(); ctx.ellipse(0, this.radius - 2, this.radius + 1, (this.radius + 1) / 2.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; ctx.fill();

            ctx.beginPath(); ctx.ellipse(0, this.radius - 4, this.radius - 1, (this.radius - 1) / 2.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = this.team === 0 ? '#2980b9' : '#c0392b';
            ctx.fill();
        } else {
            ctx.beginPath(); ctx.ellipse(0, this.radius - 2, this.radius + 2, (this.radius + 2) / 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#000'; ctx.fill();
            
            ctx.beginPath(); ctx.ellipse(0, this.radius - 4, this.radius, this.radius / 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = this.team === 0 ? '#3498db' : '#e74c3c';
            ctx.fill();
        }
        
        ctx.font = `${this.radius * 2}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, -4);

        // Status icons (Stun / Freeze / Poison)
        if (this.freezeTimer > 0) {
            ctx.font = '14px Arial';
            ctx.fillText('❄️', 0, -this.radius - 8);
        } else if (this.stunTimer > 0) {
            ctx.font = '14px Arial';
            ctx.fillText('⚡', 0, -this.radius - 8);
        } else if (this.poisonTimer > 0) {
            ctx.font = '14px Arial';
            ctx.fillText('🧪', 0, -this.radius - 8);
        }
        
        // Weapon/Effect Visuals
        if (this.cardId === 'valkyrie' && this.attackAnimation > 0) {
            ctx.save();
            ctx.rotate((0.4 - this.attackAnimation) * Math.PI * 10);
            ctx.font = `${this.radius * 1.5}px Arial`;
            ctx.fillText('🪓', this.radius + 5, 0);
            ctx.restore();
        } else if (this.attackAnimation > 0 && this.type === 'melee') {
            ctx.translate(this.radius / 2, 0);
        }

        ctx.restore();

        // Level text & HP Bar (omitted for spells and ghost anchor)
        if (!this.isLog && !this.isSpell && !this.isGhostAnchor) {
            if (this.isEvo) {
                ctx.fillStyle = this.isEvoGoblin ? '#2ecc71' : '#e056fd';
                ctx.shadowColor = this.isEvoGoblin ? '#27ae60' : '#8e44ad';
                ctx.shadowBlur = 6;
            } else {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 3;
            }
            ctx.font = 'bold 11px Arial';
            ctx.fillText(`Lvl ${this.level}`, this.x, this.y - this.radius - 18);
            ctx.shadowBlur = 0;

            const hpPct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = '#000'; ctx.fillRect(this.x - 17, this.y - this.radius - 12, 34, 8);
            ctx.fillStyle = 'red'; ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 4);
            ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * hpPct, 4);
        }
    }
}
