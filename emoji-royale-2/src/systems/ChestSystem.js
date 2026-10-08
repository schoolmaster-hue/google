const ChestSystem = {
    activatingChestIndex: -1,
    currentStars: 1,
    maxTaps: 4,
    tapsRemaining: 4,
    isOpening: false,

    // Rarity definitions: 1: Gray (Common), 2: Green (Uncommon), 3: Blue (Rare), 4: Purple (Epic), 5: Gold (Legendary)
    rarityInfo: [
        { name: "Common", bgClass: "tier-1", starCount: 1, chanceToUpgrade: 0.60, color: "#bdc3c7" },
        { name: "Uncommon", bgClass: "tier-2", starCount: 2, chanceToUpgrade: 0.50, color: "#2ecc71" },
        { name: "Rare", bgClass: "tier-3", starCount: 3, chanceToUpgrade: 0.40, color: "#3498db" },
        { name: "Epic", bgClass: "tier-4", starCount: 4, chanceToUpgrade: 0.30, color: "#9b59b6" },
        { name: "Legendary", bgClass: "tier-5", starCount: 5, chanceToUpgrade: 0.00, color: "#f1c40f" }
    ],

    showChestAnimation(index) {
        if (!GameData.chests[index]) return;

        this.activatingChestIndex = index;
        this.currentStars = 1;
        this.tapsRemaining = 4;
        this.isOpening = false;

        const curTierData = this.rarityInfo[0];

        const modal = document.getElementById('chest-unbox-modal');
        if (modal) {
            modal.className = 'screen modal ' + curTierData.bgClass + ' active';
            modal.style.display = 'flex';
        }

        const title = document.getElementById('chest-unbox-title');
        if (title) {
            title.innerText = `${curTierData.name} Gift`;
            title.style.color = curTierData.color;
        }
        
        const hint = document.getElementById('chest-unbox-hint');
        if (hint) hint.innerText = 'Tap gift to upgrade stars! (4 chances left)';

        const emoji = document.getElementById('chest-unbox-emoji');
        if (emoji) {
            emoji.innerText = '🎁';
            emoji.className = 'chest-emoji';
        }

        this.renderStars();
    },

    renderStars() {
        const container = document.getElementById('chest-stars-container');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('div');
            star.className = 'chest-star ' + (i <= this.currentStars ? 'active' : '');
            star.innerHTML = '⭐';
            container.appendChild(star);
        }
    },

    tapChest() {
        if (this.isOpening) return;
        if (this.tapsRemaining <= 0 || this.currentStars >= 5) {
            this.confirmChestOpen();
            return;
        }

        this.tapsRemaining--;
        const emoji = document.getElementById('chest-unbox-emoji');
        if (emoji) {
            emoji.classList.remove('shaking', 'upgraded');
            void emoji.offsetWidth; // trigger reflow
        }

        const curTierData = this.rarityInfo[this.currentStars - 1];
        const upgraded = Math.random() < curTierData.chanceToUpgrade;

        if (upgraded && this.currentStars < 5) {
            this.currentStars++;
            const newTierData = this.rarityInfo[this.currentStars - 1];
            
            const modal = document.getElementById('chest-unbox-modal');
            if (modal) {
                modal.className = 'screen modal ' + newTierData.bgClass + ' active';
                modal.style.display = 'flex';
            }

            const title = document.getElementById('chest-unbox-title');
            if (title) {
                title.innerText = `${newTierData.name} Gift`;
                title.style.color = newTierData.color;
            }

            if (emoji) emoji.classList.add('upgraded');
            if (typeof SoundManager !== 'undefined') SoundManager.play('gem');
        } else {
            if (emoji) emoji.classList.add('shaking');
            if (typeof SoundManager !== 'undefined') SoundManager.play('click');
        }

        this.renderStars();

        const hint = document.getElementById('chest-unbox-hint');
        if (hint) {
            if (this.currentStars >= 5) {
                hint.innerText = '🌟 MAX 5-STAR LEGENDARY REACHED! Tap to open!';
            } else if (this.tapsRemaining > 0) {
                hint.innerText = (upgraded ? '⭐ Upgraded to ' + this.rarityInfo[this.currentStars - 1].name + '! ' : 'Stayed same! ') + '(' + this.tapsRemaining + ' upgrade taps left)';
            } else {
                hint.innerText = 'Tap gift once more to open and explode! 💥';
            }
        }
    },

    confirmChestOpen() {
        if (this.isOpening) return;
        this.isOpening = true;
        
        const emoji = document.getElementById('chest-unbox-emoji');
        if (emoji) {
            emoji.classList.add('shaking');
        }
        if (typeof SoundManager !== 'undefined') SoundManager.play('explosion');

        setTimeout(() => {
            const modal = document.getElementById('chest-unbox-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
            if (typeof SoundManager !== 'undefined') SoundManager.play('chest_open');
            MenuLogic.openChestWithRarity(this.activatingChestIndex, this.currentStars);
        }, 400);
    }
};
