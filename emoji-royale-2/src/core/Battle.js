const Battle = {
    canvas: null, ctx: null,
    lastTime: 0, loopId: null, isRunning: false,
    
    // Sandbox
    isPreview: false, sandboxTeam: 0, sandboxSelectedCard: null,
    
    // Entities
    towers: [], units: [], projectiles: [], particles: [], texts: [],
    rubbles: [], shockwaves: [],
    
    // State & Time Rules
    phase: 'normal', // 'normal', 'overtime', 'tiebreaker'
    playerElixir: 5, enemyElixir: 5, elixirMult: 1,
    matchTime: 180, overtimeTime: 120, 
    shakeOffset: {x:0,y:0}, shakeTicks: 0,
    botLevelOffset: 0,
    hasAnnouncedDouble: false, hasAnnouncedTriple: false, hasAnnouncedOvertime: false,
    
    // Hand & Cycle
    deckCycle: [], hand: [], nextCard: null,
    selectedHandIndex: -1,
    evoCharges: {},
    activeLegendAlive: false, legendCooldown: 0,
    
    // AI Personality System
    botPersonality: 'silent',
    emoteCooldown: 0,
    lastBotCard: null, // Track last card AI played to prevent cycling same card twice

    canUseEvo(id) {
        if (!id) return false;
        const card = CARD_DB[id];
        if (!card || !card.isEvoBase) return false; // Check 0: Card has an EVO
        if (GameData.mode === "casual") return true;

        // Check 1: Are EVOs unlocked in general (Arena 2+ / 300+ trophies)?
        const isEvoSystemUnlocked = (GameData.arena >= 2 || (GameData.trophies || 0) >= 300);
        if (!isEvoSystemUnlocked) return false;

        // Check 2: Is this specific card's EVO unlocked?
        const isSpecificEvoUnlocked = !!(GameData.evoUnlocked && GameData.evoUnlocked[id] === true);
        if (!isSpecificEvoUnlocked) return false;

        // Check 3: Is this card placed in one of the active EVO slots (slots 1 or 2)?
        const activeDeck = (Game.getBattleDeck ? Game.getBattleDeck() : (GameData.deck || []));
        const isInEvoSlot = activeDeck.slice(0, 2).includes(id);
        return isInEvoSlot;
    },
    
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONSTANTS.CANVAS_W;
        this.canvas.height = CONSTANTS.CANVAS_H;
        
        this.canvas.addEventListener('mousedown', this.handleInput.bind(this));
        this.canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); this.handleInput(e.touches[0]); }, {passive:false});
    },
    
    start(previewCardId = null) {
        if (!this.canvas) this.init();
        if (typeof PreviewGame !== "undefined" && PreviewGame.isRunning) {
            PreviewGame.exitPreview();
        }
        this.isRunning = false;
        if (this.loopId) cancelAnimationFrame(this.loopId);

        this.towers = []; this.units = []; this.projectiles = []; this.particles = []; this.texts = []; 
        this.rubbles = []; this.shockwaves = []; this.angerZones = []; this.poisonZones = [];
        this.playerElixir = 5; this.enemyElixir = 5; this.elixirMult = 1;
        this.matchTime = 180; this.overtimeTime = 120;
        this.phase = 'normal';
        this.evoCharges = {}; this.activeLegendAlive = false; this.legendCooldown = 0;
        this.lastBotCard = null;
        this.hasAnnouncedDouble = false; this.hasAnnouncedTriple = false; this.hasAnnouncedOvertime = false;
        this.botLevelOffset = Math.random() > 0.5 ? 1 : 0;
        
        // Assign Random Bot Personality
        const personalities = ['toxic', 'toxic', 'reactive', 'friendly', 'silent'];
        this.botPersonality = personalities[Math.floor(Math.random() * personalities.length)];
        this.emoteCooldown = 3;
        
        this.isPreview = !!previewCardId;

        // Player Towers & Loadout
        const isCasual = GameData && GameData.mode === 'casual';
        const pLoadout = (GameData && GameData.towerLoadout) ? GameData.towerLoadout : { leftPrincess: 'princess', king: 'king_tower', rightPrincess: 'princess' };
        const tLevels = (GameData && GameData.towerLevels) ? GameData.towerLevels : {};
        
        const leftLvl = isCasual ? 15 : (tLevels[pLoadout.leftPrincess] || 1);
        const kingLvl = isCasual ? 15 : (tLevels[pLoadout.king] || 1);
        const rightLvl = isCasual ? 15 : (tLevels[pLoadout.rightPrincess] || 1);

        const botArena = GameData.arena || 1;
        const botLvl = isCasual ? 15 : Math.max(1, botArena + this.botLevelOffset);

        const mX = CONSTANTS.CANVAS_W / 2;
        let t0k = new Tower(mX, CONSTANTS.CANVAS_H - 100, 0, true, pLoadout.king, kingLvl);
        let t0l = new Tower(90, CONSTANTS.CANVAS_H - 180, 0, false, pLoadout.leftPrincess, leftLvl);
        let t0r = new Tower(360, CONSTANTS.CANVAS_H - 180, 0, false, pLoadout.rightPrincess, rightLvl);
        this.towers.push(t0k, t0l, t0r);

        // Enemy Towers
        let t1k = new Tower(mX, 100, 1, true, 'king_tower', botLvl);
        let t1l = new Tower(90, 180, 1, false, 'princess', botLvl);
        let t1r = new Tower(360, 180, 1, false, 'princess', botLvl);
        this.towers.push(t1k, t1l, t1r);

        if(!this.isPreview) {
            const bUI = document.getElementById("battle-ui");
            const sUI = document.getElementById("sandbox-ui");
            if (bUI) bUI.style.display = "flex";
            if (sUI) sUI.style.display = "none";
            
            const activeDeck = Game.getBattleDeck ? Game.getBattleDeck() : (GameData.mode === "casual" ? GameData.casualDeck : GameData.deck);
            this.deckCycle = [...activeDeck].sort(()=>Math.random()-0.5);
            this.hand = this.deckCycle.splice(0, 4);
            this.nextCard = this.deckCycle.shift();

            // Initialize AI 8-card Deck with balanced archetype roles and fair cycling queue
            const botDeckList = this.createBotDeck(botArena);
            this.botDeckCycle = [...botDeckList].sort(() => Math.random() - 0.5);
            this.botHand = this.botDeckCycle.splice(0, 4);
            this.botNextCard = this.botDeckCycle.shift();
            this.botActionCooldown = 1.0 + Math.random() * 0.8;
            this.botTargetLane = Math.random() > 0.5 ? 'left' : 'right';
            
            BattleUI.renderHand();
            BattleUI.renderEmotes();
            const ec = document.getElementById("enemy-crowns");
            const pc = document.getElementById("player-crowns");
            if (ec) ec.innerText = "0";
            if (pc) pc.innerText = "0";
        } else {
            const bUI = document.getElementById("battle-ui");
            const sUI = document.getElementById("sandbox-ui");
            if (bUI) bUI.style.display = "none";
            if (sUI) sUI.style.display = "flex";
            this.sandboxTeam = 0;
            const teamBtn = document.getElementById("sandbox-team-btn");
            if (teamBtn) {
                teamBtn.style.background = "#3498db";
                teamBtn.innerText = "Blue Team";
            }
            this.sandboxSelectedCard = previewCardId || "knight";
            this.renderSandboxHand(this.sandboxSelectedCard);
        }

        document.getElementById('match-end-screen').style.display = 'none';
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loopId = requestAnimationFrame(this.loop.bind(this));
    },

    loop(timestamp) {
        if(!this.isRunning) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        if(this.isRunning) this.loopId = requestAnimationFrame(this.loop.bind(this));
    },

    update(dt) {
        if (!this.isPreview) {
            if (this.phase === 'normal') {
                this.matchTime -= dt;
                if (this.matchTime <= 60 && this.elixirMult === 1 && !this.hasAnnouncedDouble) {
                    this.elixirMult = 2;
                    this.hasAnnouncedDouble = true;
                    BattleUI.showAnnounce("Double Elixir");
                }
                if (this.matchTime <= 0) {
                    this.matchTime = 0;
                    this.handlePhaseEnd();
                }
            } else if (this.phase === 'overtime') {
                this.overtimeTime -= dt;
                if (this.overtimeTime <= 60 && this.elixirMult === 2 && !this.hasAnnouncedTriple) {
                    this.elixirMult = 3;
                    this.hasAnnouncedTriple = true;
                    BattleUI.showAnnounce("Triple Elixir");
                }
                if (this.overtimeTime <= 0) {
                    this.overtimeTime = 0;
                    this.handlePhaseEnd();
                }
            } else if (this.phase === 'tiebreaker') {
                // Tiebreaker: Take away 1 HP per tick from every active tower until the first tower dies!
                // 60 HP per second with realistic damage feedback so the lowest HP tower falls first
                const drainDmg = 60 * dt;
                this.towers.forEach(t => {
                    if (t.active && t.hp > 0) {
                        t.takeDamage(drainDmg, false);
                    }
                });
                if (this.towers.some(t => !t.active || t.hp <= 0)) {
                    this.checkWinCondition();
                }
            }

            const elixRate = CONSTANTS.ELIXIR_RATE * this.elixirMult;
            this.playerElixir = Math.min(CONSTANTS.MAX_ELIXIR, this.playerElixir + elixRate * dt);
            this.enemyElixir = Math.min(CONSTANTS.MAX_ELIXIR, this.enemyElixir + elixRate * dt);
            BattleUI.updateDynamicUI();
            this.botAI(dt);
        }

        if(this.legendCooldown > 0) this.legendCooldown -= dt;

        if (this.angerZones) {
            this.angerZones.forEach(z => z.life -= dt);
            this.angerZones = this.angerZones.filter(z => z.life > 0);
        }

        if (this.poisonZones) {
            this.poisonZones.forEach(pz => {
                pz.life -= dt;
                [...this.towers, ...this.units].forEach(e => {
                    if (e.team !== pz.team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - pz.x, e.y - pz.y) <= pz.radius) {
                        e.takeDamage(pz.dps * dt, true);
                        if (e instanceof Unit) e.poisonTimer = 0.3;
                    }
                });
            });
            this.poisonZones = this.poisonZones.filter(z => z.life > 0);
        }

        [...this.towers, ...this.units, ...this.projectiles, ...this.particles, ...this.texts, ...this.shockwaves].forEach(e => {
            if(e.active && e.update) e.update(dt);
        });

        this.towers = this.towers.filter(t => t.active);
        this.units = this.units.filter(u => u.active);
        this.projectiles = this.projectiles.filter(p => p.active);
        this.particles = this.particles.filter(p => p.active);
        this.texts = this.texts.filter(t => t.active);
        this.shockwaves = this.shockwaves.filter(s => s.active);

        if(this.shakeTicks > 0) {
            this.shakeOffset.x = (Math.random()-0.5)*15;
            this.shakeOffset.y = (Math.random()-0.5)*15;
            this.shakeTicks--;
        } else { this.shakeOffset = {x:0,y:0}; }
        
        const hadLegend = this.activeLegendAlive;
        this.activeLegendAlive = this.units.some(u => u.team === 0 && u.type === 'legend');
        if(hadLegend !== this.activeLegendAlive && !this.isPreview) BattleUI.updateLegendButton();
    },

    draw() {
        this.ctx.save();
        this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
        this.ctx.clearRect(0,0,CONSTANTS.CANVAS_W,CONSTANTS.CANVAS_H);
        
        this.drawArena();
        
        // Draw Anger Zones (Pure glowing bubbling red liquid pool - NO emoji)
        if (this.angerZones) {
            this.angerZones.forEach(az => {
                const pulse = 1 + 0.04 * Math.sin(performance.now() / 160);
                const radius = az.radius * pulse;

                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(az.x, az.y, radius + 6, 0, Math.PI * 2);
                this.ctx.fillStyle = az.team === 0 ? 'rgba(231, 76, 60, 0.2)' : 'rgba(192, 57, 43, 0.2)';
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(az.x, az.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = az.team === 0 ? 'rgba(231, 76, 60, 0.42)' : 'rgba(192, 57, 43, 0.42)';
                this.ctx.fill();

                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(az.x, az.y, radius * 0.55, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.35)';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();

                this.ctx.restore();
            });
        }

        // Draw Poison Zones (Bubbling emerald toxic cloud)
        if (this.poisonZones) {
            this.poisonZones.forEach(pz => {
                const pulse = 1 + 0.05 * Math.sin(performance.now() / 200);
                const radius = pz.radius * pulse;

                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(pz.x, pz.y, radius + 4, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(39, 174, 96, 0.25)';
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(pz.x, pz.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(46, 204, 113, 0.35)';
                this.ctx.fill();

                this.ctx.strokeStyle = '#27ae60';
                this.ctx.lineWidth = 2.5;
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(pz.x, pz.y, radius * 0.6, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();

                this.ctx.restore();
            });
        }

        // Draw Rubbles
        this.rubbles.forEach(r => {
            this.ctx.font = `${r.isKing ? 50 : 40}px Arial`;
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🪨', r.x, r.y);
        });

        const drawables = [...this.towers, ...this.units, ...this.projectiles, ...this.particles, ...this.shockwaves, ...this.texts];
        drawables.sort((a,b) => (a.y || 0) - (b.y || 0));
        drawables.forEach(d => { if(d.active) d.draw(this.ctx); });
        
        // Draw Dynamic Deployment Zone restricted area
        if(!this.isPreview && this.selectedHandIndex !== -1) {
            const selCardId = this.hand[this.selectedHandIndex];
            const selCardData = selCardId ? CARD_DB[selCardId] : null;
            const isSpell = selCardData && (selCardData.type === 'spell' || selCardData.targetType === 'Spell');

            if (!isSpell) {
                this.ctx.fillStyle = 'rgba(231, 76, 60, 0.25)';
                const midX = CONSTANTS.CANVAS_W / 2;
                
                let eLeftTowerActive = false;
                let eRightTowerActive = false;
                this.towers.forEach(t => {
                    if(t.team === 1 && !t.isKing) {
                        if(t.x < midX) eLeftTowerActive = true;
                        else eRightTowerActive = true;
                    }
                });

                if (eLeftTowerActive) this.ctx.fillRect(0, 0, midX, CONSTANTS.RIVER_Y + 10);
                else this.ctx.fillRect(0, 0, midX, 220);
                
                if (eRightTowerActive) this.ctx.fillRect(midX, 0, midX, CONSTANTS.RIVER_Y + 10);
                else this.ctx.fillRect(midX, 0, midX, 220);
            }
        }
        this.ctx.restore();
    },

    drawArena() {
        const ctx = this.ctx;
        const tileSize = 40;
        
        let arenaStyle = ARENAS[0].style;
        if (GameData.mode === 'trophy_road') {
            const currentArena = ARENAS.find(a => a.id === GameData.arena) || ARENAS[0];
            arenaStyle = currentArena.style;
        }

        for(let x = 0; x < CONSTANTS.CANVAS_W; x += tileSize) {
            for(let y = 0; y < CONSTANTS.CANVAS_H; y += tileSize) {
                ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? arenaStyle.g1 : arenaStyle.g2;
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
        
        ctx.fillStyle = arenaStyle.riv; ctx.fillRect(0, CONSTANTS.RIVER_Y - 25, CONSTANTS.CANVAS_W, 50);
        ctx.fillStyle = arenaStyle.foam; ctx.fillRect(0, CONSTANTS.RIVER_Y - 25, CONSTANTS.CANVAS_W, 5);
        ctx.fillRect(0, CONSTANTS.RIVER_Y + 20, CONSTANTS.CANVAS_W, 5); 
        
        ctx.fillStyle = arenaStyle.br;
        ctx.fillRect(CONSTANTS.LEFT_BRIDGE_X - CONSTANTS.BRIDGE_W/2, CONSTANTS.RIVER_Y - 25, CONSTANTS.BRIDGE_W, 50);
        ctx.fillRect(CONSTANTS.RIGHT_BRIDGE_X - CONSTANTS.BRIDGE_W/2, CONSTANTS.RIVER_Y - 25, CONSTANTS.BRIDGE_W, 50);
        
        ctx.strokeStyle = arenaStyle.brL; ctx.lineWidth = 4;
        ctx.strokeRect(CONSTANTS.LEFT_BRIDGE_X - CONSTANTS.BRIDGE_W/2, CONSTANTS.RIVER_Y - 25, CONSTANTS.BRIDGE_W, 50);
        ctx.strokeRect(CONSTANTS.RIGHT_BRIDGE_X - CONSTANTS.BRIDGE_W/2, CONSTANTS.RIVER_Y - 25, CONSTANTS.BRIDGE_W, 50);
    },

    handleInput(e) {
        if(!this.isRunning) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        if(this.isPreview) {
            if(this.sandboxSelectedCard) {
                this.playCard(this.sandboxSelectedCard, x, y, this.sandboxTeam);
            }
            return;
        }

        if(this.selectedHandIndex === -1) return;
        
        const midX = CONSTANTS.CANVAS_W / 2;
        let eLeftTowerActive = false;
        let eRightTowerActive = false;
        this.towers.forEach(t => {
            if(t.team === 1 && !t.isKing) {
                if(t.x < midX) eLeftTowerActive = true;
                else eRightTowerActive = true;
            }
        });

        const spawnRadius = 30;
        const bounded_x = Math.max(spawnRadius, Math.min(CONSTANTS.CANVAS_W - spawnRadius, x));
        const bounded_y = Math.max(spawnRadius, Math.min(CONSTANTS.CANVAS_H - spawnRadius, y));

        const cardId = this.hand[this.selectedHandIndex];
        const cardData = cardId ? CARD_DB[cardId] : null;
        const isSpell = cardData && (cardData.type === 'spell' || cardData.targetType === 'Spell');
        
        let allowed = isSpell ? true : false;
        if (!isSpell) {
            if(bounded_y > CONSTANTS.RIVER_Y + 10) allowed = true;
            else if(bounded_x < midX && !eLeftTowerActive && bounded_y > 220) allowed = true;
            else if(bounded_x >= midX && !eRightTowerActive && bounded_y > 220) allowed = true;
        }

        if(!allowed) {
            this.spawnText(x, y, "Invalid placement!", '#e74c3c');
            return;
        }
        
        x = bounded_x;
        y = bounded_y;
        
        this.playCard(this.selectedHandIndex, x, y, 0);
    },

    playCard(indexOrId, x, y, team) {
        const isIdx = typeof indexOrId === 'number';
        const cardId = (team === 0 && isIdx) ? this.hand[indexOrId] : indexOrId; 
        let data = CARD_DB[cardId];
        if(!data) return;
        
        if(!this.isPreview && team === 0 && data.isEvoBase && this.canUseEvo(cardId)) {
            const charge = this.evoCharges[cardId] || 0;
            const evoCard = CARD_DB[cardId + '_evo'];
            if(charge >= data.evoReq && evoCard) {
                data = evoCard;
                this.evoCharges[cardId] = 0;
            } else {
                this.evoCharges[cardId] = charge + 1;
            }
        }

        const cost = data.cost;
        
        if(!this.isPreview) {
            if(team === 0) {
                if(this.playerElixir < cost) return;
                this.playerElixir -= cost;
                const played = this.hand.splice(indexOrId, 1)[0];
                this.hand.splice(indexOrId, 0, this.nextCard); 
                this.deckCycle.push(played); 
                this.nextCard = this.deckCycle.shift(); 
                this.selectedHandIndex = -1;
                BattleUI.renderHand();
            } else {
                this.enemyElixir -= cost;
            }
        }
        
        // ANGER PUDDLE SPELL
        if (data.id === 'anger') {
            if (!this.angerZones) this.angerZones = [];
            this.angerZones.push({
                x: x,
                y: y,
                radius: 95,
                team: team,
                life: 5.0,
                maxLife: 5.0
            });
            this.spawnParticles(x, y, 25, '#e74c3c', '✨');
            this.spawnText(x, y - 25, 'ANGER! 💢', '#e74c3c', 16);
            if (typeof SoundManager !== 'undefined') SoundManager.play('magic');
            if (team === 0 && !this.isPreview) Progression.trackQuest('play', 1);
            return;
        }

        // POISON SPELL
        if (data.id === 'poison') {
            if (!this.poisonZones) this.poisonZones = [];
            const lvl = team === 0 ? (GameData.cardLevels['poison'] || 1) : (GameData.arena || 1);
            const lvlMulti = 1 + (lvl - 1) * 0.1;
            this.poisonZones.push({
                x: x,
                y: y,
                radius: 105,
                team: team,
                life: 6.0,
                maxLife: 6.0,
                dps: Math.round(75 * lvlMulti)
            });
            this.spawnParticles(x, y, 25, '#27ae60', '🧪');
            this.spawnParticles(x, y, 15, '#2ecc71', '✨');
            this.spawnText(x, y - 25, 'POISON CLOUD! 🧪', '#2ecc71', 16);
            if (typeof SoundManager !== 'undefined') SoundManager.play('magic');
            if (team === 0 && !this.isPreview) Progression.trackQuest('play', 1);
            return;
        }

        // ARROWS SPELL
        if (data.id === 'arrows') {
            const lvl = team === 0 ? (GameData.cardLevels['arrows'] || 1) : (GameData.arena || 1);
            const lvlMulti = 1 + (lvl - 1) * 0.1;
            const dmg = Math.round(160 * lvlMulti);
            for (let i = 0; i < 14; i++) {
                const ox = (Math.random() - 0.5) * 180;
                const oy = (Math.random() - 0.5) * 180;
                setTimeout(() => {
                    if (this.isRunning) {
                        this.spawnParticles(x + ox * 0.5, y + oy * 0.5, 3, '#f39c12', '🏹');
                    }
                }, i * 25);
            }
            setTimeout(() => {
                if (!this.isRunning) return;
                this.spawnParticles(x, y, 30, '#e74c3c', '💥');
                if (typeof SoundManager !== 'undefined') SoundManager.play('arrow_shoot');
                [...this.towers, ...this.units].forEach(e => {
                    if (e.team !== team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - x, e.y - y) <= 120) {
                        e.takeDamage(dmg, false);
                    }
                });
            }, 180);
            this.spawnText(x, y - 25, 'ARROWS VOLLEY! 🏹', '#f39c12', 16);
            if (team === 0 && !this.isPreview) Progression.trackQuest('play', 1);
            return;
        }

        // FIREBALL SPELL
        if (data.id === 'fireball_spell') {
            const lvl = team === 0 ? (GameData.cardLevels['fireball_spell'] || 1) : (GameData.arena || 1);
            const lvlMulti = 1 + (lvl - 1) * 0.1;
            const dmg = Math.round(360 * lvlMulti);
            this.spawnParticles(x, y - 60, 20, '#e67e22', '🔥');
            setTimeout(() => {
                if (!this.isRunning) return;
                this.spawnParticles(x, y, 40, '#e74c3c', '💥');
                this.spawnParticles(x, y, 20, '#f39c12', '🔥');
                if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
                [...this.towers, ...this.units].forEach(e => {
                    if (e.team !== team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - x, e.y - y) <= 85) {
                        e.takeDamage(dmg, false);
                        if (e instanceof Unit && e.type !== 'air' && !e.isBuilding) {
                            const ang = Math.atan2(e.y - y, e.x - x);
                            e.x += Math.cos(ang) * 40;
                            e.y += Math.sin(ang) * 40;
                        }
                    }
                });
            }, 220);
            this.spawnText(x, y - 25, 'FIREBALL BLAST! 🔥', '#e67e22', 18);
            if (team === 0 && !this.isPreview) Progression.trackQuest('play', 1);
            return;
        }

        // ZAP SPELL
        if (data.id === 'zap') {
            const lvl = team === 0 ? (GameData.cardLevels['zap'] || 1) : (GameData.arena || 1);
            const lvlMulti = 1 + (lvl - 1) * 0.1;
            const dmg = Math.round(80 * lvlMulti);
            this.spawnParticles(x, y, 30, '#3498db', '⚡');
            this.spawnParticles(x, y, 15, '#f1c40f', '✨');
            if (typeof SoundManager !== 'undefined') SoundManager.play('spark');
            [...this.towers, ...this.units].forEach(e => {
                if (e.team !== team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - x, e.y - y) <= 75) {
                    e.takeDamage(dmg, false);
                    if (e instanceof Unit) {
                        e.stunTimer = 0.5;
                        e.cooldown = Math.max(e.cooldown, 0.5);
                        if (e.isInferno) e.beamLockTime = 0;
                    }
                }
            });
            this.spawnText(x, y - 25, 'ZAP! ⚡', '#3498db', 16);
            if (team === 0 && !this.isPreview) Progression.trackQuest('play', 1);
            return;
        }

        // Spawn Shockwave Effect
        this.shockwaves.push(new Shockwave(x, y, team === 0 ? '#3498db' : '#e74c3c'));

        // Formation Spawn Offsets (Row / Triangle / Square / Gang formations)
        const isGang = (data.id === 'goblin_gang' || data.id === 'goblin_gang_evo');
        const isEvoGoblin = (data.id === 'goblin_gang_evo' || data.isEvoGoblin);
        const bunchId = (data.isEvoSkeleton || data.id === 'skeleton_evo' || isEvoGoblin) ? ('bunch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)) : null;
        const count = isGang ? 6 : (data.count || 1);

        if (isEvoGoblin) {
            const ghostAnchor = new Unit(x, y, team, data.id, bunchId);
            ghostAnchor.isGhostAnchor = true;
            ghostAnchor.speed = 0;
            ghostAnchor.hp = 999999;
            ghostAnchor.maxHp = 999999;
            ghostAnchor.emoji = '👻';
            this.units.push(ghostAnchor);
        }

        let formationOffsets = [];
        if (isGang) {
            const dir = team === 0 ? -1 : 1;
            formationOffsets = [
                { x: -20, y: dir * 14 },
                { x: 0, y: dir * 18 },
                { x: 20, y: dir * 14 },
                { x: -20, y: -dir * 14 },
                { x: 0, y: -dir * 18 },
                { x: 20, y: -dir * 14 }
            ];
        } else if (count === 3) {
            const dir = team === 0 ? -1 : 1;
            formationOffsets = [
                { x: 0, y: dir * 18 },
                { x: -16, y: -dir * 12 },
                { x: 16, y: -dir * 12 }
            ];
        } else if (count === 4) {
            formationOffsets = [
                { x: -16, y: -16 },
                { x: 16, y: -16 },
                { x: -16, y: 16 },
                { x: 16, y: 16 }
            ];
        } else if (count === 5) {
            formationOffsets = [
                { x: 0, y: -16 },
                { x: -18, y: 0 },
                { x: 18, y: 0 },
                { x: -28, y: 16 },
                { x: 28, y: 16 }
            ];
        } else if (count === 15) {
            // Concentric cluster for 15-unit Skeleton Group
            formationOffsets = [
                { x: 0, y: 0 },
                { x: 18, y: 0 }, { x: 6, y: 17 }, { x: -15, y: 11 }, { x: -15, y: -11 }, { x: 6, y: -17 },
                { x: 34, y: 0 }, { x: 26, y: 22 }, { x: 6, y: 33 }, { x: -17, y: 29 }, { x: -33, y: 12 },
                { x: -33, y: -12 }, { x: -17, y: -29 }, { x: 6, y: -33 }, { x: 26, y: -22 }
            ];
        }

        for (let i = 0; i < count; i++) {
            let spawnX = x;
            let spawnY = y;
            const offset = formationOffsets[i] || { x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20 };
            if (count > 1) {
                spawnX += offset.x;
                spawnY += offset.y;
            }
            const spawnCardId = isGang ? (i < 3 ? (isEvoGoblin ? 'goblin_gang_evo' : 'goblin') : 'spear_goblins') : data.id;
            const newUnit = new Unit(spawnX, spawnY, team, spawnCardId, bunchId);
            if (isGang) {
                if (i >= 3) {
                    newUnit.emoji = '👺🏹';
                    newUnit.type = 'ranged';
                    newUnit.range = 145;
                    newUnit.projSpeed = 220;
                    newUnit.dmg = Math.round(55 * (1 + (newUnit.level - 1) * 0.1));
                    newUnit.hp = Math.round(110 * (1 + (newUnit.level - 1) * 0.1));
                    newUnit.maxHp = newUnit.hp;
                    newUnit.atkSpeed = 1.1;
                    newUnit.speed = 90;
                } else {
                    newUnit.emoji = '👺🗡️';
                    newUnit.type = 'melee';
                    newUnit.range = 30;
                    newUnit.dmg = Math.round((isEvoGoblin ? 45 : 40) * (1 + (newUnit.level - 1) * 0.1));
                    newUnit.hp = Math.round((isEvoGoblin ? 140 : 120) * (1 + (newUnit.level - 1) * 0.1));
                    newUnit.maxHp = newUnit.hp;
                    newUnit.atkSpeed = isEvoGoblin ? 0.85 : 0.9;
                    newUnit.speed = isEvoGoblin ? 95 : 90;
                }
            }
            if (isEvoGoblin) newUnit.isEvoGoblin = true;
            newUnit.slotOffset = { x: offset.x, y: offset.y };
            this.units.push(newUnit);
            this.spawnParticles(spawnX, spawnY, 10, team === 0 ? '#3498db' : '#e74c3c', '✨');
        }

        // ELECTRO WIZARD SPAWN ZAP
        if (data.id === 'electro_wizard') {
            this.spawnParticles(x, y, 25, '#f1c40f', '⚡');
            this.spawnText(x, y - 25, 'ZAP LANDING! ⚡', '#3498db', 16);
            if (typeof SoundManager !== 'undefined') SoundManager.play('spark');
            const lvlMulti = 1 + ((team === 0 ? (GameData.cardLevels['electro_wizard'] || 1) : (GameData.arena || 1)) - 1) * 0.1;
            const zapDmg = Math.round(120 * lvlMulti);
            [...this.towers, ...this.units].forEach(e => {
                if (e.team !== team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - x, e.y - y) <= 70) {
                    e.takeDamage(zapDmg, false);
                    if (e instanceof Unit) {
                        e.stunTimer = 0.5;
                        e.cooldown = Math.max(e.cooldown, 0.5);
                        if (e.isInferno) e.beamLockTime = 0;
                    }
                }
            });
        }

        // MEGA KNIGHT SPAWN STOMP
        if (data.id === 'mega_knight') {
            this.spawnParticles(x, y, 30, '#2c3e50', '💥');
            this.spawnParticles(x, y, 20, '#7f8c8d', '🪨');
            this.spawnText(x, y - 25, 'SPAWN STOMP! 🔨', '#f1c40f', 18);
            if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');
            this.shakeTicks = 12;
            const lvlMulti = 1 + ((team === 0 ? (GameData.cardLevels['mega_knight'] || 1) : (GameData.arena || 1)) - 1) * 0.1;
            const stompDmg = Math.round(300 * lvlMulti);
            [...this.towers, ...this.units].forEach(e => {
                if (e.team !== team && e.active && !e.isGhostAnchor && !e.isLog && !e.isSpell && Math.hypot(e.x - x, e.y - y) <= 85) {
                    e.takeDamage(stompDmg, false);
                    if (e instanceof Unit) e.stunTimer = 0.4;
                }
            });
        }
        
        if(team === 0 && !this.isPreview) Progression.trackQuest('play', 1);
    },

    activateLegendAbility() {
        if(this.legendCooldown > 0 || this.playerElixir < 1 || !this.activeLegendAlive || this.isPreview) return;
        const legend = this.units.find(u => u.team === 0 && u.type === 'legend');
        if(!legend) return;
        const abl = CARD_DB[legend.cardId].ability;
        this.playerElixir -= abl.cost;
        this.legendCooldown = abl.cooldown;
        if (typeof SoundManager !== "undefined") SoundManager.play("magic");
        
        this.spawnParticles(legend.x, legend.y, 30, '#2ecc71', '➕');
        this.units.forEach(u => {
            if(u.team === 0 && Math.hypot(u.x-legend.x, u.y-legend.y) <= abl.radius) {
                u.hp = Math.min(u.maxHp, u.hp + abl.amount);
                this.spawnText(u.x, u.y-20, `+${abl.amount}`, '#2ecc71');
            }
        });
        BattleUI.updateLegendButton();
    },

    findClosestEnemy(x, y, team, maxRange) {
        let bestDist = maxRange; let bestE = null;
        [...this.towers, ...this.units].forEach(e => {
            if(e.team !== team && e.active && !e.isGhostAnchor) {
                const d = Math.hypot(e.x-x, e.y-y);
                if(d < bestDist) { bestDist = d; bestE = e; }
            }
        });
        return bestE;
    },
    spawnProjectile(x,y,t,d,s,tm,e, splash, source) { this.projectiles.push(new Projectile(x,y,t,d,s,tm,e, splash, source)); },
    spawnParticles(x,y,c,col,ch) { for(let i=0;i<c;i++) this.particles.push(new Particle(x,y,col,ch)); },
    spawnText(x,y,t,c,s) { this.texts.push(new FloatingText(x,y,t,c,s)); },
    shakeScreen(ticks) { this.shakeTicks = ticks; },
    getKingTower(team) { return this.towers.find(t => t.team === team && t.isKing); },

    createBotDeck(botArena) {
        // Player unlocked cards check
        const isPlayerUnlocked = (id) => {
            if (typeof ProgressionSystem !== 'undefined' && ProgressionSystem.isUnlocked) {
                return ProgressionSystem.isUnlocked(id);
            }
            if (typeof GameData !== 'undefined') {
                return (GameData.cardCopies && GameData.cardCopies[id] > 0) ||
                       (GameData.cardLevels && GameData.cardLevels[id] > 0) ||
                       (GameData.deck && GameData.deck.includes(id)) ||
                       (GameData.casualDeck && GameData.casualDeck.includes(id));
            }
            return false;
        };

        // Filter ONLY cards that the player has unlocked (excluding evo and legends)
        const validCards = Object.values(CARD_DB).filter(c => 
            !c.isEvoBase && !c.isEvo && c.type !== 'legend' && isPlayerUnlocked(c.id)
        );
        let validIds = validCards.map(c => c.id);

        const starterCards = ['knight', 'archer', 'giant', 'bomber', 'goblin', 'musketeer', 'valkyrie', 'skeleton'];
        const starterUnlocked = starterCards.filter(id => isPlayerUnlocked(id));
        if (validIds.length === 0) {
            validIds = starterUnlocked.length > 0 ? [...starterUnlocked] : [...starterCards];
        }

        const winConditions = ['giant', 'hog_rider', 'balloon', 'goblin_barrel', 'battle_ram', 'royal_giant'];
        const tanks = ['knight', 'valkyrie', 'mini_pekka', 'barbarians', 'prince', 'dark_prince', 'pekka', 'mega_knight'];
        const ranged = ['archer', 'musketeer', 'wizard', 'baby_dragon', 'bomber', 'electro_wizard', 'dart_goblin', 'firecracker', 'magic_archer'];
        const swarms = ['skeleton', 'goblin', 'spear_goblins', 'minions', 'bats', 'goblin_gang', 'skeleton_army'];
        const spells = ['fireball', 'arrows', 'zap', 'log', 'poison', 'rocket'];
        const buildings = ['cannon', 'bomb_tower', 'goblin_cage', 'tesla', 'inferno_tower', 'tombstone'];

        const deck = [];
        const pickOne = (pool) => {
            const available = pool.filter(id => validIds.includes(id) && !deck.includes(id));
            if (available.length > 0) {
                const picked = available[Math.floor(Math.random() * available.length)];
                deck.push(picked);
                return true;
            }
            return false;
        };

        // Select balanced roles from the player's unlocked cards
        pickOne(winConditions);
        pickOne(tanks);
        pickOne(ranged);
        pickOne(ranged);
        pickOne(swarms);
        pickOne(swarms);
        pickOne(spells);
        pickOne(buildings);

        // Fill remaining slots strictly from player's unlocked cards
        const shuffledRemaining = [...validIds].filter(id => !deck.includes(id)).sort(() => Math.random() - 0.5);
        for (const rId of shuffledRemaining) {
            if (deck.length >= 8) break;
            deck.push(rId);
        }

        // Fallback for edge cases with fewer than 8 total unlocked cards
        if (deck.length < 8) {
            for (const fb of starterUnlocked) {
                if (deck.length >= 8) break;
                if (!deck.includes(fb)) deck.push(fb);
            }
        }

        return deck.slice(0, 8);
    },

    botAI(dt) {
        // AI Emote Logic
        if (this.emoteCooldown > 0) this.emoteCooldown -= dt;
        if (this.emoteCooldown <= 0 && this.isRunning) {
            if (this.botPersonality === 'toxic' && Math.random() < 0.05) {
                const toxicEmotes = ['😂', '🥱', '🤡', '👎'];
                this.botEmote(toxicEmotes[Math.floor(Math.random() * toxicEmotes.length)]);
                this.emoteCooldown = 6 + Math.random() * 4; 
            } else if (this.botPersonality === 'friendly' && Math.random() < 0.02) {
                const friendlyEmotes = ['👍', '😎', '🎉'];
                this.botEmote(friendlyEmotes[Math.floor(Math.random() * friendlyEmotes.length)]);
                this.emoteCooldown = 15 + Math.random() * 10; 
            }
        }

        if (this.botActionCooldown > 0) this.botActionCooldown -= dt;
        if (!this.botHand || this.botHand.length === 0 || this.botActionCooldown > 0) return;

        const midX = CONSTANTS.CANVAS_W / 2;
        const incomingThreats = this.units.filter(u => u.team === 0 && u.active && u.y < CONSTANTS.RIVER_Y + 50);
        const hasCloseThreat = incomingThreats.some(u => u.y < 280);

        // AI plays card if:
        // 1) Urgent defense needed and bot has at least 2.5 elixir
        // 2) Moderate threats approaching and bot has >= 4 elixir
        // 3) Bot elixir is near max (>= 9.2) to prevent leaking elixir
        // 4) Pacing trigger when elixir >= 6.5
        const shouldPlay = (hasCloseThreat && this.enemyElixir >= 2.5) ||
                           (incomingThreats.length > 0 && this.enemyElixir >= 4) ||
                           (this.enemyElixir >= 9.2) ||
                           (this.enemyElixir >= 6.5 && Math.random() < 0.025);

        if (!shouldPlay) return;

        // Search bot's CURRENT 4-card hand for playable candidates
        const playableHandIndices = [];
        this.botHand.forEach((cId, idx) => {
            const cardData = CARD_DB[cId];
            if (cardData && this.enemyElixir >= cardData.cost) {
                playableHandIndices.push(idx);
            }
        });

        if (playableHandIndices.length === 0) return;

        let chosenHandIndex = -1;
        let targetX = midX;
        let targetY = 140;

        const pLeftTower = this.towers.find(t => t.team === 0 && !t.isKing && t.x < midX && t.active);
        const pRightTower = this.towers.find(t => t.team === 0 && !t.isKing && t.x >= midX && t.active);
        const pLeftTowerActive = !!pLeftTower;
        const pRightTowerActive = !!pRightTower;

        if (incomingThreats.length > 0) {
            // DEFENSE: Prioritize closest threats to bot towers
            const primaryThreat = incomingThreats.sort((a, b) => a.y - b.y)[0];
            const threatLane = primaryThreat.x < midX ? 'left' : 'right';
            const isTankThreat = (primaryThreat.cardId === 'giant' || primaryThreat.cardId === 'giant_evo' || primaryThreat.hp > 750);
            const threatLaneBaseX = threatLane === 'left' ? CONSTANTS.LEFT_BRIDGE_X : CONSTANTS.RIGHT_BRIDGE_X;

            const spellIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.type === 'spell' || data.id === 'arrows' || data.id === 'fireball' || data.id === 'zap' || data.id === 'poison' || data.id === 'rocket');
            });

            const buildingIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.type === 'building' || data.id === 'cannon' || data.id === 'bomb_tower' || data.id === 'goblin_cage' || data.id === 'tesla' || data.id === 'inferno_tower');
            });

            const swarmIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.id === 'skeleton' || data.id === 'goblin' || data.id === 'minions' || data.id === 'goblin_gang' || data.id === 'spear_goblins' || data.id === 'bats');
            });

            const tankDefenderIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.id === 'valkyrie' || data.id === 'knight' || data.id === 'mini_pekka' || data.id === 'barbarians');
            });

            const rangedDefenderIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.id === 'musketeer' || data.id === 'wizard' || data.id === 'baby_dragon' || data.id === 'bomber' || data.id === 'archer' || data.id === 'electro_wizard');
            });

            const nearbyCount = incomingThreats.filter(u => Math.hypot(u.x - primaryThreat.x, u.y - primaryThreat.y) < 65).length;
            if (spellIndex !== undefined && (nearbyCount >= 2 || (nearbyCount >= 1 && (primaryThreat.cardId === 'skeleton_army' || primaryThreat.cardId === 'goblin_gang' || primaryThreat.cardId === 'minions')))) {
                chosenHandIndex = spellIndex;
                targetX = primaryThreat.x;
                targetY = primaryThreat.y;
            } else if (buildingIndex !== undefined && (isTankThreat || hasCloseThreat)) {
                chosenHandIndex = buildingIndex;
                targetX = midX + (threatLane === 'left' ? -26 : 26) + (Math.random() - 0.5) * 16;
                targetY = 190 + Math.random() * 25; // Balanced center defensive pocket
            } else if (isTankThreat && swarmIndex !== undefined) {
                chosenHandIndex = swarmIndex;
                targetX = primaryThreat.x + (Math.random() - 0.5) * 20;
                targetY = Math.max(80, primaryThreat.y - 35);
            } else if (tankDefenderIndex !== undefined) {
                chosenHandIndex = tankDefenderIndex;
                targetX = primaryThreat.x + (Math.random() - 0.5) * 20;
                targetY = Math.max(80, primaryThreat.y - 30);
            } else if (rangedDefenderIndex !== undefined) {
                chosenHandIndex = rangedDefenderIndex;
                targetX = threatLane === 'left' ? (80 + (Math.random() - 0.5) * 25) : (370 + (Math.random() - 0.5) * 25);
                targetY = Math.max(70, Math.min(170, primaryThreat.y - 65));
            } else {
                chosenHandIndex = playableHandIndices.sort((a, b) => CARD_DB[this.botHand[a]].cost - CARD_DB[this.botHand[b]].cost)[0];
                targetX = threatLaneBaseX + (Math.random() - 0.5) * 30;
                targetY = Math.max(80, primaryThreat.y - 40);
            }
        } else {
            // OFFENSIVE PUSH: Fair dual-lane tactical distribution
            let chosenLane = this.botTargetLane || 'left';

            if (pLeftTower && pRightTower) {
                const hpDiff = pLeftTower.hp - pRightTower.hp;
                if (Math.abs(hpDiff) > 150) {
                    const lowerLane = hpDiff < 0 ? 'left' : 'right';
                    chosenLane = Math.random() < 0.75 ? lowerLane : (lowerLane === 'left' ? 'right' : 'left');
                } else {
                    chosenLane = Math.random() < 0.5 ? 'left' : 'right';
                }
            } else if (pLeftTower) {
                chosenLane = 'left';
            } else if (pRightTower) {
                chosenLane = 'right';
            } else {
                chosenLane = Math.random() < 0.5 ? 'left' : 'right';
            }
            this.botTargetLane = chosenLane;

            const laneBaseX = chosenLane === 'left' ? CONSTANTS.LEFT_BRIDGE_X : CONSTANTS.RIGHT_BRIDGE_X;
            const targetTower = chosenLane === 'left' ? pLeftTower : pRightTower;

            const winConditionIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.id === 'giant' || data.id === 'hog_rider' || data.id === 'balloon' || data.id === 'goblin_barrel' || data.id === 'battle_ram' || data.id === 'royal_giant' || data.id === 'giant_evo');
            });

            const supportIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.id === 'wizard' || data.id === 'musketeer' || data.id === 'bomber' || data.id === 'baby_dragon' || data.id === 'archer' || data.id === 'electro_wizard');
            });

            const tankIndex = playableHandIndices.find(idx => {
                const data = CARD_DB[this.botHand[idx]];
                return data && (data.id === 'knight' || data.id === 'valkyrie' || data.id === 'mini_pekka' || data.id === 'barbarians' || data.id === 'prince' || data.id === 'dark_prince' || data.id === 'pekka');
            });

            // Check if there is an existing friendly tank advancing on the chosen lane
            const advancingTank = this.units.find(u => u.team === 1 && u.active && (u.cardId === 'giant' || u.cardId === 'giant_evo' || u.cardId === 'knight' || u.cardId === 'valkyrie' || u.hp > 550) && ((u.x < midX ? 'left' : 'right') === chosenLane));

            if (advancingTank && supportIndex !== undefined) {
                chosenHandIndex = supportIndex;
                targetX = advancingTank.x + (Math.random() - 0.5) * 20;
                targetY = Math.max(65, advancingTank.y - 55);
            } else if (winConditionIndex !== undefined) {
                chosenHandIndex = winConditionIndex;
                const winCard = CARD_DB[this.botHand[winConditionIndex]];
                if (winCard.id === 'goblin_barrel' || winCard.id === 'miner') {
                    const destTower = targetTower || this.getKingTower(0);
                    targetX = destTower ? destTower.x + (Math.random() - 0.5) * 20 : laneBaseX;
                    targetY = destTower ? destTower.y + (Math.random() - 0.5) * 20 : CONSTANTS.CANVAS_H - 180;
                } else if (winCard.id === 'hog_rider' || winCard.id === 'battle_ram') {
                    targetX = laneBaseX + (Math.random() - 0.5) * 16;
                    targetY = CONSTANTS.RIVER_Y - 35;
                } else {
                    targetX = laneBaseX + (Math.random() - 0.5) * 20;
                    targetY = 65 + Math.random() * 25;
                }
            } else if (tankIndex !== undefined) {
                chosenHandIndex = tankIndex;
                targetX = laneBaseX + (Math.random() - 0.5) * 25;
                targetY = 80 + Math.random() * 40;
            } else if (supportIndex !== undefined) {
                chosenHandIndex = supportIndex;
                targetX = laneBaseX + (Math.random() - 0.5) * 25;
                targetY = 70 + Math.random() * 35;
            } else {
                chosenHandIndex = playableHandIndices.sort((a, b) => CARD_DB[this.botHand[a]].cost - CARD_DB[this.botHand[b]].cost)[0];
                targetX = midX + (Math.random() < 0.5 ? -45 : 45) + (Math.random() - 0.5) * 20;
                targetY = 65 + Math.random() * 25;
            }
        }

        if (chosenHandIndex === -1 || chosenHandIndex === undefined) return;

        // Strict 8-card cycle rotation: Hand has 4 cards. Current card is replaced by botNextCard. Played card joins botDeckCycle queue, next card popped.
        const playedCardId = this.botHand[chosenHandIndex];
        this.botHand[chosenHandIndex] = this.botNextCard;
        this.botDeckCycle.push(playedCardId);
        this.botNextCard = this.botDeckCycle.shift();

        // Enforce strict bounding on AI placement coordinates
        const cardObj = CARD_DB[playedCardId];
        const isSpell = cardObj && (cardObj.type === 'spell' || cardObj.targetType === 'Spell' || playedCardId === 'goblin_barrel' || playedCardId === 'miner');
        if (!isSpell) {
            targetX = Math.max(30, Math.min(CONSTANTS.CANVAS_W - 30, targetX));
            let maxY = CONSTANTS.RIVER_Y - 20;
            if (targetX < midX && !pLeftTowerActive) maxY = CONSTANTS.CANVAS_H - 220;
            else if (targetX >= midX && !pRightTowerActive) maxY = CONSTANTS.CANVAS_H - 220;
            targetY = Math.max(60, Math.min(maxY, targetY));
        }

        this.playCard(playedCardId, targetX, targetY, 1);
        this.botActionCooldown = 0.8 + Math.random() * 0.6; // Human-like reaction delay
    },

    // Handles logic exclusively for time transitions (normal -> overtime -> end)
    handlePhaseEnd() {
        let pCrowns = 3 - this.towers.filter(t=>t.team===1).length;
        let eCrowns = 3 - this.towers.filter(t=>t.team===0).length;
        
        const pKing = this.getKingTower(0);
        const eKing = this.getKingTower(1);
        if(!eKing || !eKing.active) pCrowns = 3;
        if(!pKing || !pKing.active) eCrowns = 3;

        if (pCrowns !== eCrowns) {
            this.endGame(pCrowns > eCrowns);
        } else {
            if (this.phase === 'normal') {
                this.phase = 'overtime';
                this.elixirMult = 2;
                if (!this.hasAnnouncedOvertime) {
                    this.hasAnnouncedOvertime = true;
                    BattleUI.showAnnounce("Overtime");
                }
            } else if (this.phase === 'overtime') {
                this.phase = 'tiebreaker';
                BattleUI.showAnnounce("Tiebreaker");
            }
        }
    },

    // Handles logic for instant wins (Kings dead) or sudden death triggers
    checkWinCondition() {
        if(this.isPreview || !this.isRunning) return;
        
        let pCrowns = 3 - this.towers.filter(t=>t.team===1).length;
        let eCrowns = 3 - this.towers.filter(t=>t.team===0).length;
        
        const pKing = this.getKingTower(0);
        const eKing = this.getKingTower(1);
        if(!eKing || !eKing.active) pCrowns = 3;
        if(!pKing || !pKing.active) eCrowns = 3;
        
        document.getElementById('player-crowns').innerText = pCrowns;
        document.getElementById('enemy-crowns').innerText = eCrowns;

        if(!pKing || !pKing.active || !eKing || !eKing.active) {
            this.endGame(pCrowns > eCrowns);
            return;
        }
        // In Overtime (Sudden Death) or Tiebreaker, the very first tower destroyed wins immediately!
        if ((this.phase === 'overtime' || this.phase === 'tiebreaker') && pCrowns !== eCrowns) {
            this.endGame(pCrowns > eCrowns);
            return;
        }
    },

    endGame(won) {
        if(!this.isRunning) return;
        this.isRunning = false;
        setTimeout(() => this.showEndScreen(won), 1500);
    },

    showEndScreen(won) {
        const scr = document.getElementById('match-end-screen');
        const title = document.getElementById('match-end-title');
        const bottomNav = document.querySelector('.bottom-nav');
        
        scr.style.display = 'flex';
        bottomNav.classList.add('hidden');
        
        if (GameData.mode === 'casual') {
            title.innerText = won ? "VICTORY!" : "DEFEAT";
            title.style.color = won ? '#f1c40f' : '#e74c3c';
            document.getElementById('end-trophies').innerText = "Casual Mode";
            document.getElementById('end-chest-text').innerText = "No rewards in Casual";
            return;
        }

        const currentArenaData = ARENAS.slice().reverse().find(a => GameData.trophies >= a.trophies) || ARENAS[0];
        const minTrophies = currentArenaData.trophies;
        const maxArenaData = ARENAS[ARENAS.length - 1];
        const maxTrophies = maxArenaData ? maxArenaData.trophies : 2700;

        if(won) {
            title.innerText = "VICTORY!"; title.style.color = '#f1c40f';
            const oldTrophies = GameData.trophies || 0;
            const newTrophies = Math.min(maxTrophies, oldTrophies + 30);
            const gained = newTrophies - oldTrophies;
            GameData.trophies = newTrophies;

            Progression.grantSeasonPassProgress(10);
            document.getElementById('end-trophies').innerText = gained > 0 ? `+${gained}` : "+0 (Max Arena)";
            Progression.trackQuest('win', 1);
            
            let chestGave = false;
            for(let i=0; i<4; i++) {
                if(!GameData.chests[i]) {
                    GameData.chests[i] = Math.random() > 0.8 ? 'gold' : 'silver';
                    chestGave = true; break;
                }
            }
            document.getElementById('end-chest-text').innerText = chestGave ? "Got a Gift! 🎁" : "Gift slots full!";
        } else {
            title.innerText = "DEFEAT"; title.style.color = '#e74c3c';
            
            const oldTrophies = GameData.trophies || 0;
            const isAtMaxArena = oldTrophies >= maxTrophies;
            const arenaFloor = isAtMaxArena
                ? ((ARENAS[ARENAS.length - 2] && ARENAS[ARENAS.length - 2].trophies) || 0)
                : minTrophies;
            GameData.trophies = Math.max(arenaFloor, oldTrophies - 30);
            const lost = oldTrophies - GameData.trophies;
            
            document.getElementById('end-trophies').innerText = `-${lost}`;
            document.getElementById('end-chest-text').innerText = "";
        }
        SaveSystem.save();
    },

    // --- AI Personality Event Hooks ---
    onTowerDestroyed(teamLost) {
        if (teamLost === 0) {
            if (this.botPersonality === 'toxic') {
                setTimeout(() => this.botEmote('😂'), 500);
                setTimeout(() => this.botEmote('🥱'), 2000);
            } else if (this.botPersonality === 'friendly') {
                setTimeout(() => this.botEmote('👍'), 1000);
            } else if (this.botPersonality === 'reactive') {
                setTimeout(() => this.botEmote('😎'), 1000);
            }
        } else {
            if (this.botPersonality === 'toxic') {
                setTimeout(() => this.botEmote('😡'), 500);
                setTimeout(() => this.botEmote('🤬'), 1500);
            } else if (this.botPersonality === 'friendly') {
                setTimeout(() => this.botEmote('😭'), 1000);
            }
        }
    },

    onPlayerEmote() {
        if (this.botPersonality === 'reactive' && this.emoteCooldown <= 0) {
            this.emoteCooldown = 3;
            const replies = ['😡', '😎', '👍', '😂', '🤔'];
            setTimeout(() => this.botEmote(replies[Math.floor(Math.random() * replies.length)]), 1000 + Math.random() * 1000);
        } else if (this.botPersonality === 'toxic' && this.emoteCooldown <= 0) {
            this.emoteCooldown = 2;
            setTimeout(() => this.botEmote('🥱'), 800);
        }
    },

    botEmote(emoji) {
        if (!this.isRunning || this.isPreview) return;
        const ep = document.createElement("div");
        ep.className = "emote-popup";
        ep.innerText = emoji;
        ep.style.right = "50px";
        ep.style.top = "100px";
        document.getElementById("battle-screen").appendChild(ep);
        if (typeof SoundManager !== 'undefined') SoundManager.play('emote', emoji);
        setTimeout(() => ep.remove(), 2000);
    },

    // Sandbox Helpers
    renderSandboxHand(previewCardId) {
        const defaultPool = ["knight", "archer", "giant", "skeleton", "valkyrie", "cannon", "wizard", "witch"];
        const pool = Array.from(new Set([previewCardId, ...defaultPool])).filter(id => id && CARD_DB[id]);
        const cont = document.getElementById("sandbox-hand");
        if (!cont) return;
        cont.innerHTML = "";
        pool.forEach(id => {
            const data = CARD_DB[id];
            if (!data) return;
            const div = document.createElement("div");
            div.className = `battle-card ${this.sandboxSelectedCard === id ? "selected" : ""}`;
            div.style.minWidth = "65px";
            div.style.cursor = "pointer";
            div.innerHTML = `<div class="elixir">${data.cost || 1}</div><div class="emoji">${data.emoji}</div>`;
            div.onclick = () => {
                this.sandboxSelectedCard = id;
                this.renderSandboxHand(previewCardId);
            };
            cont.appendChild(div);
        });
    },

    toggleSandboxTeam() {
        this.sandboxTeam = this.sandboxTeam === 0 ? 1 : 0;
        const btn = document.getElementById("sandbox-team-btn");
        if (btn) {
            btn.style.background = this.sandboxTeam === 0 ? "#3498db" : "#e74c3c";
            btn.innerText = this.sandboxTeam === 0 ? "Blue Team" : "Red Team";
        }
    },

    exitPreview() {
        this.isRunning = false;
        if (this.loopId) cancelAnimationFrame(this.loopId);
        document.getElementById("battle-screen").classList.remove("active");
        document.getElementById("sandbox-ui").style.display = "none";
        const bottomNav = document.querySelector(".bottom-nav");
        if (bottomNav) bottomNav.classList.remove("hidden");
        document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
        document.getElementById("menu-screen").classList.add("active");
        if (typeof MenuLogic !== "undefined" && MenuLogic.updateUI) {
            MenuLogic.updateUI();
            if (typeof SoundManager !== "undefined") SoundManager.playMusic("menu");
        }
    }
};