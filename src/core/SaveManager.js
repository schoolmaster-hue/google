const SAVE_STORAGE_KEY = 'emojiRoyale2Save';

const SaveSystem = {
    createNewGameData() {
        return createDefaultGameData();
    },

    serialize(data = GameData) {
        const str = encodeURIComponent(JSON.stringify(data));
        return btoa(str.replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
    },

    deserialize(b64) {
        const str = decodeURIComponent(
            atob(b64)
                .split('')
                .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(str);
    },

    normalizeNumber(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    },

    normalizeObjectNumbers(source = {}) {
        const next = {};
        Object.entries(source || {}).forEach(([key, value]) => {
            next[key] = Math.max(0, this.normalizeNumber(value, 0));
        });
        return next;
    },

    normalizeEmoteCollection(values = []) {
        const ordered = [...DEFAULT_EMOTE_LOADOUT];

        if (Array.isArray(values)) {
            values.forEach((emote) => {
                if (ALL_EMOTES.includes(emote) && !ordered.includes(emote)) {
                    ordered.push(emote);
                }
            });
        }

        return ordered;
    },

    normalizeEquippedEmotes(values = [], unlockedEmotes = DEFAULT_EMOTE_LOADOUT) {
        const sanitized = [];

        if (Array.isArray(values)) {
            values.forEach((emote) => {
                if (ALL_EMOTES.includes(emote) && unlockedEmotes.includes(emote) && !sanitized.includes(emote)) {
                    sanitized.push(emote);
                }
            });
        }

        for (const emote of DEFAULT_EMOTE_LOADOUT) {
            if (sanitized.length >= 4) break;
            if (unlockedEmotes.includes(emote) && !sanitized.includes(emote)) {
                sanitized.push(emote);
            }
        }

        for (const emote of unlockedEmotes) {
            if (sanitized.length >= 4) break;
            if (!sanitized.includes(emote)) {
                sanitized.push(emote);
            }
        }

        while (sanitized.length < 4) {
            sanitized.push(null);
        }

        return sanitized.slice(0, 4);
    },

    normalizeEvoUnlocked(source = {}) {
        const next = {};

        Object.entries(source || {}).forEach(([key, value]) => {
            if (!value) return;

            const card = CARD_DB[key];
            if (card?.isEvo && card.evolvesFrom) {
                next[card.evolvesFrom] = true;
                return;
            }

            next[key] = true;
        });

        return next;
    },

    normalizeGameData(data = {}) {
        const defaults = this.createNewGameData();
        const next = { ...defaults, ...data };

        next.deck = Array.isArray(data.deck) && data.deck.length >= 1 ? [...data.deck] : [...defaults.deck];
        next.casualDeck = Array.isArray(data.casualDeck) && data.casualDeck.length >= 1
            ? [...data.casualDeck]
            : [...defaults.casualDeck];
        next.mode = data.mode || defaults.mode;
        next.evoSlots = Array.isArray(data.evoSlots) ? [...data.evoSlots].slice(0, 2) : [...defaults.evoSlots];
        while (next.evoSlots.length < 2) next.evoSlots.push(null);
        next.legendSlot = data.legendSlot ?? defaults.legendSlot;
        next.cardCopies = { ...defaults.cardCopies, ...this.normalizeObjectNumbers(data.cardCopies) };
        next.cardLevels = { ...defaults.cardLevels, ...this.normalizeObjectNumbers(data.cardLevels) };
        next.shards = this.normalizeObjectNumbers(data.shards);
        next.shardInventory = {
            evo: Math.max(0, this.normalizeNumber(data.shardInventory?.evo, 0)),
            legend: Math.max(0, this.normalizeNumber(data.shardInventory?.legend, 0))
        };
        next.evoUnlocked = this.normalizeEvoUnlocked(data.evoUnlocked);
        next.builtInventory = Array.isArray(data.builtInventory) ? [...data.builtInventory] : [...defaults.builtInventory];
        next.wildcards = {
            ...defaults.wildcards,
            ...this.normalizeObjectNumbers(data.wildcards)
        };
        next.unlockedEmotes = this.normalizeEmoteCollection(data.unlockedEmotes);
        next.equipSlots = this.normalizeEquippedEmotes(data.equipSlots, next.unlockedEmotes);
        next.chests = Array.isArray(data.chests) ? [...data.chests].slice(0, 4) : [...defaults.chests];
        while (next.chests.length < 4) next.chests.push(null);
        next.chestRarities = Array.isArray(data.chestRarities)
            ? data.chestRarities.slice(0, 4).map((value) => Math.max(0, this.normalizeNumber(value, 0)))
            : [...defaults.chestRarities];
        while (next.chestRarities.length < 4) next.chestRarities.push(0);
        next.claimedTrophyRewards = Array.isArray(data.claimedTrophyRewards) ? [...data.claimedTrophyRewards] : [];
        next.seasonPass = { ...defaults.seasonPass, ...(data.seasonPass || {}) };
        next.seasonPass.claimedRewards = Array.isArray(data.seasonPass?.claimedRewards)
            ? [...data.seasonPass.claimedRewards]
            : [...defaults.seasonPass.claimedRewards];
        next.quests = Array.isArray(data.quests)
            ? data.quests.map((quest) => ({ ...quest }))
            : defaults.quests.map((quest) => ({ ...quest }));
        next.shop = { ...defaults.shop, ...(data.shop || {}) };
        next.shop.items = Array.isArray(data.shop?.items) ? [...data.shop.items] : [...defaults.shop.items];
        next.lastSave = data.lastSave || defaults.lastSave;

        return next;
    },

    save() {
        GameData.lastSave = Date.now();
        localStorage.setItem(SAVE_STORAGE_KEY, this.serialize());
    },

    load() {
        try {
            const data = localStorage.getItem(SAVE_STORAGE_KEY);
            if (data) {
                GameData = this.normalizeGameData(this.deserialize(data));
            }
        } catch (error) {
            console.error('Save load failed', error);
        }
    },

    copySave() {
        document.getElementById('save-textarea').value = this.serialize();
        document.getElementById('save-textarea').select();
        document.execCommand('copy');
        Toast.show('Save code copied!', 'success');
    },

    importSave() {
        try {
            const b64 = document.getElementById('save-textarea').value.trim();
            GameData = this.normalizeGameData(this.deserialize(b64));
            this.save();
            MenuLogic.updateUI();
            Toast.show('Save loaded successfully!', 'success');
            MenuLogic.closeSettings();
        } catch (error) {
            Toast.show('Invalid save code.', 'error');
        }
    }
};
