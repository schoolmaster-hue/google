const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// ==========================================
// 1. CSS UPDATES
// ==========================================

// Update EVO Slot & Card Styling:
// - Slots 1 & 2 have a purple outline border (#9b59b6).
// - Inside collection or normal cards, DO NOT make background purple unless 3 checks pass:
//   Check 1: Card has an EVO (card.isEvoBase)
//   Check 2: Card is in Slot 1 or 2 (i < 2)
//   Check 3: Player personally owns that EVO unlocked (GameData.evoUnlocked[cardId] === true)
// - Add .evo-cycle-pips styling for in-game cards (black/empty circle with purple filled inner circle).
// - Add .battle-btn.disabled style when deck < 8.

const oldEvoCss = `        /* EVO Slots (Normal card look with EVO outline unless unlocked & activated) */
        .deck-slot.evo-slot {
            border: 3px solid #8e44ad !important;
            box-shadow: 0 4px 0 #5e2d73, 0 0 8px rgba(142, 68, 173, 0.3) !important;
        }
        .deck-slot.evo-slot:hover {
            box-shadow: 0 4px 0 #5e2d73, 0 0 14px rgba(155, 89, 182, 0.6) !important;
        }
        .card-item.evo-activated {
            border-color: #d63031;
            border-color: #a29bfe !important;
            background: linear-gradient(135deg, #2d1b4e, #4834d4) !important;
            box-shadow: 0 4px 0 #6c5ce7, 0 0 20px rgba(162, 155, 254, 0.8) !important;
            animation: evoSlotGlow 1.8s infinite alternate ease-in-out;
        }
        @keyframes evoSlotGlow {
            0% { box-shadow: 0 4px 0 #6c5ce7, 0 0 12px rgba(162, 155, 254, 0.5); }
            100% { box-shadow: 0 4px 0 #6c5ce7, 0 0 24px rgba(224, 86, 253, 0.95); }
        }`;

const newEvoCss = `        /* EVO Slots: Always slots 1 and 2 (first two in top-left) */
        .deck-slot.evo-slot {
            border: 3px solid #9b59b6 !important;
            box-shadow: 0 4px 0 #5e2d73, 0 0 10px rgba(155, 89, 182, 0.4) !important;
        }
        .deck-slot.evo-slot:hover {
            box-shadow: 0 4px 0 #5e2d73, 0 0 16px rgba(155, 89, 182, 0.7) !important;
        }
        .card-item.evo-activated {
            border-color: #a29bfe !important;
            background: linear-gradient(135deg, #2d1b4e, #4834d4) !important;
            box-shadow: 0 4px 0 #6c5ce7, 0 0 20px rgba(162, 155, 254, 0.9) !important;
            animation: evoSlotGlow 1.8s infinite alternate ease-in-out;
        }
        @keyframes evoSlotGlow {
            0% { box-shadow: 0 4px 0 #6c5ce7, 0 0 12px rgba(162, 155, 254, 0.5); }
            100% { box-shadow: 0 4px 0 #6c5ce7, 0 0 24px rgba(224, 86, 253, 0.95); }
        }

        /* Battle Card EVO Activated State in Hand */
        .battle-card.evo-active {
            border-color: #a29bfe !important;
            background: linear-gradient(135deg, #2d1b4e, #4834d4) !important;
            box-shadow: 0 4px 0 #6c5ce7, 0 0 20px rgba(224, 86, 253, 0.95) !important;
            animation: evoGlow 1s infinite alternate;
        }

        /* In-game Card Cycle Pips (Circle with black outline / purple filled circle) */
        .evo-cycle-container {
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 4px;
            align-items: center;
            justify-content: center;
            z-index: 10;
            pointer-events: none;
        }
        .evo-cycle-circle {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #111;
            border: 2px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
        .evo-cycle-circle.filled .evo-cycle-inner {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #e056fd;
            box-shadow: 0 0 6px #e056fd;
        }

        /* Disabled Battle Button when deck < 8 */
        .btn.battle-btn.disabled {
            background: linear-gradient(180deg, #555, #333) !important;
            color: #888 !important;
            border-color: #222 !important;
            box-shadow: 0 4px 0 #111 !important;
            animation: none !important;
            cursor: not-allowed !important;
            opacity: 0.85;
        }`;

html = html.replace(oldEvoCss, newEvoCss);

// ==========================================
// 2. MENU LOGIC & DECK RENDERING
// ==========================================

// In MenuLogic:
// - Always render slots 0 and 1 (visual Slots 1 & 2) as EVO slots with purple outline.
// - If empty, slot 0 and 1 show a purple plus `+` icon (`color: #9b59b6; font-weight: 900`).
// - Card background turns purple ONLY if all 3 checks pass:
//   1. card.isEvoBase
//   2. i < 2 (is in EVO slot)
//   3. GameData.evoUnlocked[cardId] === true (Player personally unlocked it)
// - Update battle button in MenuLogic.updateUI():
//   - If deck length < 8: Gray, says "CARDS NEEDED (X/8)", disabled.
//   - If deck length == 8: Normal red glowing, says "BATTLE", enabled.

const oldRcSearch = html.indexOf('renderCards() {');
const oldRcEnd = html.indexOf('showShardCollection(cardId)', oldRcSearch);

const newRcBlock = `renderCards() {
        const deckGrid = document.getElementById('ui-deck-grid');
        const collGrid = document.getElementById('ui-collection-grid');
        const deckInfo = document.getElementById('deck-info');
        deckGrid.innerHTML = ''; 
        if (collGrid) collGrid.innerHTML = '';

        const isCasual = GameData.mode === 'casual';
        const activeDeck = this.getActiveDeck();
        // The first two slots in the top left are always the designated EVO Slots
        const numEvoSlots = 2;

        deckInfo.innerHTML = '<span style="color:#9b59b6; font-weight:900;">⚡ Slots 1 & 2: EVO Slots</span> <span style="color:#aaa;">(Place an unlocked EVO card here to activate its power!)</span>';

        let totalCost = 0;

        // Render all 8 Deck Slots (Slots 0 and 1 are designated EVO Slots with purple outline)
        for(let i = 0; i < 8; i++) {
            const cardId = activeDeck[i] || null;
            const isEvoSlot = i < numEvoSlots;
            const slotDiv = document.createElement('div');
            
            const card = cardId ? CARD_DB[cardId] : null;

            // Strict 3-Check EVO Activation:
            // Check 1: Card has an Evolution (card.isEvoBase)
            // Check 2: Card is placed in Slot 1 or 2 (isEvoSlot)
            // Check 3: Player personally owns and unlocked that card's EVO (GameData.evoUnlocked[cardId] === true)
            const check1_hasEvo = !!(card && card.isEvoBase);
            const check2_inSlot = isEvoSlot;
            const check3_unlocked = !!(cardId && GameData.evoUnlocked && GameData.evoUnlocked[cardId] === true);
            const isEvoActivated = check1_hasEvo && check2_inSlot && check3_unlocked;

            slotDiv.className = \`card-item deck-slot \${isEvoSlot ? 'evo-slot' : ''} \${isEvoActivated ? 'evo-activated' : ''}\`;
            slotDiv.style.cursor = 'pointer';
            slotDiv.id = \`deck-slot-\${i}\`;
            
            slotDiv.ondrop = (e) => this.handleDeckDrop(e, i);
            slotDiv.ondragover = (e) => { 
                e.preventDefault(); 
                slotDiv.style.opacity = '0.7';
                slotDiv.classList.add('drop-preview');
            };
            slotDiv.ondragleave = () => {
                slotDiv.style.opacity = '1';
                slotDiv.classList.remove('drop-preview');
            };

            if(cardId && card) {
                totalCost += card.cost;
                const displayEmoji = isEvoActivated ? (CARD_DB[cardId + '_evo']?.emoji || card.emoji) : card.emoji;
                
                slotDiv.innerHTML = \`
                    <div class="elixir">\${card.cost}</div>
                    <span class="emoji">\${displayEmoji}</span>
                    <div style="font-size:0.7rem; margin-top:5px; white-space:nowrap; overflow:hidden; font-weight:900;">\${card.name}</div>
                    \${isEvoActivated ? '<div style="font-size:0.65rem; color:#e056fd; font-weight:900; margin-top:2px;">✨ EVO ACTIVE</div>' : (isEvoSlot ? '<div style="font-size:0.6rem; color:#9b59b6; font-weight:900; margin-top:2px;">EVO Slot</div>' : '')}
                \`;
                slotDiv.draggable = true;
                slotDiv.ondragstart = (e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('fromDeckIndex', i);
                    e.dataTransfer.setData('cardId', cardId);
                };
                slotDiv.onclick = () => {
                    if (this.pendingSwapCard) {
                        activeDeck[i] = this.pendingSwapCard;
                        SaveSystem.save();
                        this.cancelSwap();
                        this.renderCards();
                        this.updateUI();
                    } else {
                        this.openCardModal(cardId, true);
                    }
                };
            } else {
                // Empty slot: purple plus for EVO slots 1-2, regular plus for slots 3-8
                slotDiv.innerHTML = \`<div style="color: \${isEvoSlot ? '#9b59b6' : '#555'}; font-size: 1.8rem; font-weight: 900; opacity: \${isEvoSlot ? '0.9' : '0.5'};">\${isEvoSlot ? '➕' : '+'}</div>\`;
                slotDiv.onclick = () => {
                    if (this.pendingSwapCard) {
                        activeDeck[i] = this.pendingSwapCard;
                        SaveSystem.save();
                        this.cancelSwap();
                        this.renderCards();
                        this.updateUI();
                    }
                };
            }
            deckGrid.appendChild(slotDiv);
        }

        document.getElementById('ui-avg-elixir').innerText = (totalCost / Math.max(1, activeDeck.length)).toFixed(1);

        // Render entire Collection
        if (collGrid) {
            Object.values(CARD_DB).filter(c => !c.isEvo).forEach(card => {
                const isAssigned = this.isCardAssigned(card.id);
                const dom = this.createCardDOM(card, isAssigned, isCasual);

                dom.onclick = () => {
                    if(!this.pendingSwapCard) {
                        if(!isCasual && card.arena > GameData.arena) Toast.show(\`Unlocks in Arena \${card.arena}!\`, 'error');
                        else this.openCardModal(card.id, isAssigned);
                    } else {
                        if(!isCasual && card.arena > GameData.arena) {
                            Toast.show(\`Unlocks in Arena \${card.arena}!\`, 'error');
                        } else {
                            this.openCardModal(card.id, isAssigned);
                        }
                    }
                };
                
                const isUnlocked = isCasual ? true : Progression.isUnlocked(card.id);
                const isArenaLocked = isCasual ? false : card.arena > GameData.arena;
                if(isUnlocked && !isArenaLocked) {
                    dom.draggable = true;
                    dom.ondragstart = (e) => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('fromCollection', 'true');
                        e.dataTransfer.setData('cardId', card.id);
                    };
                }

                collGrid.appendChild(dom);
            });
        }

        this.updateBattleButton();
    },

    handleDeckDrop(e, targetIndex) {
        e.preventDefault();
        e.currentTarget.style.opacity = '1';
        e.currentTarget.classList.remove('drop-preview');

        const activeDeck = this.getActiveDeck();
        const fromDeckIndex = e.dataTransfer.getData('fromDeckIndex');
        const fromCollection = e.dataTransfer.getData('fromCollection');
        const cardId = e.dataTransfer.getData('cardId');
        if (!cardId) return;

        // Card dragged within deck (swap/reorder)
        if(fromDeckIndex !== '') {
            const from = parseInt(fromDeckIndex);
            const to = targetIndex;
            if(from !== to && from >= 0 && to >= 0) {
                const temp = activeDeck[from];
                activeDeck[from] = activeDeck[to];
                activeDeck[to] = temp;
                SaveSystem.save();
                this.renderCards();
                this.updateUI();
            }
            return;
        }

        // Card dragged from collection into deck slot
        if(fromCollection === 'true') {
            const existingIndex = activeDeck.indexOf(cardId);
            if(existingIndex !== -1) {
                // Swap positions if already in deck
                const temp = activeDeck[targetIndex];
                activeDeck[targetIndex] = cardId;
                activeDeck[existingIndex] = temp;
            } else {
                activeDeck[targetIndex] = cardId;
            }
            SaveSystem.save();
            this.renderCards();
            this.updateUI();
        }
    },

    createCardDOM(card, inDeck, isCasual) {
        const div = document.createElement('div');
        const isUnlocked = isCasual ? true : Progression.isUnlocked(card.id);
        const isArenaLocked = isCasual ? false : card.arena > GameData.arena;

        let extraClass = '';
        if(inDeck && this.pendingSwapCard !== null) extraClass = 'selected-slot';

        const showEvoInfo = !isCasual && GameData.arena >= 2;
        // In collection, regular card background (never full purple) unless unlocked info badge
        div.className = \`card-item \${card.type === 'legend' ? 'legendary' : ''} \${(!isUnlocked || isArenaLocked) ? 'locked' : ''} \${extraClass}\`;

        // Add EVO indicator dot for cards with evolutions
        if(card.isEvoBase && showEvoInfo) {
            const evoIndicator = document.createElement('div');
            evoIndicator.className = 'evo-indicator';
            evoIndicator.innerHTML = '●';
            evoIndicator.style.cssText = \`
                position: absolute;
                top: -8px;
                right: -8px;
                color: \${(GameData.evoUnlocked && GameData.evoUnlocked[card.id] === true) ? '#9b59b6' : '#555'};
                font-size: 12px;
                text-shadow: 0 0 3px rgba(0,0,0,0.8);
                z-index: 10;
            \`;
            div.appendChild(evoIndicator);
        }

        let progressHtml = '';
        const level = isCasual ? 15 : (GameData.cardLevels[card.id] || 1);

        if(!isUnlocked) {
            div.innerHTML += \`<div class="lock-icon">🔒</div>\`;
            if(!isArenaLocked) {
                if(card.type === 'legend') {
                    const s = GameData.shards[card.id] || 0;
                    progressHtml = \`<div class="progress-bar"><div class="progress-fill legend-fill" style="width:\${(s/1)*100}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">Legend Shards: \${s}/1</div>\`;
                } else {
                    const copies = GameData.cardCopies[card.id] || 0;
                    const req = Progression.getUpgradeReq(level);
                    const pct = Math.min(100, (copies/req)*100);
                    progressHtml = \`<div class="progress-bar"><div class="progress-fill" style="width:\${pct}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">\${copies}/\${req}</div>\`;
                    div.innerHTML += \`<div class="lvl">Lvl \${level}</div>\`;
                }
            } else {
                progressHtml = \`<div style="font-size:0.7rem; color:#e74c3c; font-weight:bold; text-shadow: 0 1px 0 #000;">Arena \${card.arena}</div>\`;
            }
        } else {
            if(isCasual) {
                progressHtml = \`<div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div><div style="font-size:0.65rem; font-weight:bold; color:#f1c40f;">MAX</div>\`;
                div.innerHTML += \`<div class="lvl">Lvl 15</div>\`;
            } else if(card.type !== 'legend') {
                const copies = GameData.cardCopies[card.id] || 0;
                const req = Progression.getUpgradeReq(level);
                const pct = Math.min(100, (copies/req)*100);
                progressHtml = \`<div class="progress-bar"><div class="progress-fill" style="width:\${pct}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">\${copies}/\${req}</div>\`;
                div.innerHTML += \`<div class="lvl">Lvl \${level}</div>\`;

                if(!inDeck && copies >= req && GameData.gold >= Progression.getUpgradeCost(level)) {
                    div.style.borderColor = '#2ecc71';
                    div.style.boxShadow = '0 4px 0 #27ae60, 0 0 15px rgba(46, 204, 113, 0.4)';
                }
            } else {
                div.innerHTML += \`<div class="lvl">Lvl \${level}</div>\`;
            }
        }

        div.innerHTML += \`
            <div class="elixir">\${card.cost}</div>
            <span class="emoji">\${card.emoji}</span>
            <div style="font-size:0.7rem; margin-top:5px; white-space:nowrap; overflow:hidden; font-weight:900;">\${card.name}</div>
            \${progressHtml}
            \${card.isEvoBase && showEvoInfo ? \`<div style="font-size:0.65rem; font-weight:bold; color:\${(GameData.evoUnlocked && GameData.evoUnlocked[card.id] === true) ? '#9b59b6' : '#f1c40f'}; margin-top:4px;">\${(GameData.evoUnlocked && GameData.evoUnlocked[card.id] === true) ? 'EVO unlocked' : \`EVO \${Progression.getEvoProgress(card.id)}/6\`}</div>\` : ''}
        \`;

        return div;
    },
    
    `;

html = html.substring(0, oldRcSearch) + newRcBlock + html.substring(oldRcEnd);

// ==========================================
// 3. UPDATE BATTLE BUTTON IN UPDATEUI
// ==========================================

const oldUpdateUi = `updateUI() {
        let currentArena = ARENAS.slice().reverse().find(a => GameData.trophies >= a.trophies) || ARENAS[0];
        GameData.arena = currentArena.id;
        document.getElementById("ui-gold").innerText = GameData.gold;
        document.getElementById('ui-gems').innerText = GameData.gems;
        document.getElementById('ui-trophies').innerText = GameData.trophies;
        document.getElementById('ui-trophies-display').innerText = GameData.trophies;
        document.getElementById('ui-arena').innerText = GameData.arena;
        this.renderChests();
    },`;

const newUpdateUi = `updateUI() {
        let currentArena = ARENAS.slice().reverse().find(a => GameData.trophies >= a.trophies) || ARENAS[0];
        GameData.arena = currentArena.id;
        document.getElementById("ui-gold").innerText = GameData.gold;
        document.getElementById('ui-gems').innerText = GameData.gems;
        document.getElementById('ui-trophies').innerText = GameData.trophies;
        document.getElementById('ui-trophies-display').innerText = GameData.trophies;
        document.getElementById('ui-arena').innerText = GameData.arena;
        this.renderChests();
        this.updateBattleButton();
    },
    updateBattleButton() {
        const battleBtn = document.querySelector('.battle-btn');
        if (!battleBtn) return;
        const activeDeck = this.getActiveDeck ? this.getActiveDeck() : (GameData.mode === 'casual' ? GameData.casualDeck : GameData.deck);
        const cardCount = activeDeck.length;

        if (cardCount < 8) {
            battleBtn.classList.add('disabled');
            battleBtn.innerText = \`CARDS NEEDED (\${cardCount}/8)\`;
            battleBtn.disabled = true;
        } else {
            battleBtn.classList.remove('disabled');
            battleBtn.innerText = 'BATTLE';
            battleBtn.disabled = false;
        }
    },`;

html = html.replace(oldUpdateUi, newUpdateUi);

// ==========================================
// 4. IN-GAME EVO CYCLING & CIRCLE PIPS
// ==========================================

// Update canUseEvo in Battle object to strictly enforce all 3 checks:
// 1. card has EVO (isEvoBase)
// 2. card was placed in Slot 1 or 2 (index 0 or 1 of deck)
// 3. player personally owns and unlocked that EVO (GameData.evoUnlocked[id] === true)

const oldBattleCanUseEvo = `canUseEvo(id) {
        if (!id) return false;
        if (GameData.mode === "casual") return true;
        const activeDeck = GameData.deck || [];
        const numEvoSlots = GameData.arena >= 2 ? (GameData.arena >= 6 ? 2 : 1) : 0;
        const isInEvoSlot = activeDeck.slice(0, numEvoSlots).includes(id);
        return isInEvoSlot && !!(GameData.evoUnlocked && GameData.evoUnlocked[id]);
    },`;

const newBattleCanUseEvo = `canUseEvo(id) {
        if (!id) return false;
        const card = CARD_DB[id];
        if (!card || !card.isEvoBase) return false; // Check 1: Card must have an EVO
        if (GameData.mode === "casual") return true;
        const activeDeck = GameData.deck || [];
        const isInEvoSlot = activeDeck.slice(0, 2).includes(id); // Check 2: Must be in EVO slot 1 or 2
        const isUnlocked = !!(GameData.evoUnlocked && GameData.evoUnlocked[id] === true); // Check 3: Must be personally unlocked
        return isInEvoSlot && isUnlocked;
    },`;

html = html.replace(oldBattleCanUseEvo, newBattleCanUseEvo);

// Update BattleUI.renderHand to render circular cycle pips at the bottom of the card:
// When cycles are met (e.g. Knight 2 cycles played):
// Next time card appears in hand, it is in EVO form, background turns glowing purple, and spawns the Shield Knight!
const oldRenderHand = `renderHand() {
        const cont = document.getElementById('battle-hand');
        cont.innerHTML = '';
        Battle.hand.forEach((id, index) => {
            let data = CARD_DB[id];
            const canUseEvo = Battle.canUseEvo(id);
            const isEvoReady = canUseEvo && data.isEvoBase && (Battle.evoCharges[id] || 0) >= data.evoReq;
            if(isEvoReady) data = CARD_DB[id+'_evo'];

            const div = document.createElement('div');
            div.className = \`battle-card \${Battle.selectedHandIndex === index ? 'selected' : ''} \${isEvoReady ? 'evo-active' : ''}\`;
            div.innerHTML = \`<div class="elixir">\${data.cost}</div><div class="emoji">\${data.emoji}</div>\`;
            
            if(canUseEvo && CARD_DB[id].isEvoBase) {
                const charges = Battle.evoCharges[id] || 0;
                const req = CARD_DB[id].evoReq;
                let dotsHTML = '<div class="evo-charges">';
                for(let i=0; i<req; i++) dotsHTML += \`<div class="evo-drop \${i<charges ? 'filled' : ''}"></div>\`;
                dotsHTML += '</div>';
                div.innerHTML += dotsHTML;
            }

            div.onclick = () => {
                if(Battle.playerElixir >= data.cost) {
                    Battle.selectedHandIndex = Battle.selectedHandIndex === index ? -1 : index;
                    this.renderHand();
                }
            };
            cont.appendChild(div);
        });

        const nData = CARD_DB[Battle.nextCard];
        document.getElementById('next-card').querySelector('.emoji').innerText = nData.emoji;
    },`;

const newRenderHand = `renderHand() {
        const cont = document.getElementById('battle-hand');
        cont.innerHTML = '';
        Battle.hand.forEach((id, index) => {
            let data = CARD_DB[id];
            const canUseEvo = Battle.canUseEvo(id);
            const reqCycles = (data && data.evoReq) || 2;
            const currentCycles = Battle.evoCharges[id] || 0;
            const isEvoReady = canUseEvo && data.isEvoBase && currentCycles >= reqCycles;
            
            if(isEvoReady) {
                data = CARD_DB[id + '_evo'] || data;
            }

            const div = document.createElement('div');
            div.className = \`battle-card \${Battle.selectedHandIndex === index ? 'selected' : ''} \${isEvoReady ? 'evo-active' : ''}\`;
            div.innerHTML = \`<div class="elixir">\${data.cost}</div><div class="emoji">\${data.emoji}</div>\`;
            
            // Render circle cycle pips on the bottom of the card
            if(canUseEvo && CARD_DB[id].isEvoBase) {
                let cyclePipsHTML = '<div class="evo-cycle-container">';
                for(let i = 0; i < reqCycles; i++) {
                    const isFilled = i < currentCycles;
                    cyclePipsHTML += \`<div class="evo-cycle-circle \${isFilled ? 'filled' : ''}"><div class="evo-cycle-inner"></div></div>\`;
                }
                cyclePipsHTML += '</div>';
                div.innerHTML += cyclePipsHTML;
            }

            div.onclick = () => {
                if(Battle.playerElixir >= data.cost) {
                    Battle.selectedHandIndex = Battle.selectedHandIndex === index ? -1 : index;
                    this.renderHand();
                }
            };
            cont.appendChild(div);
        });

        const nData = CARD_DB[Battle.nextCard];
        if (nData) {
            const nextElem = document.getElementById('next-card');
            if (nextElem) nextElem.querySelector('.emoji').innerText = nData.emoji;
        }
    },`;

html = html.replace(oldRenderHand, newRenderHand);

// Update Battle.playCard to handle the cycle progression:
// When an EVO card is played:
// If isEvoReady -> spawns EVO unit, resets evoCharges[cardId] = 0.
// If normal form -> spawns normal unit, increments evoCharges[cardId] += 1.
const oldPlayCardEvo = `        if(!this.isPreview && team === 0 && data.isEvoBase) {
            const charge = this.evoCharges[cardId] || 0;
            const evoCard = CARD_DB[cardId + '_evo'];
            if(charge >= data.evoReq && evoCard) {
                // Check any cycle requirement for EVO before spawning
                
                data = evoCard;
                this.evoCharges[cardId] = 0;
            } else {
                this.evoCharges[cardId] = charge + 1;
            }
        }`;

const newPlayCardEvo = `        if(!this.isPreview && team === 0 && data.isEvoBase && this.canUseEvo(cardId)) {
            const charge = this.evoCharges[cardId] || 0;
            const req = data.evoReq || 2;
            const evoCard = CARD_DB[cardId + '_evo'];
            if(charge >= req && evoCard) {
                // EVO Ready: Spawn the EVO card and reset cycle back to 0
                data = evoCard;
                this.evoCharges[cardId] = 0;
            } else {
                // Normal Form played: Advance cycle counter
                this.evoCharges[cardId] = charge + 1;
            }
        }`;

html = html.replace(oldPlayCardEvo, newPlayCardEvo);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully implemented all requirements: 2 EVO slots in top left, 3-check EVO validation, cycle circles in battle with purple fill, and gray battle button when cards < 8!');
