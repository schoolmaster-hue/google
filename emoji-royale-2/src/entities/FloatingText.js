class FloatingText {
    constructor(x,y,text,color, size=16) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1.0;
        this.active = true;
        this.vy = -40; // float up
    }
    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
        if(this.life<=0) this.active=false;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color; 
        ctx.font = `900 ${this.size}px Nunito`;
        ctx.strokeStyle = 'black'; 
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}
