const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In Unit.draw: Purple "Lvl X" for EVO units + restore shield aura for Evo Knight
const oldDrawLevel = `        // Level text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 3;
        ctx.fillText(\`Lvl \${this.level}\`, this.x, this.y - this.radius - 18);
        ctx.shadowBlur = 0; // reset`;

const newDrawLevel = `        // Level text: Vibrant purple for EVO units, white for regular units!
        const isEvoUnit = this.isEvoKnight || this.isEvoSkeleton || this.aura || (this.cardId && this.cardId.endsWith('_evo'));
        ctx.fillStyle = isEvoUnit ? '#e056fd' : '#fff';
        ctx.font = isEvoUnit ? '900 12px Nunito, Arial' : 'bold 11px Arial';
        ctx.shadowColor = isEvoUnit ? '#9b59b6' : '#000';
        ctx.shadowBlur = isEvoUnit ? 6 : 3;
        ctx.fillText(\`Lvl \${this.level}\`, this.x, this.y - this.radius - 18);
        ctx.shadowBlur = 0; // reset`;

html = html.replace(oldDrawLevel, newDrawLevel);

// In Unit.draw: Draw shield aura for Evo Knight while reflectCharges > 0
const oldDrawShield = `        // Shield visual for Night EVO
        if(this.shieldTimer > 0) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI*2);
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }`;

const newDrawShield = `        // Cool Shield Visual for Evo Knight while reflect charges are active
        if(this.isEvoKnight && this.reflectCharges > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#e056fd';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#e056fd';
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Render floating shield emoji indicator
            ctx.save();
            ctx.font = '16px Arial';
            ctx.fillText('🛡️', this.radius + 6, -this.radius);
            ctx.restore();
        }`;

html = html.replace(oldDrawShield, newDrawShield);

// 2. In Unit constructor: Initialize reflectCharges and isEvoKnight / isEvoSkeleton
const oldUnitConstructorInit = `        // EVO Shield mechanic
        this.hasShield = data.hasShield || false;
        this.shieldDuration = data.shieldDuration || 0;
        this.shieldTimer = 0;
        this.shieldActive = false;
        this.cycles = data.cycles || 0; // 2-cycle requirement for Barb EVO
        this.cyclesRepaired = true; // Can spawn immediately if cycles met`;

const newUnitConstructorInit = `        // EVO Knight Reflect Ability (First 3 hits dealt back to inflicter, 0 damage taken)
        this.isEvoKnight = data.isEvoKnight || (cardId === 'knight_evo');
        this.reflectCharges = this.isEvoKnight ? 3 : 0;
        
        // EVO Skeleton Cloner Ability (Every attack clones another EVO skeleton)
        this.isEvoSkeleton = data.isEvoSkeleton || (cardId === 'skeleton_evo');

        this.hasShield = data.hasShield || false;
        this.shieldDuration = data.shieldDuration || 0;
        this.shieldTimer = 0;
        this.shieldActive = false;
        this.cycles = data.cycles || 0;
        this.cyclesRepaired = true;`;

html = html.replace(oldUnitConstructorInit, newUnitConstructorInit);

// 3. In Unit.attack: Pass source = this to all damage targets
const oldAttackFn = `    attack(target) {
        if(this.type === 'ranged' || this.projSpeed > 0) {
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnProjectile.bind(PreviewGame) : Battle.spawnProjectile.bind(Battle))(this.x, this.y, target, this.dmg, this.projSpeed, this.team, this.emoji === '🏹' ? '🏹' : '🔥', this.splash);
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play(this.emoji === '🏹' ? 'arrow_shoot' : 'fireball');
            }
        } else if (this.type === 'melee' && this.splash > 0) {
            // Melee Splash (e.g. Valkyrie)
            this.attackAnimation = 0.4;
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 15, '#e74c3c', '💨');
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            [...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.towers : Battle.towers), ...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.units : Battle.units)].forEach(e => {
                if(e.team !== this.team && e.active && Math.hypot(e.x-this.x, e.y-this.y) <= this.splash) {
                    e.takeDamage(this.dmg);
                }
            });
        } else {
            // Normal Melee
            this.attackAnimation = 0.2;
            target.takeDamage(this.dmg);
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(target.x, target.y, 5, '#fff', '💨');
        }
    }`;

const newAttackFn = `    attack(target) {
        if(this.type === 'ranged' || this.projSpeed > 0) {
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnProjectile.bind(PreviewGame) : Battle.spawnProjectile.bind(Battle))(this.x, this.y, target, this.dmg, this.projSpeed, this.team, this.emoji === '🏹' ? '🏹' : '🔥', this.splash, this);
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play(this.emoji === '🏹' ? 'arrow_shoot' : 'fireball');
            }
        } else if (this.type === 'melee' && this.splash > 0) {
            // Melee Splash (e.g. Valkyrie)
            this.attackAnimation = 0.4;
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 15, '#e74c3c', '💨');
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            [...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.towers : Battle.towers), ...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.units : Battle.units)].forEach(e => {
                if(e.team !== this.team && e.active && Math.hypot(e.x-this.x, e.y-this.y) <= this.splash) {
                    e.takeDamage(this.dmg, false, this);
                }
            });
        } else {
            // Normal Melee
            this.attackAnimation = 0.2;
            target.takeDamage(this.dmg, false, this);
            if (typeof SoundManager !== 'undefined') SoundManager.play('sword_hit');
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(target.x, target.y, 5, '#fff', '💨');
            
            // Evo Skeletons Cloner
            if(this.isEvoSkeleton) {
                const gameInst = (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning) ? PreviewGame : Battle;
                const currentCount = gameInst.units.filter(u => u.active && u.cardId === 'skeleton_evo' && u.team === this.team).length;
                if(currentCount < 16) {
                    const spawnX = this.x + (Math.random() - 0.5) * 24;
                    const spawnY = this.y + (Math.random() - 0.5) * 24;
                    gameInst.units.push(new Unit(spawnX, spawnY, this.team, 'skeleton_evo'));
                    gameInst.spawnParticles(spawnX, spawnY, 8, '#e056fd', '💀');
                    gameInst.spawnText(spawnX, spawnY - 15, 'CLONE!', '#e056fd', 14);
                }
            }
        }
    }`;

html = html.replace(oldAttackFn, newAttackFn);

// 4. In Projectile: Pass source to target.takeDamage
const oldProjectileConstructor = `class Projectile extends Entity {
    constructor(x, y, target, dmg, speed, team, emoji, splash=0) {
        super(x, y, team);
        this.target = target; this.dmg = dmg; this.speed = speed; this.emoji = emoji; this.splash = splash;
        this.targetX = target.x; this.targetY = target.y; 
        this.trail = [];
    }`;

const newProjectileConstructor = `class Projectile extends Entity {
    constructor(x, y, target, dmg, speed, team, emoji, splash=0, source=null) {
        super(x, y, team);
        this.target = target; this.dmg = dmg; this.speed = speed; this.emoji = emoji; this.splash = splash;
        this.source = source;
        this.targetX = target.x; this.targetY = target.y; 
        this.trail = [];
    }`;

html = html.replace(oldProjectileConstructor, newProjectileConstructor);

const oldProjectileHit = `            if(this.splash > 0) {
                if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
                (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 15, '#e67e22', '💥');
                [...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.towers : Battle.towers), ...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.units : Battle.units)].forEach(e => {
                    if(e.team !== this.team && e.active && Math.hypot(e.x-this.x, e.y-this.y) <= this.splash) e.takeDamage(this.dmg);
                });
            } else {
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.emoji === '🏹' ? 'arrow_hit' : 'explosion');
                }
                if(this.target && this.target.active) this.target.takeDamage(this.dmg);
            }`;

const newProjectileHit = `            if(this.splash > 0) {
                if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
                (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 15, '#e67e22', '💥');
                [...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.towers : Battle.towers), ...(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.units : Battle.units)].forEach(e => {
                    if(e.team !== this.team && e.active && Math.hypot(e.x-this.x, e.y-this.y) <= this.splash) e.takeDamage(this.dmg, false, this.source);
                });
            } else {
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.emoji === '🏹' ? 'arrow_hit' : 'explosion');
                }
                if(this.target && this.target.active) this.target.takeDamage(this.dmg, false, this.source);
            }`;

html = html.replace(oldProjectileHit, newProjectileHit);

html = html.replace(/spawnProjectile\(x,y,t,d,s,tm,e, splash\) \{ this\.projectiles\.push\(new Projectile\(x,y,t,d,s,tm,e, splash\)\); \}/g, "spawnProjectile(x,y,t,d,s,tm,e, splash, source) { this.projectiles.push(new Projectile(x,y,t,d,s,tm,e, splash, source)); }");

const oldTowerShot = `(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnProjectile.bind(PreviewGame) : Battle.spawnProjectile.bind(Battle))(this.x, this.y, target, this.dmg, 300, this.team, '🔥');`;
const newTowerShot = `(typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnProjectile.bind(PreviewGame) : Battle.spawnProjectile.bind(Battle))(this.x, this.y, target, this.dmg, 300, this.team, '🔥', 0, this);`;
html = html.replace(oldTowerShot, newTowerShot);

// 5. In Unit.takeDamage: Reflect 100% of damage for first 3 hits and take 0 damage!
const oldTakeDamageBlock = `    takeDamage(amt, silent = false, source = null) {
        if(!this.active) return;
        
        // Shield Night damage reversal - reflects ALL damage for 3 seconds after taking damage
        if(this.shieldTimer > 0 && this.hasShield && source) {
            source.takeDamage(amt, false, this); // Reflect 100% of damage taken
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnText.bind(PreviewGame) : Battle.spawnText.bind(Battle))(this.x, this.y - 20, \`REFLECT! \${amt}\`, '#e056fd');
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 8, '#9b59b6', '🛡️');
        }
        
        this.hp -= amt;
        this.scale = 1.2;
        
        // Activate shield for 3 seconds after taking damage if this is Shield Night
        if(this.hasShield) {
            this.shieldTimer = this.shieldDuration;
            if(!this.shieldActive) {
                this.shieldActive = true;
                (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 12, '#9b59b6', '✨');
                (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnText.bind(PreviewGame) : Battle.spawnText.bind(Battle))(this.x, this.y, 'SHIELD UP', '#9b59b6', 18);
            }
        }
        
        if (!silent) {
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnText.bind(PreviewGame) : Battle.spawnText.bind(Battle))(this.x, this.y - 20, \`-\${Math.round(amt)}\`, '#fff');
        }
        if(this.hp <= 0) {
            this.active = false;
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 10, '#95a5a6', '☠️');
        }
    }`;

const newTakeDamageBlock = `    takeDamage(amt, silent = false, source = null) {
        if(!this.active) return;
        
        const gameInst = (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning) ? PreviewGame : Battle;

        // Evo Knight Reflect Ability: Absorbs and reflects 100% of damage back to attacker for first 3 hits, taking 0 damage!
        if(this.isEvoKnight && this.reflectCharges > 0) {
            this.reflectCharges--;
            this.scale = 1.25;
            gameInst.spawnParticles(this.x, this.y, 14, '#e056fd', '🛡️');
            gameInst.spawnText(this.x, this.y - 25, \`REFLECTED! (\${this.reflectCharges} left)\`, '#e056fd', 16);
            if(source && source.active && source !== this) {
                source.takeDamage(amt, false, this);
            }
            return; // 0 damage taken!
        }
        
        this.hp -= amt;
        this.scale = 1.2;
        
        if (!silent) {
            gameInst.spawnText(this.x, this.y - 20, \`-\${Math.round(amt)}\`, '#fff');
        }
        if(this.hp <= 0) {
            this.active = false;
            gameInst.spawnParticles(this.x, this.y, 10, '#95a5a6', '☠️');
        }
    }`;

html = html.replace(oldTakeDamageBlock, newTakeDamageBlock);

// 6. In openCardModal: Allow previewing base card and EVO card (even before EVO is unlocked!)
const oldPreviewBtnLogic = `        btnPreview.innerText = card.isEvoBase && GameData.evoUnlocked[cardId] ? 'Preview EVO' : 'Preview';
        btnPreview.onclick = () => {
            this.closeCardModal();
            const targetId = (card.isEvoBase && GameData.evoUnlocked[cardId]) ? cardId + '_evo' : cardId;
            PreviewGame.start(targetId);
        };`;

const newPreviewBtnLogic = `        const evoId = cardId + '_evo';
        const hasEvoVariant = card.isEvoBase && CARD_DB[evoId];

        btnPreview.innerText = 'Preview Card';
        btnPreview.onclick = () => {
            this.closeCardModal();
            PreviewGame.start(cardId);
        };

        // If card has an EVO variant, configure secondary button
        let btnEvoPreview = document.getElementById('btn-modal-preview-evo');
        if (!btnEvoPreview) {
            btnEvoPreview = document.createElement('button');
            btnEvoPreview.id = 'btn-modal-preview-evo';
            btnEvoPreview.className = 'btn';
            btnEvoPreview.style.cssText = 'flex: 1; background: linear-gradient(180deg, #9b59b6, #8e44ad);';
            btnPreview.parentNode.appendChild(btnEvoPreview);
        }

        if (hasEvoVariant) {
            btnEvoPreview.style.display = 'block';
            btnEvoPreview.innerText = 'Preview EVO';
            btnEvoPreview.onclick = () => {
                this.closeCardModal();
                PreviewGame.start(evoId);
            };
        } else {
            btnEvoPreview.style.display = 'none';
        }`;

html = html.replace(oldPreviewBtnLogic, newPreviewBtnLogic);

// 7. In PreviewGame.renderSandboxHand: If an EVO card is previewed, show its glowing purple background!
const oldSandboxRender = `            const div = document.createElement('div');
            div.className = 'battle-card ' + (this.sandboxSelectedCard === id ? 'selected' : '');
            div.style.minWidth = '65px';
            div.style.cursor = 'pointer';
            div.innerHTML = '<div class="elixir">' + (data.cost || 1) + '</div><div class="emoji">' + data.emoji + '</div>';`;

const newSandboxRender = `            const div = document.createElement('div');
            const isEvoCard = data.isEvo || id.endsWith('_evo');
            div.className = 'battle-card ' + (this.sandboxSelectedCard === id ? 'selected' : '') + (isEvoCard ? ' evo-active' : '');
            div.style.minWidth = '65px';
            div.style.cursor = 'pointer';
            div.innerHTML = '<div class="elixir">' + (data.cost || 1) + '</div><div class="emoji">' + data.emoji + '</div>' + (isEvoCard ? '<div style="position:absolute;bottom:2px;font-size:0.6rem;font-weight:900;color:#e056fd;">EVO</div>' : '');`;

html = html.replace(oldSandboxRender, newSandboxRender);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully written and verified updates!');
