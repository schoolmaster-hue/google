const Progression = {
    getUpgradeCost(level) {
        return level * 50;
    },

    getUpgradeReq(level) {
        return level * 2;
    },

    getEvoProgress(cardId) {
        return Math.min(6, Math.max(0, GameData.shards[cardId + '_evo'] || 0));
    },

    getLegendProgress(cardId) {
        return Math.min(1, Math.max(0, GameData.shards[cardId] || 0));
    },

    isUnlocked(cardId) {
        const card = CARD_DB[cardId];
        if (!card) return false;
        if (card.isEvo) return !!GameData.evoUnlocked[card.evolvesFrom];
        if (card.type === 'legend') return this.getLegendProgress(cardId) >= 1;
        return (GameData.cardCopies[cardId] || 0) > 0 || (GameData.cardLevels[cardId] || 0) > 0;
    },

    spendEvoShard(cardId, amount = 1) {
        const card = CARD_DB[cardId];
        if (!card?.isEvoBase || !this.isUnlocked(cardId) || GameData.evoUnlocked[cardId]) return false;

        const available = Math.max(0, GameData.shardInventory.evo || 0);
        const current = this.getEvoProgress(cardId);
        const next = Math.min(6, current + Math.min(amount, available));
        const spent = next - current;

        if (spent <= 0) return false;

        GameData.shardInventory.evo = available - spent;
        GameData.shards[cardId + '_evo'] = next;

        if (next >= 6) {
            GameData.evoUnlocked[cardId] = true;
        }

        return true;
    },

    spendLegendShard(cardId, amount = 1) {
        const card = CARD_DB[cardId];
        if (!card || card.type !== 'legend' || GameData.arena < card.arena || this.isUnlocked(cardId)) return false;

        const available = Math.max(0, GameData.shardInventory.legend || 0);
        const current = this.getLegendProgress(cardId);
        const next = Math.min(1, current + Math.min(amount, available));
        const spent = next - current;

        if (spent <= 0) return false;

        GameData.shardInventory.legend = available - spent;
        GameData.shards[cardId] = next;

        if (next >= 1) {
            GameData.cardCopies[cardId] = Math.max(1, GameData.cardCopies[cardId] || 0);
            GameData.cardLevels[cardId] = Math.max(1, GameData.cardLevels[cardId] || 1);
        }

        return true;
    },

    grantReward(type, amount, id) {
        if (type === 'gold') GameData.gold += amount;
        if (type === 'gems') GameData.gems += amount;
        if (type === 'cards') GameData.cardCopies[id] = (GameData.cardCopies[id] || 0) + amount;
        if (type === 'shard' || type === 'legend_shard') {
            GameData.shardInventory.legend = (GameData.shardInventory.legend || 0) + amount;
        }
        if (type === 'evo_shard') {
            GameData.shardInventory.evo = (GameData.shardInventory.evo || 0) + amount;
        }
        if (type === 'wildcard') {
            GameData.wildcards[id] = (GameData.wildcards[id] || 0) + amount;
        }
        if (type === 'emote' && !GameData.unlockedEmotes.includes(id)) GameData.unlockedEmotes.push(id);
    },

    trackQuest(type, amount = 1) {
        let updated = false;
        GameData.quests.forEach((quest) => {
            if (quest.type === type && !quest.claimed && quest.progress < quest.target) {
                quest.progress += amount;
                updated = true;
            }
        });
        if (updated) SaveSystem.save();
    },

    grantSeasonPassProgress(amount = 10) {
        GameData.seasonPass.progress += amount;
        while (GameData.seasonPass.progress >= 100 && GameData.seasonPass.level < 50) {
            GameData.seasonPass.progress -= 100;
            GameData.seasonPass.level++;
        }
        SaveSystem.save();
    },

    generateShop() {
        const availableCards = Object.values(CARD_DB)
            .filter((card) => card.arena <= GameData.arena && !card.isEvoBase && !card.isEvo && card.type !== 'legend')
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);

        GameData.shop.items = availableCards.map((card) => ({
            id: card.id,
            type: 'cards',
            amount: 20,
            cost: 200,
            currency: 'gold'
        }));
    }
};
