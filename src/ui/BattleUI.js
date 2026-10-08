const BattleUI = {
    renderHand() {
        const cont = document.getElementById('battle-hand');
        cont.innerHTML = '';
        Battle.hand.forEach((id, index) => {
            let data = CARD_DB[id];
            const isEvoReady = data.isEvoBase && (Battle.evoCharges[id] || 0) >= data.evoReq;
            if(isEvoReady) data = CARD_DB[id+'_evo'];

            const div = document.createElement('div');
            const isDisabled = Battle.playerElixir < data.cost;
            div.className = `battle-card ${Battle.selectedHandIndex === index ? 'selected' : ''} ${isEvoReady ? 'evo-active' : ''} ${isDisabled ? 'disabled' : ''}`;
            div.innerHTML = `<div class="elixir">${data.cost}</div><div class="emoji">${data.emoji}</div>`;
            
            if(CARD_DB[id].isEvoBase) {
                const charges = Battle.evoCharges[id] || 0;
                const req = CARD_DB[id].evoReq;
                let dotsHTML = '<div class="evo-charges">';
                for(let i=0; i<req; i++) dotsHTML += `<div class="evo-drop ${i<charges ? 'filled' : ''}"></div>`;
                dotsHTML += '</div>';
                div.innerHTML += dotsHTML;
            }

            div.onclick = () => {
                if(Battle.playerElixir >= data.cost) {
                    Battle.selectedHandIndex = Battle.selectedHandIndex === index ? -1 : index;
                    this.updateCardSelection();
                }
            };
            cont.appendChild(div);
        });

        const nData = CARD_DB[Battle.nextCard];
        document.getElementById('next-card').querySelector('.emoji').innerText = nData.emoji;
    },

    updateCardSelection() {
        const cards = document.querySelectorAll('.battle-card');
        cards.forEach((card, index) => {
            if (Battle.selectedHandIndex === index) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    },
    
    renderEmotes() {
        const m = document.getElementById('emote-menu');
        m.innerHTML = '';
        const equipped = (GameData.equipSlots || []).filter((emoji, index, list) => emoji && list.indexOf(emoji) === index);

        equipped.forEach((emoji) => {
            const div = document.createElement('div');
            div.className = 'emote-option';
            div.innerText = emoji;
            div.onclick = () => this.playEmote(emoji);
            m.appendChild(div);
        });
    },

    showAnnounce(text) {
        const a = document.getElementById('announcement-text');
        a.innerText = text;
        a.style.animation = 'none';
        void a.offsetWidth; // trigger reflow
        a.style.animation = 'announceAnim 2s forwards';
    },

    updateDynamicUI() {
        document.getElementById('elixir-bar-fill').style.width = `${(Battle.playerElixir/10)*100}%`;
        document.getElementById('elixir-text').innerText = Math.floor(Battle.playerElixir);
        
        const tDisp = document.getElementById('timer-display');
        tDisp.style.color = '#fff';
        
        if (Battle.phase === 'normal') {
            const m = Math.floor(Battle.matchTime / 60);
            let s = Math.floor(Battle.matchTime % 60);
            if(s < 10) s = '0'+s;
            tDisp.innerText = `${m}:${s}`;
            if(Battle.matchTime <= 60 && !tDisp.style.animation) tDisp.style.animation = 'pulse 1s infinite';
        } else if (Battle.phase === 'overtime') {
            const m = Math.floor(Battle.overtimeTime / 60);
            let s = Math.floor(Battle.overtimeTime % 60);
            if(s < 10) s = '0'+s;
            tDisp.innerText = `+${m}:${s}`;
            tDisp.style.color = '#e74c3c'; // Red for overtime
        } else {
            tDisp.innerText = `0:00`;
            tDisp.style.color = '#e74c3c';
            tDisp.style.animation = 'pulse 0.2s infinite';
        }

        const cards = document.querySelectorAll('.battle-card');
        Battle.hand.forEach((id, i) => {
            if(Battle.playerElixir < CARD_DB[id].cost) cards[i].classList.add('disabled');
            else cards[i].classList.remove('disabled');
        });
        
        if(Battle.legendCooldown > 0 || Battle.playerElixir < 1) {
            document.getElementById('legend-ability-btn').classList.add('cooldown');
            if(Battle.legendCooldown > 0) {
                document.getElementById('legend-ability-btn').innerText = Math.ceil(Battle.legendCooldown);
            } else {
                document.getElementById('legend-ability-btn').innerText = '⚡';
            }
        } else if(Battle.activeLegendAlive) {
            document.getElementById('legend-ability-btn').classList.remove('cooldown');
            document.getElementById('legend-ability-btn').innerText = '⚡';
        }
    },
    
    updateLegendButton() {
        const btn = document.getElementById('legend-ability-btn');
        if(!Battle.activeLegendAlive) {
            btn.style.display = 'none';
            return;
        }
        btn.style.display = 'flex';
        
        // Visual feedback for insufficient elixir (when not on cooldown)
        const canUse = Battle.legendCooldown <= 0 && Battle.playerElixir >= 1;
        btn.style.opacity = canUse ? '1' : '0.3';
        btn.style.filter = (canUse ? 'none' : 'grayscale(1)') + (btn.classList.contains('cooldown') ? ' grayscale(1)' : '');
    },

    toggleEmotes() { document.getElementById('emote-menu').classList.toggle('active'); },

    playEmote(emoji) {
        this.toggleEmotes();
        const popup = document.createElement('div');
        popup.className = 'emote-popup';
        popup.innerText = emoji;
        popup.style.left = '50px'; popup.style.bottom = '150px';
        document.getElementById('battle-screen').appendChild(popup);
        setTimeout(() => popup.remove(), 2000);
        
        // Notify the Battle Controller so the AI can react
        Battle.onPlayerEmote();
    }
};
