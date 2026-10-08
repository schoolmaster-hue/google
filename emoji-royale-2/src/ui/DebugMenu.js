const DebugMenu = {
    addGold(amount) {
        GameData.gold = (GameData.gold || 0) + amount;
        SaveSystem.save();
        MenuLogic.updateUI();
        Toast.show(`Added ${amount} Gold! Total: ${GameData.gold}`, 'success');
    },

    addGems(amount) {
        GameData.gems = (GameData.gems || 0) + amount;
        SaveSystem.save();
        MenuLogic.updateUI();
        Toast.show(`Added ${amount} Gems! Total: ${GameData.gems}`, 'success');
    },

    addTrophies(amount) {
        GameData.trophies = (GameData.trophies || 0) + amount;
        const matchingArena = [...ARENAS].reverse().find(a => GameData.trophies >= a.trophies) || ARENAS[0];
        GameData.arena = Math.max(GameData.arena || 1, matchingArena.id);
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show(`Added ${amount} Trophies! Current Arena: ${GameData.arena}`, 'success');
    },

    addCustomWildcards() {
        const rarityEl = document.getElementById('debug-wildcard-rarity');
        const amountEl = document.getElementById('debug-wildcard-amount');
        const rarity = rarityEl ? rarityEl.value : 'common';
        const amount = parseInt(amountEl ? amountEl.value : 10, 10) || 10;
        if (!GameData.wildcards) GameData.wildcards = {};
        GameData.wildcards[rarity] = (GameData.wildcards[rarity] || 0) + amount;
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show(`Added ${amount} ${rarity.toUpperCase()} Wildcards!`, 'success');
    },

    addCustomCardCopies() {
        const cardSelect = document.getElementById('debug-card-select');
        const amountEl = document.getElementById('debug-card-amount');
        const cardId = cardSelect ? cardSelect.value : null;
        const amount = parseInt(amountEl ? amountEl.value : 10, 10) || 10;
        if (!cardId || !CARD_DB[cardId]) {
            Toast.show('Please select a valid card first!', 'error');
            return;
        }
        const card = CARD_DB[cardId];
        if (!GameData.cardLevels[cardId]) GameData.cardLevels[cardId] = 1;
        if (card.type === 'legend') {
            GameData.shards[cardId] = (GameData.shards[cardId] || 0) + amount;
            GameData.cardCopies[cardId] = (GameData.cardCopies[cardId] || 0) + amount;
        } else {
            GameData.cardCopies[cardId] = (GameData.cardCopies[cardId] || 0) + amount;
        }
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show(`Added ${amount} copies of ${card.name}!`, 'success');
    },

    unlockAllCards() {
        Object.values(CARD_DB).forEach(card => {
            if (card.isEvo) return;
            if (!GameData.cardLevels[card.id]) GameData.cardLevels[card.id] = 1;
            GameData.cardCopies[card.id] = Math.max(100, (GameData.cardCopies[card.id] || 0) + 100);
            if (card.type === 'legend') {
                GameData.shards[card.id] = Math.max(1, GameData.shards[card.id] || 1);
            }
        });
        GameData.arena = Math.max(GameData.arena || 1, 10);
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show('All cards unlocked & added to collection!', 'success');
    },

    maxAllCards() {
        Object.values(CARD_DB).forEach(card => {
            if (card.isEvo) return;
            GameData.cardLevels[card.id] = 15;
            GameData.cardCopies[card.id] = 5000;
            if (card.type === 'legend') {
                GameData.shards[card.id] = 10;
            }
            if (card.isEvoBase) {
                GameData.evoUnlocked[card.id] = true;
                GameData.shards[card.id + '_evo'] = 6;
            }
        });
        if (typeof TOWER_DB !== 'undefined') {
            if (!GameData.towerLevels) GameData.towerLevels = {};
            if (!GameData.towerCopies) GameData.towerCopies = {};
            Object.keys(TOWER_DB).forEach(tId => {
                GameData.towerLevels[tId] = 15;
                GameData.towerCopies[tId] = 500;
            });
        }
        GameData.arena = Math.max(GameData.arena || 1, 10);
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show('All cards & towers maxed to Level 15!', 'success');
    },

    unlockAllEvos() {
        let count = 0;
        Object.values(CARD_DB).forEach(card => {
            if (card.isEvoBase) {
                GameData.evoUnlocked[card.id] = true;
                GameData.shards[card.id + '_evo'] = 6;
                GameData.cardLevels[card.id] = Math.max(1, GameData.cardLevels[card.id] || 1);
                GameData.cardCopies[card.id] = Math.max(100, GameData.cardCopies[card.id] || 0);
                count++;
            }
        });
        if (!GameData.shardInventory) GameData.shardInventory = {};
        GameData.shardInventory.evo = 6;
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show(`Unlocked all ${count} card EVOs!`, 'success');
    },

    advanceArena() {
        const cur = GameData.arena || 1;
        const next = Math.min(ARENAS.length, cur + 1);
        GameData.arena = next;
        GameData.trophies = Math.max(GameData.trophies || 0, ARENAS[next - 1].trophies);
        SaveSystem.save();
        MenuLogic.updateUI();
        MenuLogic.renderCards();
        Toast.show(`Advanced to Arena ${next}: ${ARENAS[next - 1].name}!`, 'success');
    },

    maxSeasonPass() {
        if (!GameData.seasonPass) GameData.seasonPass = { level: 1, progress: 0, claimedRewards: [] };
        GameData.seasonPass.level = 50;
        GameData.seasonPass.progress = 500;
        SaveSystem.save();
        MenuLogic.updateUI();
        if (MenuLogic.renderSeasonPass) MenuLogic.renderSeasonPass();
        Toast.show('Season Pass maxed to Level 50!', 'success');
    },

    fillChests() {
        if (!GameData.chests) GameData.chests = [null, null, null, null];
        if (!GameData.chestRarities) GameData.chestRarities = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            if (!GameData.chests[i]) {
                GameData.chests[i] = Math.random() > 0.5 ? 'gold' : 'silver';
                GameData.chestRarities[i] = Math.floor(Math.random() * 5) + 1;
            }
        }
        SaveSystem.save();
        MenuLogic.updateUI();
        Toast.show('All chest slots filled!', 'success');
    },

    resetProgress() {
        if (confirm('⚠️ ARE YOU SURE? This will permanently DELETE all your progress and restore new game defaults!')) {
            if (confirm('🚨 FINAL WARNING: Click OK to confirm wiping save data.')) {
                GameData = SaveSystem.createNewGameData();
                SaveSystem.save();
                MenuLogic.updateUI();
                MenuLogic.renderCards();
                MenuLogic.closeDebugMenu();
                Toast.show('Progress reset! Reloading...', 'error');
                setTimeout(() => location.reload(), 500);
            }
        }
    }
};
