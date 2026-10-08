class Shockwave {
    constructor(x,y, color) {
        this.x=x; this.y=y; this.color=color;
        this.radius = 0; this.life = 1.0; this.active = true;
    }
    update(dt) {
        this.radius += 100 * dt;
        this.life -= dt * 2;
        if(this.life<=0) this.active=false;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius/2, 0, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}
