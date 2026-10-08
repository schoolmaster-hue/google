const ALL_EMOTES = [
    '\u{1F602}',
    '\u{1F621}',
    '\u{1F62D}',
    '\u{1F60E}',
    '\u{1F44D}',
    '\u{1F44E}',
    '\u{1F921}',
    '\u{1F971}',
    '\u{1F525}',
    '\u{1F389}'
];

const DEFAULT_EMOTE_LOADOUT = ALL_EMOTES.slice(0, 4);

const DEFAULT_DECK = ['knight', 'archer', 'giant', 'bomber', 'goblin', 'musketeer', 'valkyrie', 'skeleton'];

function createDefaultGameData() {
    return {
        gold: 500,
        gems: 50,
        trophies: 0,
        arena: 1,
        mode: 'trophy_road',
        deck: [...DEFAULT_DECK],
        casualDeck: [...DEFAULT_DECK],
        evoSlots: [null, null],
        legendSlot: null,
        cardCopies: {
            knight: 1,
            archer: 1,
            giant: 1,
            bomber: 1,
            goblin: 1,
            musketeer: 1,
            valkyrie: 1,
            skeleton: 1
        },
        cardLevels: {
            knight: 1,
            archer: 1,
            giant: 1,
            bomber: 1,
            goblin: 1,
            musketeer: 1,
            valkyrie: 1,
            skeleton: 1
        },
        shards: {},
        shardInventory: { evo: 0, legend: 0 },
        evoUnlocked: {},
        builtInventory: [],
        wildcards: { common: 0, rare: 0, epic: 0, legendary: 0 },
        equipSlots: [...DEFAULT_EMOTE_LOADOUT],
        chests: [null, null, null, null],
        chestRarities: [0, 0, 0, 0],
        claimedTrophyRewards: [],
        seasonPass: { level: 1, progress: 0, claimedRewards: [] },
        quests: [
            {
                id: 'q1',
                text: 'Win 3 Matches',
                type: 'win',
                target: 3,
                progress: 0,
                rewardType: 'gems',
                rewardAmount: 10,
                claimed: false
            },
            {
                id: 'q2',
                text: 'Play 10 Cards',
                type: 'play',
                target: 10,
                progress: 0,
                rewardType: 'gold',
                rewardAmount: 150,
                claimed: false
            }
        ],
        unlockedEmotes: [...DEFAULT_EMOTE_LOADOUT],
        shop: { day: 0, items: [] },
        lastSave: Date.now()
    };
}

let GameData = createDefaultGameData();
