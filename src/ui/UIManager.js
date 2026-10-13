// ================= 3. MENU & META LOGIC =================
const MenuLogic = {
    pendingSwapCard: null, // Card ID waiting to be placed in deck
    selectedEmoteSlot: 0,
    
    init() {
        SaveSystem.load();
        if(GameData.shop.items.length === 0) Progression.generateShop();
        this.setMode(GameData.mode || 'trophy_road');
        this.updateUI();
    },
    setMode(mode) {
        GameData.mode = mode;
        const trophyBtn = document.getElementById('mode-btn-trophy');
        const casualBtn = document.getElementById('mode-btn-casual');
        if (trophyBtn) trophyBtn.classList.toggle('active', mode === 'trophy_road');
        if (casualBtn) casualBtn.classList.toggle('active', mode === 'casual');
        SaveSystem.save();
        
        const isCardsTab = document.getElementById('tab-cards') && document.getElementById('tab-cards').style.display === 'block';
        if (isCardsTab) {
            const isTowersSubtab = document.getElementById('subtab-view-towers') && document.getElementById('subtab-view-towers').style.display === 'block';
            if (isTowersSubtab && this.renderTowers) {
                this.renderTowers();
            } else {
                this.renderCards();
            }
        }
        if (this.updateBattleButton) this.updateBattleButton();
    },

    getTowerLoadout() {
        const isCasual = GameData && GameData.mode === 'casual';
        if (!GameData.towerLoadout) {
            GameData.towerLoadout = { leftPrincess: 'princess', king: 'king_tower', rightPrincess: 'princess' };
        }
        if (!GameData.casualTowerLoadout) {
            GameData.casualTowerLoadout = { ...GameData.towerLoadout };
        }
        if (isCasual) {
            return GameData.casualTowerLoadout;
        }
        const loadout = GameData.towerLoadout;
        if (typeof Progression !== 'undefined' && Progression.isTowerUnlocked) {
            if (!Progression.isTowerUnlocked(loadout.leftPrincess)) loadout.leftPrincess = 'princess';
            if (!Progression.isTowerUnlocked(loadout.rightPrincess)) loadout.rightPrincess = 'princess';
            if (!Progression.isTowerUnlocked(loadout.king)) loadout.king = 'king_tower';
        }
        return loadout;
    },

    getActiveDeck() {
        return GameData.mode === 'casual' ? GameData.casualDeck : GameData.deck;
    },

    getCombinedDeck() {
        const activeDeck = this.getActiveDeck();
        if (GameData.mode === 'casual') {
            return [...activeDeck];
        }

        return [
            ...GameData.evoSlots.filter((slot) => slot !== null),
            ...(GameData.legendSlot ? [GameData.legendSlot] : []),
            ...activeDeck
        ];
    },

    isCardAssigned(cardId) {
        if (this.getActiveDeck().includes(cardId)) return true;
        if (GameData.mode !== 'casual' && GameData.evoSlots.includes(cardId)) return true;
        return GameData.mode !== 'casual' && GameData.legendSlot === cardId;
    },

    selectEmoteSlot(index) {
        this.selectedEmoteSlot = index;
        this.renderItems();
    },

    clearEquippedEmote(index) {
        GameData.equipSlots[index] = null;
        this.selectedEmoteSlot = index;
        SaveSystem.save();
        this.renderItems();
    },

    equipEmote(emote) {
        if (!GameData.unlockedEmotes.includes(emote)) return;

        const equippedIndex = GameData.equipSlots.indexOf(emote);
        const targetSlot = Number.isInteger(this.selectedEmoteSlot) ? this.selectedEmoteSlot : 0;

        if (equippedIndex !== -1 && equippedIndex !== targetSlot) {
            Toast.show('That emote is already equipped.', 'error');
            return;
        }

        GameData.equipSlots[targetSlot] = emote;
        SaveSystem.save();
        this.renderItems();
    },
    
    openTrophyRoad() {
        const list = document.getElementById("trophy-road-list");
        list.innerHTML = '<div id="trophy-road-inner" class="tr-inner"></div>';
        const inner = document.getElementById("trophy-road-inner");

        const curTrophies = GameData.trophies || 0;

        // Solid continuous black bar running between all trophy amounts from 50 to 2700
        const rail = document.createElement("div");
        rail.className = "tr-rail-track";
        inner.appendChild(rail);

        // Yellow progress fill inside track
        let fill = null;
        if (curTrophies > 0) {
            fill = document.createElement("div");
            fill.className = "tr-rail-fill";
            fill.style.height = "0%";
            rail.appendChild(fill);
        }

        // Render milestones (50 at bottom, 2700 at top)
        const milestoneElements = [];
        TROPHY_REWARDS.forEach((reward, idx) => {
            const isUnlocked = curTrophies >= reward.trophies;
            const isClaimed = (GameData.claimedTrophyRewards || []).includes(idx);
            
            const div = document.createElement("div");
            div.className = "tr-milestone " + (!isUnlocked ? "tr-locked" : "");
            
            let blockHtml = "";
            
            if (reward.type === "arena") {
                const arena = ARENAS.find(a => a.id === reward.arenaId);
                const unlockedCards = Object.values(CARD_DB).filter(c => c.arena === arena.id).map(c => '<div class="tr-card-mini" title="' + c.name + '">' + c.emoji + '</div>').join("");
                
                blockHtml = '<div class="tr-arena-block"><div class="tr-arena-title">' + (arena ? arena.name : "New Arena") + '</div><div style="font-size:0.9rem; color:#fff; font-weight:bold; margin-bottom:10px;">✨ New Cards Unlock! ✨</div><div class="tr-card-unlocks">' + unlockedCards + '</div></div>';
            } else {
                const isGrass = reward.trophies < 300;
                const isStone = reward.trophies >= 300 && reward.trophies < 900;
                const blockClass = isGrass ? "" : (isStone ? "stone" : "lava");
                
                let btnHtml = "";
                if (isClaimed) {
                    btnHtml = '<div class="tr-claimed-icon">✔️</div>';
                } else if (isUnlocked) {
                    btnHtml = '<button class="tr-btn" onclick="MenuLogic.claimTrophyReward(' + idx + ')">Collect</button>';
                } else {
                    btnHtml = '<div style="color:#aaa; font-weight:900; font-size: 1.1rem; text-shadow: 0 1px 0 #000;">🔒 Locked</div>';
                }
                
                let rewardText = reward.amount;
                if (reward.type === "chest") rewardText = reward.amount.charAt(0).toUpperCase() + reward.amount.slice(1) + " Chest";

                blockHtml = '<div class="tr-block ' + blockClass + '">' + (isClaimed ? "" : btnHtml) + '<div class="tr-reward-icon">' + reward.emoji + '</div><div style="font-weight:900; font-size:1.3rem; margin-bottom:10px; text-shadow:0 1px 0 #000; color: white;">' + rewardText + '</div></div>';
            }
            
            div.innerHTML = '<div class="tr-trophies">' + reward.trophies + '</div>' + blockHtml;
            inner.appendChild(div);
            milestoneElements.push(div);
        });

        // Add top-layer Player Pin Overlay on inner container
        let pin = null;
        if (curTrophies > 0) {
            pin = document.createElement("div");
            pin.className = "tr-player-pin-overlay";
            pin.innerHTML = '<span>🏆</span><span>' + curTrophies + '</span>';
            inner.appendChild(pin);
        }
        
        const modal = document.getElementById("trophy-road-modal");
        modal.classList.add("active");

        // Calculate exact pixel position for pin & yellow bar
        setTimeout(() => {
            if (curTrophies > 0 && milestoneElements.length > 0) {
                const innerRect = inner.getBoundingClientRect();
                const m0Rect = milestoneElements[0].getBoundingClientRect();
                const bottomY = innerRect.bottom - 120; // rail track bottom
                const m0CenterY = (m0Rect.top + m0Rect.bottom) / 2;
                const m0DistFromBottom = innerRect.bottom - m0CenterY;

                let targetBottomPx = 120;
                
                if (curTrophies < 50) {
                    // Strictly BELOW 50 milestone badge
                    // Maps 0 -> 50 between track bottom (120px) and just below 50 pill (m0DistFromBottom - 25px)
                    const availableSpace = Math.max(20, m0DistFromBottom - 145);
                    targetBottomPx = 120 + (curTrophies / 50) * availableSpace;
                } else {
                    let passedIdx = 0;
                    for (let i = 0; i < TROPHY_REWARDS.length; i++) {
                        if (curTrophies >= TROPHY_REWARDS[i].trophies) passedIdx = i;
                    }
                    if (passedIdx >= TROPHY_REWARDS.length - 1) {
                        const topRect = milestoneElements[milestoneElements.length - 1].getBoundingClientRect();
                        targetBottomPx = innerRect.bottom - ((topRect.top + topRect.bottom) / 2);
                    } else {
                        const curRect = milestoneElements[passedIdx].getBoundingClientRect();
                        const nextRect = milestoneElements[passedIdx + 1].getBoundingClientRect();
                        const curY = innerRect.bottom - ((curRect.top + curRect.bottom) / 2);
                        const nextY = innerRect.bottom - ((nextRect.top + nextRect.bottom) / 2);
                        const progress = (curTrophies - TROPHY_REWARDS[passedIdx].trophies) / (TROPHY_REWARDS[passedIdx + 1].trophies - TROPHY_REWARDS[passedIdx].trophies);
                        targetBottomPx = curY + progress * (nextY - curY);
                    }
                }

                if (pin) pin.style.bottom = targetBottomPx + "px";
                
                const trackHeight = rail.offsetHeight || (inner.offsetHeight - 160);
                if (fill && trackHeight > 0) {
                    const fillHeightPct = Math.min(100, Math.max(2, ((targetBottomPx - 120) / trackHeight) * 100));
                    fill.style.height = fillHeightPct + "%";
                }
            }

            list.scrollTop = list.scrollHeight;
        }, 30);
    },
    
    claimTrophyReward(index) {
        const reward = TROPHY_REWARDS[index];
        if (GameData.trophies < reward.trophies || GameData.claimedTrophyRewards.includes(index)) return;
        
        GameData.claimedTrophyRewards.push(index);
        
        let itemsHtml = '';
        let delay = 0;

        const addDisplayItem = (emoji, amt, name) => {
            itemsHtml += `
                <div class="reward-item" style="animation-delay: ${delay}s;">
                    <span style="font-size: 2.5rem;">${emoji}</span>
                    <span>x${amt} ${name}</span>
                </div>`;
            delay += 0.3;
        };

        if (reward.type === 'gold' || reward.type === 'gems') {
            Progression.grantReward(reward.type, reward.amount, null);
            addDisplayItem(reward.emoji, reward.amount, reward.type.toUpperCase());
        } else if (reward.type === 'chest') {
            const goldVal = reward.amount === 'gold' ? 200 : 50;
            Progression.grantReward('gold', goldVal);
            addDisplayItem('💰', goldVal, 'Gold');
            
            const cardPulls = reward.amount === 'gold' ? 4 : 2;
            const availableCards = Object.values(CARD_DB).filter(c => c.arena <= GameData.arena && !c.isEvoBase && !c.isEvo && c.type !== 'legend').map(c=>c.id);
            for(let i=0; i<cardPulls; i++) {
                const cId = availableCards[Math.floor(Math.random()*availableCards.length)];
                const amt = reward.amount === 'gold' ? 8 : 3;
                Progression.grantReward('cards', amt, cId);
                addDisplayItem(CARD_DB[cId].emoji, amt, CARD_DB[cId].name);
            }
        }
        
        document.getElementById('reward-title').innerText = "Reward Collected!";
        document.getElementById('reward-content').innerHTML = itemsHtml;
        document.getElementById('reward-modal').classList.add('active');

        SaveSystem.save();
        this.updateUI();
        this.openTrophyRoad(); // Re-render to show collected state
    },

    closeTrophyRoad() { document.getElementById("trophy-road-modal").classList.remove("active"); },
    
    switchTab(tab, element) {
        if (typeof SoundManager !== "undefined") SoundManager.play("tab");
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".menu-content").forEach(c => c.style.display = "none");
        
        let targetBtn = element;
        if (!targetBtn && typeof event !== "undefined" && event && event.currentTarget) {
            targetBtn = event.currentTarget;
        }
        if (!targetBtn) {
            targetBtn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
        }
        if (targetBtn) targetBtn.classList.add("active");
        
        const targetTab = document.getElementById(`tab-${tab}`);
        if (targetTab) targetTab.style.display = "block";
        if(tab === "cards") this.renderCards();
        if(tab === "shop") this.renderShop();
        if(tab === "season-pass") this.renderSeasonPass();
        if(tab === "quests") this.renderQuests();
        if(tab === "items") this.renderItems();
    },
    updateUI() {
        let currentArena = ARENAS.slice().reverse().find(a => GameData.trophies >= a.trophies) || ARENAS[0];
        GameData.arena = currentArena.id;
        document.getElementById("ui-gold").innerText = GameData.gold;
        document.getElementById('ui-gems').innerText = GameData.gems;
        document.getElementById('ui-trophies').innerText = GameData.trophies;
        document.getElementById('ui-trophies-display').innerText = GameData.trophies;
        document.getElementById('ui-arena').innerText = GameData.arena;
        this.renderChests();
    },
    renderChests() {
        const cont = document.getElementById('chest-slots');
        cont.innerHTML = '';
        for(let i=0; i<4; i++) {
            const slot = document.createElement('div');
            slot.style.flex = '1'; slot.style.height = '80px'; slot.style.background = 'rgba(0,0,0,0.4)';
            slot.style.border = '2px dashed #555'; slot.style.borderRadius = '10px';
            slot.style.display = 'flex'; slot.style.alignItems = 'center'; slot.style.justifyContent = 'center';
            slot.style.cursor = 'pointer'; slot.style.position = 'relative';
            
            if(GameData.chests[i]) {
                const isGold = GameData.chests[i] === 'gold';
                slot.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size:2.2rem; filter: drop-shadow(0 2px 4px #000);">${isGold ? '🎁' : '🎁'}</div>
                        <div style="font-size:0.68rem; color:#f1c40f; margin-top:2px; font-weight:900; letter-spacing:0.5px;">TAP TO OPEN</div>
                    </div>
                `;
                slot.style.borderStyle = 'solid';
                slot.style.borderColor = isGold ? '#f1c40f' : '#bdc3c7';
                slot.style.boxShadow = isGold ? '0 3px 0 #d4ac0d' : '0 3px 0 #7f8c8d';
                slot.onclick = () => ChestSystem.showChestAnimation(i);
            } else {
                slot.innerHTML = '<span style="color:#555; font-weight: bold; font-size: 0.85rem;">Empty</span>';
            }
            cont.appendChild(slot);
        }
    },
    openChest(index) {
        const tier = GameData.chests[index];
        if(!tier) return;
        ChestSystem.showChestAnimation(index);
    },
    
    openChestWithRarity(index, starLevel) {
        const tier = GameData.chests[index];
        if(!tier) return;
        GameData.chests[index] = null;
        GameData.chestRarities[index] = 0; // Reset rarity
        
        // Apply rarity multiplier (1-5 stars = 1.0x to 2.5x rewards)
        const rarityMultiplier = 1 + (starLevel * 0.3); // 1.0, 1.3, 1.6, 1.9, 2.2, 2.5
        
        let itemsHtml = '';
        let delay = 0;

        const addDisplayItem = (emoji, amt, name) => {
            itemsHtml += `
                <div class="reward-item" style="animation-delay: ${delay}s;">
                    <span style="font-size: 2.5rem;">${emoji}</span>
                    <span>x${amt} ${name}</span>
                </div>`;
            delay += 0.3;
        };

        const baseGold = tier === 'gold' ? 150 + Math.floor(Math.random()*100) : 50 + Math.floor(Math.random()*50);
        const goldVal = Math.floor(baseGold * rarityMultiplier);
        Progression.grantReward('gold', goldVal);
        addDisplayItem('💰', goldVal, 'Gold');

        const cardPulls = tier === 'gold' ? 3 : 1;
        const availableCards = Object.values(CARD_DB).filter(c => c.arena <= GameData.arena && !c.isEvo && c.type !== 'legend' && !c.isEvoBase).map(c=>c.id);
        
        for(let i=0; i<cardPulls; i++) {
            const cId = availableCards[Math.floor(Math.random()*availableCards.length)];
            const baseAmt = tier === 'gold' ? 5 + Math.floor(Math.random()*10) : 1 + Math.floor(Math.random()*5);
            const cardAmt = Math.floor(baseAmt * rarityMultiplier);
            Progression.grantReward('cards', cardAmt, cId);
            addDisplayItem(CARD_DB[cId].emoji, cardAmt, CARD_DB[cId].name);
        }

        // Chance to pull Tower Cards
        if (typeof TOWER_DB !== 'undefined' && Math.random() < 0.45) {
            const unlockedTowers = Object.values(TOWER_DB).filter(t => t.arena <= GameData.arena);
            if (unlockedTowers.length > 0) {
                const randomTower = unlockedTowers[Math.floor(Math.random() * unlockedTowers.length)];
                const towerCards = Math.max(1, Math.floor((tier === 'gold' ? 2 : 1) * rarityMultiplier));
                GameData.towerCopies[randomTower.id] = (GameData.towerCopies[randomTower.id] || 0) + towerCards;
                addDisplayItem(randomTower.emoji, towerCards, `${randomTower.name} (Tower)`);
            }
        }

        // Bonus shards at higher star levels
        if(starLevel >= 3 && GameData.arena >= 2 && Math.random() < 0.4) {
            Progression.grantReward('evo_shard', 2);
            addDisplayItem('EV', 2, 'EVO Shards');
        }
        if(starLevel >= 4 && GameData.arena >= 10 && Math.random() < 0.2) {
            Progression.grantReward('legend_shard', 1);
            addDisplayItem('LG', 1, 'Legend Shard');
        }

        // Wildcard drops for higher rarity chests
        const wildcardRarityChances = {
            1: ['common'],
            2: ['common', 'rare'],
            3: ['common', 'rare', 'epic'],
            4: ['rare', 'epic'],
            5: ['epic', 'legendary']
        };
        const availableRarities = wildcardRarityChances[starLevel] || ['common'];
        if(Math.random() < 0.35) {
            const rarity = availableRarities[Math.floor(Math.random() * availableRarities.length)];
            Progression.grantReward('wildcard', 1, rarity);
            const rarityEmoji = rarity === 'common' ? '⬜' : rarity === 'rare' ? '🔷' : rarity === 'epic' ? '🔶' : '🔸';
            addDisplayItem(rarityEmoji, 1, `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Wildcard`);
        }

        const rarityTierMap = {
            1: { name: 'Common', color: '#bdc3c7' },
            2: { name: 'Uncommon', color: '#2ecc71' },
            3: { name: 'Rare', color: '#3498db' },
            4: { name: 'Epic', color: '#9b59b6' },
            5: { name: 'Legendary', color: '#f1c40f' }
        };
        const tierInfo = rarityTierMap[starLevel] || { name: 'Common', color: '#bdc3c7' };
        const rewardTitleEl = document.getElementById('reward-title');
        if (rewardTitleEl) {
            rewardTitleEl.innerText = `${tierInfo.name} Gift Opened!`;
            rewardTitleEl.style.color = tierInfo.color;
            rewardTitleEl.style.textShadow = `0 0 15px ${tierInfo.color}80, 0 3px 0 #000`;
        }
        document.getElementById('reward-content').innerHTML = itemsHtml;
        document.getElementById('reward-modal').classList.add('active');

        SaveSystem.save();
        this.updateUI();
    },
    // --- Card Details Modal Logic ---
    initiateSwap(id) {
        this.closeCardModal();
        let deckArray = GameData.mode === 'casual' ? GameData.casualDeck : GameData.deck;
        if(CARD_DB[id].type === 'legend') {
            const hasLegend = deckArray.some(d => CARD_DB[d].type === 'legend');
            if(hasLegend) { Toast.show("Only 1 Legend allowed per deck! Remove the other one first.", 'error'); return; }
        }
        this.pendingSwapCard = id;
        document.getElementById('deck-swap-banner').style.display = 'flex';
        document.getElementById('deck-panel').classList.add('deck-swap-active');
    },
    cancelSwap() {
        this.pendingSwapCard = null;
        document.getElementById('deck-swap-banner').style.display = 'none';
        document.getElementById('deck-panel').classList.remove('deck-swap-active');
    },
    handleDeckClick(index) {
        let deckArray = GameData.mode === 'casual' ? GameData.casualDeck : GameData.deck;
        if(this.pendingSwapCard) {
            deckArray[index] = this.pendingSwapCard;
            SaveSystem.save();
            this.cancelSwap();
            this.renderCards();
        } else {
            this.openCardModal(deckArray[index], true);
        }
    },
    collectionSort: 'arena', // 'arena', 'elixir_asc', 'elixir_desc', 'rarity'
    hideLocked: false,

    setCollectionSort(val) {
        this.collectionSort = val || 'arena';
        this.renderCards();
    },

    toggleHideLocked() {
        this.hideLocked = !this.hideLocked;
        const btn = document.getElementById('ui-toggle-hide-locked');
        if (btn) {
            if (this.hideLocked) {
                btn.style.background = '#27ae60';
                btn.style.boxShadow = '0 3px 0 #219653';
                btn.innerText = '👁️ Show All';
            } else {
                btn.style.background = '#e67e22';
                btn.style.boxShadow = '0 3px 0 #d35400';
                btn.innerText = '👁️ Hide Locked';
            }
        }
        this.renderCards();
    },

    renderCards() {
        const deckGrid = document.getElementById('ui-deck-grid');
        const collGrid = document.getElementById('ui-collection-grid');
        const deckInfo = document.getElementById('deck-info');
        deckGrid.innerHTML = ''; 
        if (collGrid) collGrid.innerHTML = '';

        const isCasual = GameData.mode === 'casual';
        const activeDeck = this.getActiveDeck();
        const numEvoSlots = 2;

        deckInfo.innerHTML = '<span style="color:#aaa; font-size:0.82rem;">Average Elixir: <b id="ui-avg-elixir" style="color:#e056fd;">3.0</b></span>';

        let totalCost = 0;

        // Render all 8 Deck Slots (Slots 0 and 1 are designated EVO Slots with purple outline)
        for (let i = 0; i < 8; i++) {
            const cardId = activeDeck[i] || null;
            const evoFeatureUnlocked = isCasual || (GameData.arena >= 2 || (GameData.trophies || 0) >= 300);
            const isEvoSlot = (i < numEvoSlots) && evoFeatureUnlocked;
            const slotDiv = document.createElement('div');

            const card = cardId ? CARD_DB[cardId] : null;

            // Strict EVO Activation:
            // 1: Card has an Evolution (card.isEvoBase)
            // 2: Player has unlocked the Evolution (GameData.evoUnlocked[cardId] === true)
            // 3: Arena 2+ reached or Casual mode (evoFeatureUnlocked)
            // 4: Card is placed in an EVO Slot (isEvoSlot === true)
            const isCardEvoUnlocked = !!(isCasual || (GameData.evoUnlocked && GameData.evoUnlocked[cardId] === true));
            const isEvoActivated = isEvoSlot && card && card.isEvoBase && isCardEvoUnlocked;

            slotDiv.className = 'card-item deck-slot' +
                (isEvoActivated ? ' evo-activated' : (isEvoSlot ? ' evo-slot' : '')) +
                (this.pendingSwapCard && this.pendingSwapCard === cardId ? ' drop-preview' : '');
            slotDiv.id = `deck-slot-${i}`;

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

            if (cardId && card) {
                totalCost += card.cost;
                const displayEmoji = isEvoActivated ? (CARD_DB[cardId + '_evo']?.emoji || card.emoji) : card.emoji;

                slotDiv.innerHTML = `
                    <div class="elixir">${card.cost}</div>
                    <span class="emoji">${displayEmoji}</span>
                    <div style="font-size:0.7rem; margin-top:5px; white-space:nowrap; overflow:hidden; font-weight:900;">${card.name}</div>
                `;
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
                        this.openCardModal(cardId);
                    }
                };
            } else {
                // Empty slot: purple plus for EVO slots 1-2 when unlocked, regular plus otherwise
                slotDiv.innerHTML = `<div style="color: ${isEvoSlot ? '#9b59b6' : '#555'}; font-size: 1.8rem; font-weight: 900; opacity: ${isEvoSlot ? '0.85' : '0.5'};">${isEvoSlot ? '➕' : '+'}</div>`;
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

        // Render entire Collection with sorting and filtering
        if (collGrid) {
            collGrid.innerHTML = '';
            const rarityOrder = { 'common': 1, 'rare': 2, 'epic': 3, 'legend': 4 };

            let cards = Object.values(CARD_DB).filter(c => !c.isEvo);

            // Filter out locked cards if hideLocked is enabled
            if (this.hideLocked && !isCasual) {
                cards = cards.filter(card => {
                    const isUnlocked = Progression.isUnlocked(card.id);
                    const isArenaLocked = card.arena > GameData.arena;
                    return isUnlocked && !isArenaLocked;
                });
            }

            // Sort cards according to user preference
            cards.sort((a, b) => {
                if (this.collectionSort === 'elixir_asc') {
                    if (a.cost !== b.cost) return a.cost - b.cost;
                    return (a.arena || 1) - (b.arena || 1);
                } else if (this.collectionSort === 'elixir_desc') {
                    if (a.cost !== b.cost) return b.cost - a.cost;
                    return (a.arena || 1) - (b.arena || 1);
                } else if (this.collectionSort === 'rarity') {
                    const rA = rarityOrder[a.rarity] || 1;
                    const rB = rarityOrder[b.rarity] || 1;
                    if (rA !== rB) return rA - rB;
                    return (a.arena || 1) - (b.arena || 1);
                } else {
                    // Default: Arena unlock order
                    if ((a.arena || 1) !== (b.arena || 1)) return (a.arena || 1) - (b.arena || 1);
                    return a.cost - b.cost;
                }
            });

            if (cards.length === 0) {
                collGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 25px; color:#aaa; font-weight:bold;">No cards matching filter</div>';
            } else {
                cards.forEach(card => {
                    const isAssigned = this.isCardAssigned(card.id);
                    const dom = this.createCardDOM(card, isAssigned, isCasual);

                    dom.onclick = () => {
                        if (!this.pendingSwapCard) {
                            if (!isCasual && card.arena > GameData.arena) Toast.show(`Unlocks in Arena ${card.arena}!`, 'error');
                            else this.openCardModal(card.id, isAssigned);
                        }
                    };

                    const isUnlocked = isCasual ? true : Progression.isUnlocked(card.id);
                    const isArenaLocked = isCasual ? false : card.arena > GameData.arena;
                    if (isUnlocked && !isArenaLocked) {
                        dom.draggable = true;
                        dom.ondragstart = (e) => {
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData('cardId', card.id);
                            e.dataTransfer.setData('fromCollection', 'true');
                        };
                    }

                    collGrid.appendChild(dom);
                });
            }
        }

        this.updateBattleButton();
    },

    handleDeckDrop(e, targetIndex) {
        e.preventDefault();
        e.currentTarget.style.opacity = '1';
        e.currentTarget.classList.remove('drop-preview');

        const isCasual = GameData.mode === 'casual';
        const activeDeck = this.getActiveDeck();
        const fromEvoSlot = e.dataTransfer.getData('fromEvoSlot');
        const fromLegendSlot = e.dataTransfer.getData('fromLegendSlot');
        const fromDeckIndex = e.dataTransfer.getData('fromDeckIndex');
        const fromCollection = e.dataTransfer.getData('fromCollection');
        const cardId = e.dataTransfer.getData('cardId');
        const card = CARD_DB[cardId];

        // Calculate current slotIndex (number of special slots)
        const hasEvoArena = GameData.arena >= 2;
        const hasLegendArena = GameData.arena >= 10;
        let currentSlotIndex = 0;
        if(!isCasual && hasEvoArena) currentSlotIndex += 2; // EVO slots
        if(!isCasual && hasLegendArena) currentSlotIndex += 1; // Legend slot

        // Legend slot handling
        if(targetIndex === -3) { // Legend slot
            if(card.type === 'legend') {
                GameData.legendSlot = cardId;
                // Remove from deck if it was there
                const deckIndex = activeDeck.indexOf(cardId);
                if(deckIndex !== -1) activeDeck.splice(deckIndex, 1);
                SaveSystem.save();
                this.renderCards();
            } else {
                Toast.show('Only Legend cards can go in the Legend slot!', 'error');
            }
            return;
        }

        // EVO slot to EVO slot swap
        if(fromEvoSlot !== '' && targetIndex < -1 && targetIndex > -3) {
            const fromSlot = parseInt(fromEvoSlot);
            const toSlot = Math.abs(targetIndex) - 1;
            [GameData.evoSlots[fromSlot], GameData.evoSlots[toSlot]] = [GameData.evoSlots[toSlot], GameData.evoSlots[fromSlot]];
            SaveSystem.save();
            this.renderCards();
            return;
        }

        // EVO slot to deck (not allowed)
        if(fromEvoSlot !== '' && targetIndex >= 0) {
            Toast.show('Cannot move EVOs to regular deck slots', 'error');
            return;
        }

        // Legend slot to deck
        if(fromLegendSlot !== '' && targetIndex >= 0) {
            const totalCards = activeDeck.length + (GameData.evoSlots.filter(slot => slot !== null).length) + (GameData.legendSlot ? 1 : 0);
            if(totalCards >= 8) {
                Toast.show('Deck is full! Remove a card first.', 'error');
                return;
            }
            const insertIndex = targetIndex - currentSlotIndex;
            activeDeck.splice(insertIndex, 0, cardId);
            GameData.legendSlot = null;
            SaveSystem.save();
            this.renderCards();
            return;
        }

        // Regular deck card reorder
        if(fromDeckIndex !== '' && targetIndex >= 0) {
            const from = parseInt(fromDeckIndex);
            const to = targetIndex;
            if(from !== to) {
                // Handle reordering within deck
                if(from >= currentSlotIndex && to >= currentSlotIndex) {
                    // Both positions are in regular deck
                    const fromPos = from - currentSlotIndex;
                    const toPos = to - currentSlotIndex;
                    const [movedCard] = activeDeck.splice(fromPos, 1);
                    activeDeck.splice(toPos, 0, movedCard);
                }
            }
            SaveSystem.save();
            this.renderCards();
        }

        // Collection to deck
        if(fromCollection === 'true' && targetIndex >= 0) {
            // Prevent duplicate cards from being added
            if(this.isCardAssigned(cardId)) {
                Toast.show('That card is already assigned.', 'error');
                return;
            }
            const totalCards = activeDeck.length + (GameData.evoSlots.filter(slot => slot !== null).length) + (GameData.legendSlot ? 1 : 0);
            if(totalCards >= 8) {
                Toast.show('Deck is full! Remove a card first.', 'error');
                return;
            }
            const insertIndex = targetIndex - currentSlotIndex;
            activeDeck.splice(insertIndex, 0, cardId);
            SaveSystem.save();
            this.renderCards();
        }
    },

    handleEvoSlotDrop(e, slotIndex) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#9b59b6';
        const dragType = e.dataTransfer.getData('type');
        const cardId = e.dataTransfer.getData('cardId');
        const activeDeck = this.getActiveDeck();
        
        if(dragType === 'evo' && cardId && GameData.evoUnlocked[cardId]) {
            if(GameData.evoSlots.includes(cardId) && GameData.evoSlots[slotIndex] !== cardId) {
                Toast.show('That EVO is already in a slot.', 'error');
                return;
            }

            const deckIndex = activeDeck.indexOf(cardId);
            if(deckIndex !== -1) activeDeck.splice(deckIndex, 1);

            GameData.evoSlots = GameData.evoSlots.map((slot, index) => {
                if(index === slotIndex) return cardId;
                return slot === cardId ? null : slot;
            });
            SaveSystem.save();
            this.renderCards();
        }
    },
    
    createCardDOM(card, inDeck, isCasual) {
        const div = document.createElement('div');
        const isUnlocked = isCasual ? true : Progression.isUnlocked(card.id);
        const isArenaLocked = isCasual ? false : card.arena > GameData.arena;

        let extraClass = '';
        if(inDeck && this.pendingSwapCard !== null) extraClass = 'selected-slot';

        const showEvoInfo = !isCasual && GameData.arena >= 2;
        div.className = `card-item ${card.type === 'legend' ? 'legendary' : ''} ${showEvoInfo && card.isEvoBase ? 'evo' : ''} ${(!isUnlocked || isArenaLocked) ? 'locked' : ''} ${extraClass}`;

        // Add EVO indicator for cards with available evolutions
        if(card.isEvoBase && showEvoInfo) {
            const evoIndicator = document.createElement('div');
            evoIndicator.className = 'evo-indicator';
            evoIndicator.innerHTML = '●';
            evoIndicator.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                color: ${GameData.evoUnlocked[card.id] ? '#9b59b6' : '#555'};
                font-size: 12px;
                text-shadow: 0 0 3px rgba(0,0,0,0.8);
                z-index: 10;
            `;
            div.appendChild(evoIndicator);
        }

        let progressHtml = '';
        const level = isCasual ? 15 : (GameData.cardLevels[card.id] || 1);

        if(!isUnlocked) {
            div.innerHTML += `<div class="lock-icon">🔒</div>`;
            if(!isArenaLocked) {
                if(card.type === 'legend') {
                    const s = GameData.shards[card.id] || 0;
                    progressHtml = `<div class="progress-bar"><div class="progress-fill legend-fill" style="width:${(s/1)*100}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">Legend Shards: ${s}/1</div>`;
                } else {
                    const copies = GameData.cardCopies[card.id] || 0;
                    const req = Progression.getUpgradeReq(level);
                    const pct = Math.min(100, (copies/req)*100);
                    progressHtml = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">${copies}/${req}</div>`;
                    div.innerHTML += `<div class="lvl">Lvl ${level}</div>`;
                }
            } else {
                progressHtml = `<div style="font-size:0.7rem; color:#e74c3c; font-weight:bold; text-shadow: 0 1px 0 #000;">Arena ${card.arena}</div>`;
            }
        } else {
            if(isCasual) {
                progressHtml = `<div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div><div style="font-size:0.65rem; font-weight:bold; color:#f1c40f;">MAX</div>`;
                div.innerHTML += `<div class="lvl">Lvl 15</div>`;
            } else if(card.type !== 'legend') {
                const copies = GameData.cardCopies[card.id] || 0;
                const req = Progression.getUpgradeReq(level);
                const pct = Math.min(100, (copies/req)*100);
                progressHtml = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">${copies}/${req}</div>`;
                div.innerHTML += `<div class="lvl">Lvl ${level}</div>`;

                if(!inDeck && copies >= req && GameData.gold >= Progression.getUpgradeCost(level)) {
                    div.style.borderColor = '#2ecc71';
                    div.style.boxShadow = '0 4px 0 #27ae60, 0 0 15px rgba(46, 204, 113, 0.4)';
                }
            } else {
                div.innerHTML += `<div class="lvl">Lvl ${level}</div>`;
            }
        }

        div.innerHTML += `
            <div class="elixir">${card.cost}</div>
            <span class="emoji">${card.emoji}</span>
            <div style="font-size:0.7rem; margin-top:5px; white-space:nowrap; overflow:hidden; font-weight:900;">${card.name}</div>
            ${progressHtml}
            ${card.isEvoBase && showEvoInfo ? `<div style="font-size:0.65rem; font-weight:bold; color:${GameData.evoUnlocked[card.id] ? '#9b59b6' : '#f1c40f'}; margin-top:4px;">${GameData.evoUnlocked[card.id] ? 'EVO unlocked' : `EVO ${Progression.getEvoProgress(card.id)}/6`}</div>` : ''}
        `;

        // Make unlocked EVOs draggable to slots
        if(card.isEvoBase && GameData.evoUnlocked[card.id] && !inDeck) {
            div.draggable = true;
            div.ondragstart = (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('type', 'evo');
                e.dataTransfer.setData('cardId', card.id);
            };
        }

        return div;
    },
    
    showShardCollection(cardId) {
        const card = CARD_DB[cardId];
        const shards = GameData.shards[cardId + '_evo'] || 0;
        
        // Create shard collection modal
        const modal = document.createElement('div');
        modal.id = 'shard-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h2 style="color: #9b59b6; margin-bottom: 20px;">Collect EVO Shards for ${card.name}</h2>
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 3rem; margin: 10px 0;">${card.emoji}</div>
                    <div style="font-size: 1.2rem; color: #f1c40f; font-weight: bold;">Shards: ${shards}/6</div>
                </div>
                <div id="shard-buttons" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;"></div>
                <div style="text-align: center; color: #aaa; font-size: 0.9rem;">
                    Get shards from gifts after Arena 2!
                </div>
                <button class="btn" onclick="document.getElementById('shard-modal').remove()" style="width: 100%; margin-top: 20px;">Close</button>
            </div>
        `;
        
        // Add shard buttons
        const buttonContainer = modal.querySelector('#shard-buttons');
        for(let i = 0; i < 6; i++) {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.width = '50px';
            btn.style.height = '50px';
            btn.style.borderRadius = '50%';
            btn.style.fontSize = '1.5rem';
            btn.style.padding = '0';
            
            if(i < shards) {
                btn.style.background = '#9b59b6';
                btn.innerText = '●';
                btn.title = 'Shard collected';
            } else {
                btn.style.background = '#555';
                btn.innerText = '○';
                btn.title = 'Click to add shard (for testing)';
                btn.onclick = () => {
                    GameData.shards[cardId + '_evo'] = Math.min(6, (GameData.shards[cardId + '_evo'] || 0) + 1);
                    if(GameData.shards[cardId + '_evo'] >= 6) {
                        GameData.evoUnlocked[cardId] = true;
                        Toast.show('🎉 EVO Unlocked! You can now use this card in EVO slots.', 'success');
                        modal.remove();
                        this.renderCards();
                    } else {
                        this.showShardCollection(cardId);
                    }
                    SaveSystem.save();
                };
            }
            buttonContainer.appendChild(btn);
        }
        
        document.body.appendChild(modal);
        modal.classList.add('active');
    },
    
    renderShop() {
        const grid = document.getElementById('ui-shop-grid');
        if (grid) {
            grid.innerHTML = '';
            GameData.shop.items.forEach((offer) => {
                if (offer.type !== 'cards') return;

                const card = CARD_DB[offer.id];
                const div = document.createElement('div');
                div.className = 'card-item';
                div.innerHTML = `
                    <div style="font-size:2rem; margin:10px 0; filter:drop-shadow(0 2px 2px #000);">${card.emoji}</div>
                    <div style="font-size:0.7rem; margin:5px 0; font-weight:bold;">x${offer.amount} ${card.name}</div>
                    <button class="btn shop-btn" style="width:100%; padding:8px; font-size:0.8rem; border-width:2px;">
                        ${offer.cost} ${offer.currency === 'gold' ? '💰' : '💎'}
                    </button>
                `;
                div.querySelector('button').onclick = () => {
                    if (GameData[offer.currency] >= offer.cost) {
                        GameData[offer.currency] -= offer.cost;
                        Progression.grantReward(offer.type, offer.amount, offer.id);
                        GameData.shop.items.splice(GameData.shop.items.indexOf(offer), 1);
                        SaveSystem.save();
                        this.updateUI();
                        this.renderShop();
                    } else {
                        Toast.show(`Not enough ${offer.currency}.`, 'error');
                    }
                };
                grid.appendChild(div);
            });
        }

        const shardsDiv = document.getElementById('ui-evo-shards-display');
        if (shardsDiv) {
            shardsDiv.innerHTML = '';
            const shardSummaries = [];
            if (GameData.arena >= 2) {
                shardSummaries.push({
                    title: 'Evolution Shards',
                    count: GameData.shardInventory.evo || 0,
                    color: '#9b59b6',
                    detail: Object.values(CARD_DB)
                        .filter((card) => card.isEvoBase)
                        .map((card) => `${card.emoji} ${card.name}: ${Progression.getEvoProgress(card.id)}/6${GameData.evoUnlocked[card.id] ? ' unlocked' : ''}`)
                        .join('<br>')
                });
            }
            if (GameData.arena >= 10) {
                shardSummaries.push({
                    title: 'Legend Shards',
                    count: GameData.shardInventory.legend || 0,
                    color: '#f1c40f',
                    detail: Object.values(CARD_DB)
                        .filter((card) => card.type === 'legend')
                        .map((card) => GameData.arena < card.arena ? `${card.name}: Arena ${card.arena}` : `${card.emoji} ${card.name}: ${Progression.getLegendProgress(card.id)}/1${Progression.isUnlocked(card.id) ? ' unlocked' : ''}`)
                        .join('<br>')
                });
            }
            if (shardSummaries.length === 0) {
                const div = document.createElement('div');
                div.className = 'card-item';
                div.style.gridColumn = '1 / -1';
                div.innerHTML = `
                    <div style="font-size:0.85rem; font-weight:900; margin-bottom:6px;">Special Shards</div>
                    <div style="font-size:0.7rem; color:#ddd; line-height:1.5;">Special shard systems unlock later in the arena road.</div>
                `;
                shardsDiv.appendChild(div);
            }
            shardSummaries.forEach((summary) => {
                const div = document.createElement('div');
                div.className = 'card-item';
                div.style.borderColor = summary.color;
                div.innerHTML = `
                    <div style="font-size:0.8rem; font-weight:900; margin-bottom:6px;">${summary.title}</div>
                    <div style="font-size:1.7rem; font-weight:900; margin-bottom:6px;">${summary.count}</div>
                    <div style="font-size:0.65rem; color:#ddd; line-height:1.4;">${summary.detail}</div>
                `;
                shardsDiv.appendChild(div);
            });
        }
    },
    renderQuests() {
        const list = document.getElementById('ui-quests-list');
        list.innerHTML = '';
        GameData.quests.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = 'quest-item';
            
            const pct = Math.min(100, (q.progress / q.target) * 100);
            
            let btnHtml = '';
            if(q.claimed) btnHtml = `<button class="btn" style="background:#555" disabled>Claimed</button>`;
            else if(q.progress >= q.target) btnHtml = `<button class="btn success" onclick="MenuLogic.claimQuest(${i})">Claim</button>`;
            else btnHtml = `<div class="quest-reward">${q.rewardAmount} ${q.rewardType === 'gold'?'💰':'💎'}</div>`;

            div.innerHTML = `
                <div class="quest-info" style="flex:1;">
                    <h3>${q.text}</h3>
                    <div class="progress-bar" style="width:100%; margin-top:10px; border-color:#000;"><div class="progress-fill" style="width:${pct}%"></div></div>
                    <div style="font-size:0.8rem; color:#aaa; margin-top:5px; font-weight:bold;">${Math.min(q.progress, q.target)} / ${q.target}</div>
                </div>
                <div style="margin-left: 15px;">
                    ${btnHtml}
                </div>
            `;
            list.appendChild(div);
        });
    },
    claimQuest(index) {
        const q = GameData.quests[index];
        if(q.claimed || q.progress < q.target) return;
        q.claimed = true;
        Progression.grantReward(q.rewardType, q.rewardAmount, null);
        SaveSystem.save();
        this.updateUI();
        this.renderQuests();
    },
    renderItems() {
        const wildcardsList = [
            { key: 'common', title: 'Common Wildcards', value: GameData.wildcards.common || 0, color: '#adb5bd', emoji: '⬜' },
            { key: 'rare', title: 'Rare Wildcards', value: GameData.wildcards.rare || 0, color: '#3498db', emoji: '🔷' },
            { key: 'epic', title: 'Epic Wildcards', value: GameData.wildcards.epic || 0, color: '#9b59b6', emoji: '🔶' },
            { key: 'legendary', title: 'Legendary Wildcards', value: GameData.wildcards.legendary || 0, color: '#f1c40f', emoji: '🔸' }
        ];

        const summaryDiv = document.getElementById('ui-item-summary');
        if (summaryDiv) {
            summaryDiv.innerHTML = wildcardsList.map((item) => {
                const count = item.value;
                const cap = typeof RARITY_CONFIG !== 'undefined' ? RARITY_CONFIG[item.key]?.cap || 200 : 200;
                const canUse = count > 0;
                return `
                    <div style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px; border: 2px solid ${item.color}; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="font-size: 0.8rem; font-weight: 900; margin-bottom: 4px; color: ${item.color};">${item.emoji} ${item.title}</div>
                            <div style="font-size: 1.6rem; font-weight: 900; margin: 4px 0;">${count} <span style="font-size: 0.75rem; color: #888;">/ ${cap}</span></div>
                        </div>
                        <button class="btn ${canUse ? 'success' : ''}" style="width: 100%; margin-top: 8px; padding: 6px; font-size: 0.75rem; font-weight: 900;" ${canUse ? '' : 'disabled'} onclick="MenuLogic.openWildcardModal('${item.key}')">
                            ${canUse ? 'Use Wildcard' : 'None Available'}
                        </button>
                    </div>
                `;
            }).join('');
        }

        const slotsDiv = document.getElementById('ui-equip-slots');
        if (slotsDiv) {
            slotsDiv.innerHTML = '';
            for (let i = 0; i < 4; i++) {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'card-item';
                slotDiv.style.width = '70px';
                slotDiv.style.height = '70px';
                slotDiv.style.cursor = 'pointer';
                slotDiv.style.fontSize = '2rem';
                slotDiv.style.display = 'flex';
                slotDiv.style.alignItems = 'center';
                slotDiv.style.justifyContent = 'center';
                slotDiv.style.position = 'relative';
                slotDiv.style.borderColor = this.selectedEmoteSlot === i ? '#2ecc71' : '#000';
                slotDiv.style.boxShadow = this.selectedEmoteSlot === i ? '0 4px 0 #27ae60' : '0 4px 0 #000';

                const equipped = GameData.equipSlots[i];
                slotDiv.innerText = equipped || '+';
                slotDiv.style.opacity = equipped ? '1' : '0.5';
                slotDiv.onclick = () => this.selectEmoteSlot(i);

                if (equipped) {
                    const clearBtn = document.createElement('button');
                    clearBtn.className = 'btn';
                    clearBtn.innerText = 'x';
                    clearBtn.style.position = 'absolute';
                    clearBtn.style.top = '-8px';
                    clearBtn.style.right = '-8px';
                    clearBtn.style.width = '24px';
                    clearBtn.style.height = '24px';
                    clearBtn.style.padding = '0';
                    clearBtn.style.fontSize = '0.8rem';
                    clearBtn.style.background = '#e74c3c';
                    clearBtn.onclick = (event) => {
                        event.stopPropagation();
                        this.clearEquippedEmote(i);
                    };
                    slotDiv.appendChild(clearBtn);
                }

                slotsDiv.appendChild(slotDiv);
            }
        }

        const emotesDiv = document.getElementById('ui-unlocked-emotes');
        if (emotesDiv) {
            emotesDiv.innerHTML = '';
            const allEmotes = typeof ALL_EMOTES !== 'undefined' ? ALL_EMOTES : (GameData.unlockedEmotes || []);
            allEmotes.forEach((emote) => {
                const isUnlocked = GameData.unlockedEmotes.includes(emote);
                const isEquipped = (GameData.equipSlots || []).includes(emote);
                const emoteDiv = document.createElement('div');
                emoteDiv.className = `card-item ${!isUnlocked ? 'locked' : ''}`;
                emoteDiv.style.width = '56px';
                emoteDiv.style.height = '56px';
                emoteDiv.style.cursor = 'pointer';
                emoteDiv.style.fontSize = '1.7rem';
                emoteDiv.style.display = 'flex';
                emoteDiv.style.alignItems = 'center';
                emoteDiv.style.justifyContent = 'center';
                emoteDiv.style.position = 'relative';
                emoteDiv.style.borderColor = isEquipped ? '#2ecc71' : (!isUnlocked ? '#555' : '#000');
                emoteDiv.style.opacity = !isUnlocked ? '0.35' : '1';
                emoteDiv.style.filter = !isUnlocked ? 'grayscale(1)' : 'none';
                emoteDiv.innerText = emote;
                emoteDiv.title = isUnlocked ? 'Tap to equip / hear sound' : 'Locked (Find in Daily Shop)';

                if (isEquipped) {
                    const badge = document.createElement('div');
                    badge.style.cssText = 'position:absolute; top:2px; right:2px; font-size:0.5rem; background:#2ecc71; color:#000; padding:1px 3px; border-radius:3px; font-weight:900;';
                    badge.innerText = '✓';
                    emoteDiv.appendChild(badge);
                }

                emoteDiv.onclick = () => {
                    if (typeof SoundManager !== 'undefined') SoundManager.play('emote', emote);
                    if (isUnlocked) {
                        this.equipEmote(emote);
                    } else {
                        Toast.show('🎭 Emote is locked! Unlock it from Daily Shop.', 'error');
                    }
                };
                emotesDiv.appendChild(emoteDiv);
            });
        }

        const shardPanel = document.getElementById('panel-shard-inventory');
        const hasEvosUnlocked = GameData.arena >= 2 || (GameData.trophies || 0) >= 300;
        if (shardPanel) {
            shardPanel.style.display = hasEvosUnlocked ? 'block' : 'none';
        }

        const evoCardsDiv = document.getElementById('ui-evo-shard-cards');
        if (evoCardsDiv) {
            const evoSection = document.getElementById('section-evo-shards') || evoCardsDiv.parentElement;
            if (evoSection) evoSection.style.display = hasEvosUnlocked ? 'block' : 'none';
            evoCardsDiv.innerHTML = '';
            if (hasEvosUnlocked) Object.values(CARD_DB).filter((card) => card.isEvoBase).forEach((card) => {
                const progress = Progression.getEvoProgress(card.id);
                const unlocked = !!GameData.evoUnlocked[card.id];
                const canSpend = Progression.isUnlocked(card.id) && !unlocked && (GameData.shardInventory.evo || 0) > 0;
                const evoCard = CARD_DB[card.id + '_evo'] || card;
                const div = document.createElement('div');
                div.className = `shard-card ${unlocked ? 'evo' : ''}`;
                div.style.cursor = 'pointer';
                div.innerHTML = `
                    <div class="shard-card-emoji">${evoCard.emoji}</div>
                    <div class="shard-card-name">${card.name}</div>
                    <div class="progress-bar"><div class="progress-fill shard-fill" style="width:${Math.min(100, (progress / 6) * 100)}%"></div></div>
                    <div class="shard-card-fraction">${progress}/6</div>
                    <button class="btn ${canSpend ? 'success' : ''}" ${canSpend ? '' : 'disabled'}>
                        ${unlocked ? 'Unlocked' : canSpend ? 'Use 1' : Progression.isUnlocked(card.id) ? 'Need shard' : 'Unlock base card'}
                    </button>
                `;
                div.onclick = (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        this.openCardModal(card.id);
                    }
                };
                div.querySelector('button').onclick = (e) => {
                    e.stopPropagation();
                    if (!Progression.spendEvoShard(card.id)) return;
                    SaveSystem.save();
                    this.renderItems();
                    this.renderCards();
                };
                evoCardsDiv.appendChild(div);
            });
        }

        const legendCardsDiv = document.getElementById('ui-legend-shard-cards');
        if (legendCardsDiv) {
            const legendSection = document.getElementById('section-legend-shards') || legendCardsDiv.parentElement;
            const hasLegendUnlocked = GameData.arena >= 10;
            if (legendSection) legendSection.style.display = hasLegendUnlocked ? 'block' : 'none';
            legendCardsDiv.innerHTML = '';
            if (hasLegendUnlocked) Object.values(CARD_DB).filter((card) => card.type === 'legend').forEach((card) => {
                const progress = Progression.getLegendProgress(card.id);
                const available = GameData.shardInventory.legend || 0;
                const arenaReady = GameData.arena >= card.arena;
                const unlocked = Progression.isUnlocked(card.id);
                const canSpend = arenaReady && !unlocked && available > 0;
                const div = document.createElement('div');
                div.className = `shard-card ${unlocked ? 'legendary' : ''}`;
                div.style.cursor = 'pointer';
                div.innerHTML = `
                    <div class="shard-card-emoji">${card.emoji}</div>
                    <div class="shard-card-name">${card.name}</div>
                    <div class="progress-bar"><div class="progress-fill legend-fill" style="width:${Math.min(100, progress * 100)}%"></div></div>
                    <div class="shard-card-fraction">${progress}/1</div>
                    <button class="btn ${canSpend ? 'success' : ''}" ${canSpend ? '' : 'disabled'}>
                        ${unlocked ? 'Unlocked' : canSpend ? 'Use 1' : arenaReady ? 'Need shard' : `Arena ${card.arena}`}
                    </button>
                `;
                div.onclick = (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        this.openCardModal(card.id);
                    }
                };
                div.querySelector('button').onclick = (e) => {
                    e.stopPropagation();
                    if (!Progression.spendLegendShard(card.id)) return;
                    SaveSystem.save();
                    this.renderItems();
                    this.renderCards();
                };
                legendCardsDiv.appendChild(div);
            });
        }
    },

    getSeasonReward(level) {
        const season_rewards_cycle = [
            { type: 'gold', amount: 150, emoji: '💰', title: '150 Gold', desc: 'Use gold to upgrade your cards and increase your tower battle strength.' },
            { type: 'cards', amount: 15, id: 'knight', emoji: '⚔️', title: '15x Knight Cards', desc: 'Collect copies to level up your trusty melee fighter!' },
            { type: 'gems', amount: 20, emoji: '💎', title: '20 Gems', desc: 'Premium gems to purchase daily shop items and exclusive emote packs.' },
            { type: 'chest', amount: 'silver', emoji: '🎁', title: 'Silver Mystery Gift', desc: 'Open this gift to receive gold, common cards, and rare cards!' },
            { type: 'gold', amount: 300, emoji: '💰', title: '300 Gold', desc: 'Use gold to upgrade your cards and increase your tower battle strength.' },
            { type: 'cards', amount: 20, id: 'archer', emoji: '🏹', title: '20x Archer Cards', desc: 'Twin archers that deliver ranged arrow fire against ground and air.' },
            { type: 'gems', amount: 25, emoji: '💎', title: '25 Gems', desc: 'Premium gems to purchase daily shop items and exclusive emote packs.' },
            { type: 'cards', amount: 25, id: 'giant', emoji: '🧌', title: '25x Giant Cards', desc: 'Heavy tank unit that marches directly toward enemy defensive buildings.' },
            { type: 'gold', amount: 500, emoji: '💰', title: '500 Gold', desc: 'Use gold to upgrade your cards and increase your tower battle strength.' },
            { type: 'chest', amount: 'gold', emoji: '🎁', title: 'Golden Gift', desc: 'A gift overflowing with rare cards, high gold payouts, and extra rewards!' },
        ];
        const baseReward = season_rewards_cycle[(level - 1) % season_rewards_cycle.length];
        let emoji = baseReward.emoji;
        if (baseReward.type === 'cards' && CARD_DB[baseReward.id]) {
            emoji = CARD_DB[baseReward.id].emoji;
        }
        return {
            ...baseReward,
            level,
            emoji,
            title: baseReward.title || (baseReward.amount + ' ' + baseReward.type)
        };
    },

    renderSeasonPass() {
        const sp = GameData.seasonPass || (GameData.seasonPass = { level: 1, progress: 0, claimedRewards: [] });
        const container = document.getElementById('ui-season-levels') || document.getElementById('season-pass-container');
        if (!container) return;
        container.innerHTML = '';

        const curLevelEl = document.getElementById('sp-current-level');
        const progTextEl = document.getElementById('sp-progress-text');
        const progFillEl = document.getElementById('sp-bar-fill');

        if (curLevelEl) curLevelEl.innerText = sp.level;
        if (progTextEl) progTextEl.innerText = `${sp.progress}/100 Crowns`;
        if (progFillEl) progFillEl.style.width = `${Math.min(100, sp.progress)}%`;

        for (let i = 1; i <= 50; i++) {
            const div = document.createElement('div');
            const reward = this.getSeasonReward(i);
            const isClaimed = sp.claimedRewards && sp.claimedRewards.includes(i);
            const isCurrent = i === sp.level;
            const isUnlocked = i <= sp.level;
            const isLocked = i > sp.level;

            div.className = `sp-level ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`;
            div.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: ${isClaimed ? 'rgba(0,0,0,0.4)' : (isCurrent ? 'linear-gradient(90deg, rgba(241,196,15,0.25), rgba(0,0,0,0.5))' : 'rgba(30,41,59,0.7)')};
                border: 2px solid ${isClaimed ? '#334155' : (isCurrent ? '#f1c40f' : (isUnlocked ? '#2ecc71' : '#475569'))};
                border-radius: 10px;
                padding: 10px 14px;
                cursor: pointer;
                transition: transform 0.15s ease, border-color 0.15s ease;
            `;

            div.onmouseenter = () => div.style.transform = 'scale(1.01)';
            div.onmouseleave = () => div.style.transform = 'scale(1)';

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; pointer-events: none;">
                    <div style="font-weight: 900; font-size: 0.95rem; color: ${isUnlocked ? '#f1c40f' : '#94a3b8'}; min-width: 60px;">Tier ${i}</div>
                    <div style="font-size: 1.8rem; filter: drop-shadow(0 2px 4px #000);">${reward.emoji}</div>
                    <div style="text-align: left;">
                        <div style="font-size: 0.88rem; font-weight: 900; color: #fff;">${reward.title}</div>
                        <div style="font-size: 0.72rem; color: #94a3b8; font-weight: bold;">Tap to preview</div>
                    </div>
                </div>
                <div>
                    ${isClaimed 
                        ? '<div style="font-size: 0.75rem; font-weight: 900; color: #2ecc71; background: rgba(46,204,113,0.15); padding: 4px 10px; border-radius: 6px; pointer-events: none;">✓ Claimed</div>' 
                        : (isUnlocked 
                            ? `<button class="btn success" style="padding: 6px 14px; font-size: 0.82rem; font-weight: 900; pointer-events: auto;" onclick="event.stopPropagation(); MenuLogic.claimSeasonPassReward(${i})">Claim</button>` 
                            : `<div style="font-size: 0.75rem; font-weight: 900; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 6px; pointer-events: none;">🔒 Locked</div>`)}
                </div>
            `;

            div.setAttribute('onclick', `MenuLogic.openSeasonRewardPreview(${i})`);
            div.onclick = () => this.openSeasonRewardPreview(i);
            container.appendChild(div);
        }
    },

    openSeasonRewardPreview(level) {
        const sp = GameData.seasonPass || { level: 1, progress: 0, claimedRewards: [] };
        const reward = this.getSeasonReward(level);
        const isClaimed = sp.claimedRewards && sp.claimedRewards.includes(level);
        const isUnlocked = level <= sp.level;

        const modal = document.getElementById('season-reward-preview-modal');
        if (!modal) return;

        document.getElementById('season-reward-preview-tier').innerText = `Tier ${level} Reward`;
        document.getElementById('season-reward-preview-title').innerText = reward.title;
        document.getElementById('season-reward-preview-emoji').innerText = reward.emoji;
        
        let descText = reward.desc;
        if (reward.type === 'cards' && reward.id && CARD_DB[reward.id]) {
            const card = CARD_DB[reward.id];
            descText = `${card.name}: ${card.desc || reward.desc} (${card.cost} Elixir, ${card.target.toUpperCase()} target)`;
        }
        document.getElementById('season-reward-preview-desc').innerText = descText;

        const actionsContainer = document.getElementById('season-reward-preview-actions');
        actionsContainer.innerHTML = '';

        if (isClaimed) {
            actionsContainer.innerHTML = `<div style="font-size: 0.95rem; font-weight: 900; color: #2ecc71; padding: 8px 16px; background: rgba(46,204,113,0.15); border-radius: 8px; border: 1px solid #2ecc71; margin-bottom: 4px;">✓ Already Claimed</div>`;
        } else if (isUnlocked) {
            const btnClaim = document.createElement('button');
            btnClaim.className = 'btn success';
            btnClaim.style.cssText = 'width: 100%; font-size: 1.1rem; padding: 12px; font-weight: 900; margin-bottom: 4px;';
            btnClaim.innerText = '🎁 Claim Reward!';
            btnClaim.onclick = () => {
                this.closeSeasonRewardPreview();
                this.claimSeasonPassReward(level);
            };
            actionsContainer.appendChild(btnClaim);
        } else {
            const crownsNeeded = Math.max(0, (level - sp.level) * 100 - sp.progress);
            actionsContainer.innerHTML = `<div style="font-size: 0.85rem; font-weight: 900; color: #94a3b8; padding: 8px 12px; background: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid #475569; margin-bottom: 4px;">🔒 Requires Tier ${level} (${crownsNeeded} more Crowns)</div>`;
        }

        if (reward.type === 'cards' && reward.id && CARD_DB[reward.id]) {
            const btnCardPreview = document.createElement('button');
            btnCardPreview.className = 'btn';
            btnCardPreview.style.cssText = 'width: 100%; font-size: 1rem; padding: 12px; font-weight: 900; background: linear-gradient(135deg, #9b59b6, #8e44ad); box-shadow: 0 4px 0 #5b2c6f;';
            btnCardPreview.innerText = `⚔️ Preview ${CARD_DB[reward.id].name} in Sandbox`;
            btnCardPreview.onclick = () => {
                this.closeSeasonRewardPreview();
                if (typeof PreviewGame !== 'undefined') {
                    PreviewGame.start(reward.id);
                } else {
                    this.openCardModal(reward.id);
                }
            };
            actionsContainer.appendChild(btnCardPreview);
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    },

    closeSeasonRewardPreview() {
        const modal = document.getElementById('season-reward-preview-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    claimSeasonPassReward(level) {
        if (GameData.seasonPass.level < level || GameData.seasonPass.claimedRewards.includes(level)) return;

        GameData.seasonPass.claimedRewards.push(level);
        const reward = this.getSeasonReward(level);

        let itemsHtml = '';
        if (reward.type === 'gold') {
            Progression.grantReward('gold', reward.amount);
            itemsHtml = `<div class="reward-item" style="animation-delay: 0s;"><span style="font-size: 2.5rem;">${reward.emoji}</span><span>x${reward.amount} Gold</span></div>`;
        } else if (reward.type === 'gems') {
            Progression.grantReward('gems', reward.amount);
            itemsHtml = `<div class="reward-item" style="animation-delay: 0s;"><span style="font-size: 2.5rem;">${reward.emoji}</span><span>x${reward.amount} Gems</span></div>`;
        } else if (reward.type === 'cards') {
            Progression.grantReward('cards', reward.amount, reward.id);
            const cData = CARD_DB[reward.id] || { emoji: reward.emoji, name: reward.id };
            itemsHtml = `<div class="reward-item" style="animation-delay: 0s;"><span style="font-size: 2.5rem;">${cData.emoji}</span><span>x${reward.amount} ${cData.name}</span></div>`;
        } else if (reward.type === 'chest') {
            for (let i = 0; i < 4; i++) {
                if (!GameData.chests[i]) {
                    GameData.chests[i] = reward.amount;
                    break;
                }
            }
            itemsHtml = `<div class="reward-item" style="animation-delay: 0s;"><span style="font-size: 2.5rem;">${reward.emoji}</span><span>${(reward.amount === 'gold' ? 'Golden' : 'Silver')} Gift</span></div>`;
        }

        document.getElementById('reward-title').innerText = `Tier ${level} Reward!`;
        document.getElementById('reward-content').innerHTML = itemsHtml;
        document.getElementById('reward-modal').classList.add('active');

        SaveSystem.save();
        this.updateUI();
        this.renderSeasonPass();
    },

    openCardModal(cardId, inDeck) {
        const card = CARD_DB[cardId];
        const isCasual = GameData.mode === 'casual';
        const activeDeck = this.getActiveDeck();
        const isArenaLocked = !isCasual && card.arena > GameData.arena;
        const isUnlocked = isCasual || (!isArenaLocked && Progression.isUnlocked(cardId));
        const level = isCasual ? 15 : (GameData.cardLevels[cardId] || 1);
        const levelMulti = 1 + (level - 1) * 0.1;

        document.getElementById('card-modal-elixir').innerText = card.cost;
        document.getElementById('card-modal-emoji').innerText = card.emoji;
        document.getElementById('card-modal-name').innerText = card.name;
        document.getElementById('card-modal-type').innerText = `${card.type || 'unit'}${isCasual ? '' : ` - Arena ${card.arena}`}`;
        document.getElementById('card-modal-hp').innerText = Math.floor(card.hp * levelMulti);
        document.getElementById('card-modal-dmg').innerText = Math.floor(card.dmg * levelMulti);
        document.getElementById('card-modal-spd').innerText = card.atkSpeed + 's';
        document.getElementById('card-modal-level').innerText = `Lvl ${level}`;

        const progressDiv = document.getElementById('card-modal-progress');
        const btnUse = document.getElementById('btn-modal-use');
        const btnUpgrade = document.getElementById('btn-modal-upgrade');
        const btnPreview = document.getElementById('btn-modal-preview');
        const evoSection = document.getElementById('evo-unlock-section');
        const shardButtons = document.getElementById('evo-shard-buttons');
        const shardProgress = document.getElementById('evo-shard-progress');
        const shardTitle = evoSection.querySelector('div');

        btnUpgrade.style.filter = '';
        shardButtons.innerHTML = '';
        evoSection.style.display = 'none';

        if(card.isEvoBase && !isCasual && GameData.arena >= 2) {
            evoSection.style.display = 'block';
            shardTitle.innerText = 'Evolution Shards';
            shardTitle.style.color = '#9b59b6';

            const progress = Progression.getEvoProgress(cardId);
            const unlockedEvo = !!GameData.evoUnlocked[cardId];
            const canSpend = isUnlocked && !unlockedEvo && (GameData.shardInventory.evo || 0) > 0;
            shardProgress.innerText = unlockedEvo
                ? 'EVO unlocked'
                : `${progress}/6 assigned | ${GameData.shardInventory.evo || 0} available`;

            const shardBtn = document.createElement('button');
            shardBtn.className = `btn ${canSpend ? 'success' : ''}`;
            shardBtn.style.width = '100%';
            shardBtn.innerText = unlockedEvo ? 'Unlocked' : canSpend ? 'Use 1 EVO Shard' : isUnlocked ? 'Need EVO Shard' : 'Unlock base card first';
            shardBtn.disabled = !canSpend;
            shardBtn.onclick = () => {
                if(!Progression.spendEvoShard(cardId)) return;
                SaveSystem.save();
                this.renderItems();
                this.renderCards();
                this.openCardModal(cardId, this.isCardAssigned(cardId));
            };
            shardButtons.appendChild(shardBtn);
        } else if(card.type === 'legend' && !isCasual) {
            evoSection.style.display = 'block';
            shardTitle.innerText = 'Legend Shards';
            shardTitle.style.color = '#f1c40f';

            const progress = Progression.getLegendProgress(cardId);
            const canSpend = !isUnlocked && !isArenaLocked && (GameData.shardInventory.legend || 0) > 0;
            shardProgress.innerText = isArenaLocked
                ? `Unlocks in Arena ${card.arena}`
                : isUnlocked
                    ? 'Legend unlocked'
                    : `${progress}/1 assigned | ${GameData.shardInventory.legend || 0} available`;

            const shardBtn = document.createElement('button');
            shardBtn.className = `btn ${canSpend ? 'success' : ''}`;
            shardBtn.style.width = '100%';
            shardBtn.innerText = isUnlocked ? 'Unlocked' : canSpend ? 'Use 1 Legend Shard' : isArenaLocked ? `Arena ${card.arena}` : 'Need Legend Shard';
            shardBtn.disabled = !canSpend;
            shardBtn.onclick = () => {
                if(!Progression.spendLegendShard(cardId)) return;
                SaveSystem.save();
                this.renderItems();
                this.renderCards();
                this.openCardModal(cardId, this.isCardAssigned(cardId));
            };
            shardButtons.appendChild(shardBtn);
        }

        if(isArenaLocked) {
            progressDiv.innerHTML = `<div style="font-size:0.8rem; font-weight:bold; color:#e74c3c;">Unlocks in Arena ${card.arena}</div>`;
            btnUpgrade.style.display = 'none';
        } else if(!isCasual && card.type !== 'legend') {
            const copies = GameData.cardCopies[cardId] || 0;
            const req = Progression.getUpgradeReq(level);
            const pct = Math.min(100, (copies / req) * 100);
            progressDiv.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div style="font-size:0.65rem; font-weight:bold;">${copies}/${req} copies</div>`;

            if(isUnlocked) {
                btnUpgrade.style.display = 'block';
                btnUpgrade.innerText = `Upgrade (${Progression.getUpgradeCost(level)} gold)`;
                btnUpgrade.disabled = copies < req || GameData.gold < Progression.getUpgradeCost(level);
                btnUpgrade.onclick = () => {
                    if(copies < req || GameData.gold < Progression.getUpgradeCost(level)) return;
                    GameData.gold -= Progression.getUpgradeCost(level);
                    GameData.cardLevels[cardId] = level + 1;
                    SaveSystem.save();
                    this.updateUI();
                    this.renderCards();
                    this.openCardModal(cardId, inDeck);
                };
            } else {
                btnUpgrade.style.display = 'none';
            }
        } else {
            progressDiv.innerHTML = isUnlocked
                ? '<div style="font-size:0.8rem; font-weight:bold; color:#f1c40f;">Ready to use</div>'
                : '<div style="font-size:0.8rem; font-weight:bold; color:#aaa;">Preview available</div>';
            btnUpgrade.style.display = 'none';
        }

        if(isArenaLocked || !isUnlocked) {
            btnUse.style.display = 'none';
        } else {
            btnUse.style.display = 'block';
            if(inDeck) {
                btnUse.innerText = 'Remove from Deck';
                btnUse.disabled = false;
                btnUse.className = 'btn warning';
                btnUse.onclick = () => {
                    const idx = activeDeck.indexOf(cardId);
                    if (idx !== -1) {
                        activeDeck.splice(idx, 1);
                        SaveSystem.save();
                        Toast.show(`Removed ${card.name} from deck!`, 'info');
                        this.renderCards();
                        this.closeCardModal();
                    }
                };
            } else {
                btnUse.className = 'btn success';
                btnUse.innerText = activeDeck.length < 8 ? 'Add to Deck' : 'Swap into Deck';
                btnUse.disabled = false;
                btnUse.onclick = () => {
                    if(activeDeck.length < 8) {
                        activeDeck.push(cardId);
                        SaveSystem.save();
                        Toast.show(`Added ${card.name} to deck!`, 'success');
                        this.renderCards();
                        this.closeCardModal();
                    } else {
                        // Deck is full, initiate swap mode
                        this.initiateSwap(cardId);
                        Toast.show(`Tap a card in your deck to replace it with ${card.name}!`, 'info');
                    }
                };
            }
        }

        btnPreview.style.display = 'block';
        btnPreview.innerText = card.isEvoBase && GameData.evoUnlocked[cardId] ? 'Preview EVO' : 'Preview in Sandbox ⚔️';
        btnPreview.onclick = () => {
            this.closeCardModal();
            const targetId = (card.isEvoBase && GameData.evoUnlocked[cardId]) ? cardId + '_evo' : cardId;
            PreviewGame.start(targetId);
        };

        const cardModal = document.getElementById('card-modal');
        if (cardModal) {
            cardModal.classList.add('active');
            cardModal.style.display = 'flex';
        }
    },
    closeCardModal() {
        const cardModal = document.getElementById('card-modal');
        if (cardModal) {
            cardModal.classList.remove('active');
            cardModal.style.display = 'none';
        }
    },
    renderAudioSettings() {
        const sfxBtn = document.getElementById("audio-toggle-btn");
        const musicBtn = document.getElementById("music-toggle-btn");
        if (typeof SoundManager !== "undefined") {
            if (sfxBtn) {
                sfxBtn.innerText = SoundManager.muted ? "🔇 SFX: OFF" : "🔊 SFX: ON";
                sfxBtn.style.background = SoundManager.muted ? "#e74c3c" : "#2ecc71";
            }
            if (musicBtn) {
                musicBtn.innerText = SoundManager.musicMuted ? "🎵 Music: OFF" : "🎶 Music: ON";
                musicBtn.style.background = SoundManager.musicMuted ? "#e74c3c" : "#9b59b6";
            }
        }
    },
    toggleAudio() {
        if (typeof SoundManager !== "undefined") {
            SoundManager.toggleMute();
            this.renderAudioSettings();
            if (!SoundManager.muted) SoundManager.play("click");
        }
    },
    toggleMusic() {
        if (typeof SoundManager !== "undefined") {
            SoundManager.toggleMusic();
            this.renderAudioSettings();
            if (!SoundManager.muted) SoundManager.play("click");
        }
    },
    isLocalEnvironment() {
        try {
            const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
            const proto = (typeof window !== 'undefined' && window.location && window.location.protocol) ? window.location.protocol : '';
            if (host.includes('github.io')) return false;
            if (proto === 'file:') return true;
            if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return true;
            if (host.startsWith('192.168.') || host.startsWith('10.') || (host.startsWith('172.') && parseInt(host.split('.')[1], 10) >= 16 && parseInt(host.split('.')[1], 10) <= 31) || host.endsWith('.local')) return true;
            return false;
        } catch (e) {
            return false;
        }
    },
    openSettings() {
        this.renderAudioSettings();
        const debugBtn = document.getElementById('debug-menu-btn');
        if (debugBtn) {
            debugBtn.style.display = this.isLocalEnvironment() ? 'block' : 'none';
        }
        document.getElementById('settings-modal').classList.add('active');
    },
    closeSettings() { document.getElementById('settings-modal').classList.remove('active'); },
    openDebugMenu() {
        if (!this.isLocalEnvironment()) {
            if (typeof Toast !== 'undefined') Toast.show('Debug menu is only accessible in local dev sessions!', 'error');
            return;
        }
        document.getElementById('debug-modal').classList.add('active');
    },
    closeDebugMenu() { document.getElementById('debug-modal').classList.remove('active'); }
};
