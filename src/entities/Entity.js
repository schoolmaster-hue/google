class Entity {
    constructor(x, y, team) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x; this.y = y; this.team = team;
        this.active = true;
    }
}
