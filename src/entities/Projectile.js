class Projectile extends Entity {
    constructor(x, y, target, dmg, speed, team, emoji, splash = 0, source = null) {
        super(x, y, team);
        this.target = target; this.dmg = dmg; this.speed = speed; this.emoji = emoji; this.splash = splash;
        this.source = source;
        this.targetX = target ? target.x : x; this.targetY = target ? target.y : y;
        this.trail = [];
        this.isPiercing = false;
        this.piercedUnits = new Set();
        this.rangeLeft = 240;
        this.vx = 0;
        this.vy = 0;
    }
    update(dt) {
        if (!this.active) return;
        this.trail.push({ x: this.x, y: this.y, life: 1.0 });
        this.trail.forEach(t => t.life -= dt * 5);
        this.trail = this.trail.filter(t => t.life > 0);

        const engine = typeof PreviewGame !== 'undefined' && PreviewGame.isRunning ? PreviewGame : Battle;

        // Piercing Magic Arrow
        if (this.isPiercing) {
            const stepDist = this.speed * dt;
            this.x += (this.vx / this.speed) * stepDist;
            this.y += (this.vy / this.speed) * stepDist;
            this.rangeLeft -= stepDist;

            const enemies = [...(engine.towers || []), ...(engine.units || [])].filter(e => e.team !== this.team && e.active && !e.isGhostAnchor);
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) <= 24 && !this.piercedUnits.has(e)) {
                    this.piercedUnits.add(e);
                    e.takeDamage(this.dmg, false, this.source);
                    engine.spawnParticles(e.x, e.y, 4, '#1abc9c', '✨');
                }
            });

            if (this.rangeLeft <= 0 || this.x < 10 || this.x > CONSTANTS.CANVAS_W - 10 || this.y < 10 || this.y > CONSTANTS.CANVAS_H - 10) {
                this.active = false;
            }
            return;
        }

        if (this.target && this.target.active && !this.target.isGhostAnchor) {
            this.targetX = this.target.x; this.targetY = this.target.y;
        }
        const dx = this.targetX - this.x; const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 10) {
            this.active = false;
            if (this.splash > 0) {
                if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
                engine.spawnParticles(this.x, this.y, 15, '#e67e22', '💥');
                [...engine.towers, ...engine.units].forEach(e => {
                    if (e.team !== this.team && e.active && !e.isGhostAnchor && Math.hypot(e.x - this.x, e.y - this.y) <= this.splash) e.takeDamage(this.dmg, false, this.source);
                });
            } else {
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.emoji === '🏹' ? 'arrow_hit' : (this.emoji === '⚡' ? 'spark' : 'explosion'));
                }
                if (this.target && this.target.active && !this.target.isGhostAnchor) {
                    this.target.takeDamage(this.dmg, false, this.source);
                    if (this.emoji === '⚡') {
                        this.target.stunTimer = 0.5;
                        this.target.cooldown = Math.max(this.target.cooldown, 0.5);
                        if (this.target.isInferno) this.target.beamLockTime = 0;
                        engine.spawnParticles(this.target.x, this.target.y, 6, '#f1c40f', '⚡');
                    }
                }
            }
        } else {
            this.x += (dx / dist) * this.speed * dt; this.y += (dy / dist) * this.speed * dt;
        }
    }
    draw(ctx) {
        if (!this.active) return;
        this.trail.forEach(t => {
            ctx.globalAlpha = Math.max(0, t.life);
            ctx.fillStyle = this.isPiercing ? '#1abc9c' : (this.team === 0 ? '#3498db' : '#e74c3c');
            ctx.beginPath(); ctx.arc(t.x, t.y, 4 * t.life, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;
        ctx.font = '15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
    }
}
