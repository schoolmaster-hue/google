class Tower extends Entity {
    constructor(x, y, team, isKing, towerId = null, level = 1) {
        super(x, y, team);
        this.isKing = isKing;
        this.team = team;
        this.level = level || 1;
        
        if (!towerId) {
            towerId = isKing ? 'king_tower' : 'princess';
        }
        this.towerId = towerId;
        this.db = (typeof TOWER_DB !== 'undefined' && TOWER_DB[towerId]) ? TOWER_DB[towerId] : {
            hp: isKing ? 4000 : 2500,
            dmg: isKing ? 110 : 100,
            atkSpeed: isKing ? 1.0 : 0.8,
            range: isKing ? 180 : 160,
            emoji: isKing ? '🤴' : '👸',
            projEmoji: isKing ? '💣' : '🏹',
            projSpeed: 300
        };

        const lvlMult = 1 + (this.level - 1) * 0.1;
        this.maxHp = Math.round(this.db.hp * lvlMult);
        this.hp = this.maxHp;
        this.range = this.db.range || (isKing ? 180 : 160);
        this.dmg = Math.round(this.db.dmg * lvlMult);
        this.atkSpeed = this.db.atkSpeed || (isKing ? 1.0 : 0.8);
        this.cooldown = 0;
        this.radius = isKing ? 30 : 25;
        this.emoji = this.db.emoji || (isKing ? '🤴' : '👸');
        this.projEmoji = this.db.projEmoji || (isKing ? '💣' : '🏹');
        this.projSpeed = this.db.projSpeed || 300;
        this.wokenUp = !isKing;

        // Special Tower Mechanics
        this.isQueen = (this.towerId === 'queen');
        this.queenCharges = 8;
        this.queenMaxCharges = 8;
        this.queenRecharging = false;
        this.queenRechargeTimer = 0;
        this.queenRechargeMax = 12.0;

        this.isChefKing = (this.towerId === 'chef_king');
        this.chefProgress = 0;
        this.chefChargeMax = 7.0;
    }

    update(dt) {
        if (!this.active) return;

        if (this.isChefKing) {
            if (this.chefProgress < this.chefChargeMax) {
                this.chefProgress = Math.min(this.chefChargeMax, this.chefProgress + dt);
            }
            if (this.chefProgress >= this.chefChargeMax) {
                const launched = this.launchWaffle();
                if (launched) {
                    this.chefProgress = 0;
                }
            }
        }

        if (this.isQueen && this.queenRecharging) {
            this.queenRechargeTimer += dt;
            if (this.queenRechargeTimer >= this.queenRechargeMax) {
                this.queenRecharging = false;
                this.queenCharges = this.queenMaxCharges;
                this.queenRechargeTimer = 0;
                const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
                engine.spawnText(this.x, this.y - 35, 'QUEEN READY! ✨', '#e056fd', 14);
                if (typeof SoundManager !== 'undefined') SoundManager.play('gem');
            }
        }

        if (this.isKing && !this.wokenUp) {
            const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
            const friendlyPrincesses = engine.towers.filter(t => t.active && t.team === this.team && !t.isKing);
            if (friendlyPrincesses.length < 2) {
                this.wokenUp = true;
            }
        }

        if (!this.wokenUp) return;
        if (this.cooldown > 0) this.cooldown -= dt;

        if (this.cooldown <= 0) {
            const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
            const target = engine.findClosestEnemy ? engine.findClosestEnemy(this.x, this.y, this.team, this.range) : Battle.findClosestEnemy(this.x, this.y, this.team, this.range);
            if (target) {
                let shotDmg = this.dmg;
                let shotSpeed = this.projSpeed;
                let shotEmoji = this.projEmoji;
                let nextCooldown = this.atkSpeed;

                if (this.isQueen) {
                    if (!this.queenRecharging && this.queenCharges > 0) {
                        this.queenCharges--;
                        nextCooldown = 0.28;
                        shotEmoji = '✨';
                        if (this.queenCharges <= 0) {
                            this.queenRecharging = true;
                            this.queenRechargeTimer = 0;
                        }
                    } else {
                        nextCooldown = 1.1;
                    }
                }

                engine.spawnProjectile(this.x, this.y, target, shotDmg, shotSpeed, this.team, shotEmoji, 0, this);
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.isKing ? 'cannon_fire' : (shotEmoji === '💣' ? 'cannon_fire' : (shotEmoji === '🏹' ? 'arrow_shoot' : 'fireball')));
                }
                this.cooldown = nextCooldown;
            }
        }
    }

    launchWaffle() {
        const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
        const friendlyUnits = engine.units.filter(u => u.active && u.team === this.team);
        if (friendlyUnits.length === 0) return false;

        friendlyUnits.sort((a, b) => (a.level || 1) - (b.level || 1));
        const lowestLevel = friendlyUnits[0].level || 1;
        const candidates = friendlyUnits.filter(u => (u.level || 1) === lowestLevel);
        const target = candidates[Math.floor(Math.random() * candidates.length)];

        if (target) {
            engine.spawnProjectile(this.x, this.y, target, 0, 240, this.team, '🧇', 0, this);
            if (typeof SoundManager !== 'undefined') SoundManager.play('pop');

            setTimeout(() => {
                if (target && target.active) {
                    target.level = (target.level || 1) + 1;
                    target.maxHp = Math.round(target.maxHp * 1.1);
                    target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * 0.15));
                    target.dmg = Math.round(target.dmg * 1.1);
                    engine.spawnParticles(target.x, target.y, 12, '#f1c40f', '🧇');
                    engine.spawnText(target.x, target.y - 25, `+1 LEVEL (Lvl ${target.level})! ⭐`, '#f1c40f', 15);
                    if (typeof SoundManager !== 'undefined') SoundManager.play('gem');
                }
            }, 400);
            return true;
        }
        return false;
    }

    takeDamage(amt, silent = false) {
        if (!this.active) return;
        this.hp -= amt;

        if (!silent) {
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnText.bind(PreviewGame) : Battle.spawnText.bind(Battle))(this.x, this.y - 30, `-${Math.round(amt)}`, '#e74c3c', 20);
            if (this.isKing && !Battle.isPreview) Battle.shakeScreen(5);
            if (typeof SoundManager !== 'undefined') SoundManager.play('tower_damage');
        }

        if (this.isKing && !this.wokenUp) this.wokenUp = true;

        if (this.hp <= 0) {
            this.hp = 0;
            this.active = false;

            if (typeof SoundManager !== 'undefined') SoundManager.play('tower_destroy');

            const flash = document.getElementById('screen-flash');
            if (flash) {
                flash.style.animation = 'none';
                void flash.offsetWidth;
                flash.style.animation = 'flashAnim 0.6s ease-out';
            }

            Battle.shakeScreen(15);
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 40, '#e74c3c', '💥');
            (typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame.spawnParticles.bind(PreviewGame) : Battle.spawnParticles.bind(Battle))(this.x, this.y, 25, '#555', '🪨');
            Battle.rubbles.push({ x: this.x, y: this.y, team: this.team, isKing: this.isKing });

            if (!this.isKing) {
                const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;
                const friendlyKing = engine.towers.find(t => t.active && t.team === this.team && t.isKing);
                if (friendlyKing) friendlyKing.wokenUp = true;
            }
            if (!Battle.isPreview) Battle.onTowerDestroyed(this.team);
            Battle.checkWinCondition(false);
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // Cartoony Tower Base
        ctx.fillStyle = this.team === 0 ? '#2980b9' : '#c0392b';
        const tw = this.radius * 2;
        const th = this.radius * 2.5;
        ctx.fillRect(this.x - tw / 2, this.y - th / 2 + 10, tw, th);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.strokeRect(this.x - tw / 2, this.y - th / 2 + 10, tw, th);

        // Battlements
        ctx.fillStyle = this.team === 0 ? '#3498db' : '#e74c3c';
        ctx.fillRect(this.x - tw / 2 - 5, this.y - th / 2, tw + 10, 15);
        ctx.strokeRect(this.x - tw / 2 - 5, this.y - th / 2, tw + 10, 15);

        // Tower Level Display
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(this.x - 18, this.y + 4, 36, 16, 4);
        else ctx.rect(this.x - 18, this.y + 4, 36, 16);
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f1c40f';
        ctx.font = '900 10px Nunito, Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`LV ${this.level}`, this.x, this.y + 12);

        // Emoji Avatar
        ctx.font = `${this.radius * 1.8}px Arial`;
        ctx.fillText(this.emoji, this.x, this.y - th / 2 - 10);

        if (this.isKing && !this.wokenUp) {
            ctx.font = '15px Arial'; ctx.fillStyle = '#fff'; ctx.fillText('💤', this.x + 20, this.y - th / 2 - 25);
        }

        if (this.isQueen) {
            const chargePct = this.queenRecharging
                ? Math.min(1, this.queenRechargeTimer / this.queenRechargeMax)
                : (this.queenCharges / this.queenMaxCharges);
            
            ctx.fillStyle = '#000'; ctx.fillRect(this.x - 22, this.y + th / 2 - 1, 44, 6);
            ctx.fillStyle = this.queenRecharging ? '#e67e22' : '#f1c40f';
            ctx.fillRect(this.x - 20, this.y + th / 2 + 1, 40 * chargePct, 2);
        } else if (this.isChefKing) {
            const chefPct = Math.min(1, this.chefProgress / this.chefChargeMax);
            ctx.fillStyle = '#000'; ctx.fillRect(this.x - 22, this.y + th / 2 - 1, 44, 6);
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(this.x - 20, this.y + th / 2 + 1, 40 * chefPct, 2);
        }

        // HP Bar Background
        ctx.fillStyle = '#000'; ctx.fillRect(this.x - 22, this.y + th / 2 + 5, 44, 9);
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = 'red'; ctx.fillRect(this.x - 20, this.y + th / 2 + 7, 40, 5);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - 20, this.y + th / 2 + 7, 40 * hpPct, 5);

        // HP Numbers
        ctx.fillStyle = '#fff';
        ctx.font = '900 12px Nunito';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(`${Math.ceil(this.hp)}`, this.x, this.y + th / 2 + 25);
        ctx.fillText(`${Math.ceil(this.hp)}`, this.x, this.y + th / 2 + 25);
    }
}
