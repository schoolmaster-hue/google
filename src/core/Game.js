const Game = {
    getBattleDeck() {
        const isCasual = GameData.mode === 'casual';
        const activeDeck = isCasual ? GameData.casualDeck : GameData.deck;

        if (isCasual) {
            return [...activeDeck];
        }

        return [
            ...GameData.evoSlots.filter((slot) => slot !== null),
            ...(GameData.legendSlot ? [GameData.legendSlot] : []),
            ...activeDeck
        ];
    },

    init() {
        if (typeof SoundManager !== "undefined") {
            SoundManager.init();
            SoundManager.resume();
            SoundManager.playMusic("menu");
        }

        setTimeout(() => {
            document.getElementById('loading-bar-fill').style.width = '100%';
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('menu-screen').classList.add('active');
                    MenuLogic.init();
                    if (typeof SoundManager !== "undefined") {
                        SoundManager.resume();
                        SoundManager.playMusic("menu");
                    }
                }, 500);
            }, 500);
        }, 1500);

        Battle.init();
    },

    startBattle(previewCardId = null) {
        const bottomNav = document.querySelector('.bottom-nav');
        bottomNav.classList.add('hidden');
        document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));

        if (!previewCardId) {
            const totalCards = this.getBattleDeck().length;

            if (totalCards < 8) {
                Toast.show(
                    `Your deck needs 8 cards to battle! You currently have ${totalCards} cards.`,
                    'error'
                );
                bottomNav.classList.remove('hidden');
                document.getElementById('menu-screen').classList.add('active');
                return;
            }

            const preLoad = document.getElementById('pre-battle-loading');
            preLoad.style.display = 'flex';
            setTimeout(() => {
                preLoad.style.display = 'none';
                document.getElementById('battle-screen').classList.add('active');
                Battle.start(previewCardId);
                if (typeof SoundManager !== "undefined") SoundManager.playMusic("battle");
            }, 1800);
            return;
        }

        document.getElementById('battle-screen').classList.add('active');
        Battle.start(previewCardId);
    },

    endBattleToMenu() {
        const bottomNav = document.querySelector('.bottom-nav');
        document.getElementById('match-end-screen').style.display = 'none';
        bottomNav.classList.remove('hidden');
        document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
        document.getElementById('menu-screen').classList.add('active');
        MenuLogic.updateUI();
        if (typeof SoundManager !== "undefined") SoundManager.playMusic("menu");
    }
};

window.onload = Game.init;
