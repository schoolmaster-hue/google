class Particle {
    constructor(x,y, color, char) {
        this.x=x; this.y=y; this.color=color; this.char=char;
        this.vx = (Math.random()-0.5)*150; this.vy = (Math.random()-0.5)*150;
        this.life = 1.0; this.active = true;
    }
    update(dt) {
        this.x+=this.vx*dt; this.y+=this.vy*dt;
        this.life -= dt*2;
        if(this.life<=0) this.active=false;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        if(this.char) {
            ctx.font = '15px Arial'; ctx.fillText(this.char, this.x, this.y);
        } else {
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}
