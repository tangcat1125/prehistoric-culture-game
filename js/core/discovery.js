/**
 * 史前文明演化 - 角色意外發現與文化演進引擎 (SERENDIPITOUS DISCOVERY & CULTURAL INVENTIONS)
 * 歷史考據：
 *   - 採集意外發現「樹皮纖維很好用」 ➔ 搓繩編織技巧
 *   - 撿石意外發現「尖尖的石頭能割肉」 ➔ 單面打製刮削器
 *   - 撿拾海產意外發現「魚骨與貝殼邊緣能倒勾」 ➔ 骨角器與初生釣具萌芽
 * 學生思考：角色驚喜說出，玩家必須思考點擊收納為技巧！
 */

class DiscoveryManager {
    constructor(game) {
        this.game = game;
        this.taskCounters = {
            GATHER_FRUIT: 0,
            STRIKE_STONE: 0,
            COASTAL_GATHER: 0,
            GATHER_WOOD: 0
        };

        this.unlockedDiscoveries = new Set();
        this.discoveriesData = [];
        this.activeDiscovery = null;

        this.loadDiscoveriesConfig();
    }

    async loadDiscoveriesConfig() {
        try {
            const res = await fetch('data/discoveries.json').then(r => r.json());
            this.discoveriesData = res.discoveries || [];
            if (this.game.renderSkillTree) this.game.renderSkillTree();
        } catch (e) {
            console.warn('Using embedded discoveries config');
            this.discoveriesData = [
                {
                    id: "fiber_discovery",
                    name: "植物纖維搓繩技巧",
                    icon: "🧶",
                    triggerTask: "GATHER_WOOD",
                    triggerCount: 5,
                    discoveryChance: 0.28,
                    speech: "這樹皮剝下來很韌！",
                    title: "💡 意外發現：樹皮的強韌纖維！",
                    story: "先民在森林剝取樟木樹皮時，發現撕下來的細長纖維非常堅韌，用力扯也扯不斷！",
                    question: "先民該如何善用這個偶然的發現？",
                    correctOption: {
                        text: "【收納入技巧】雙手搓捻成細繩，用於綑綁與編織！",
                        effect: "解鎖纖維編織與工具綁定能力"
                    },
                    wrongOption: {
                        text: "當成普通柴火，直接丟進火塘燒掉",
                        feedback: "好可惜！燒掉了就無法發現纖維的妙用了。請再思考看看！"
                    },
                    museumNote: "國立臺灣史前文化博物館考據：史前先民善用葛藤與苧麻纖維搓捻成繩，這是製作複合工具、捆綁手柄與編織漁網的文明基石。"
                },
                {
                    id: "sharp_stone_discovery",
                    name: "單面打製刮削石器",
                    icon: "🔪",
                    triggerTask: "STRIKE_STONE",
                    triggerCount: 6,
                    discoveryChance: 0.24,
                    speech: "碎石頭的邊緣好尖銳！",
                    title: "💡 意外發現：尖尖的石頭很好用！",
                    story: "在海灘敲碎硬礫石時，崩落的一塊小石片邊緣異常銳利，手指一碰就能割開獸皮與魚肉！",
                    question: "尖尖的石頭可以怎麼用？",
                    correctOption: {
                        text: "【收納入技巧】保留鋒利石片，當成割肉刮皮工具！",
                        effect: "解鎖刮削器技巧，石器生產效率大幅提升"
                    },
                    wrongOption: {
                        text: "敲碎的小石頭太危險了，踢進海裡",
                        feedback: "尖銳石片正是最早的工具雛形！請重新收納這項技巧！"
                    },
                    museumNote: "國立臺灣史前文化博物館考據：八仙洞遺址出土了大量的單面打製偏峰砍砸器與刮削石片器，正是先民利用碎石尖角處理獵物皮肉的智慧結晶。"
                },
                {
                    id: "bone_hook_discovery",
                    name: "骨角器與初生釣具",
                    icon: "🪝",
                    triggerTask: "COASTAL_GATHER",
                    triggerCount: 7,
                    discoveryChance: 0.20,
                    speech: "彎曲的魚骨能勾住肉！",
                    title: "💡 意外發現：貝殼與魚骨做成釣具！",
                    story: "在潮間帶清理海魚與厚貝殼時，發現彎曲的硬骨恰好能倒勾住肉塊，貝殼邊緣也十分鋒利！",
                    question: "魚骨與銳利貝殼可以怎麼用？",
                    correctOption: {
                        text: "【收納入技巧】磨出倒鉤並綁上纖維繩，嘗試主動垂釣！",
                        effect: "解鎖初生骨釣具，海洋採集量顯著提升"
                    },
                    wrongOption: {
                        text: "吃剩的魚骨貝殼沒有用了，隨手丟棄",
                        feedback: "魚骨和貝殼能製作出精巧的骨角器與魚鉤！請重新想想看！"
                    },
                    museumNote: "國立臺灣史前文化博物館考據：臺灣史前遺址出土豐富的磨製骨角器與骨魚鉤，標誌著先民從被動潮間帶撿拾走向主動垂釣深水魚類的偉大飛躍。"
                }
            ];
            if (this.game.renderSkillTree) this.game.renderSkillTree();
        }
    }

    // 任務完成時檢查是否觸發意外發明
    onTaskCompleted(taskType, worker) {
        // 一次只處理一張發現卡，避免多人同時完成工作時連續跳卡。
        if (this.activeDiscovery) return;
        // 角色已有尚未回報的發現時，先保留這張線索，不覆蓋玩家還沒閱讀的內容。
        if (worker?.pendingDiscoveryId) return;
        if (!this.taskCounters[taskType]) this.taskCounters[taskType] = 0;
        this.taskCounters[taskType]++;

        // 檢查是否有對應未解鎖的意外發現
        const candidate = this.discoveriesData.find(d => 
            (Array.isArray(d.triggerTask) ? d.triggerTask.includes(taskType) : d.triggerTask === taskType) && 
            this.taskCounters[taskType] >= d.triggerCount && 
            !this.unlockedDiscoveries.has(d.id) &&
            !this.game.characters.some(char => char.pendingDiscoveryId === d.id) &&
            this.meetsRequirements(d, worker)
        );

        // 達到門檻後仍然只是「有機會」發現，不是每次工作都必然發現。
        const chance = candidate ? (candidate.discoveryChance ?? 0.22) : 0;
        if (candidate && Math.random() < chance) {
            this.triggerDiscoveryEvent(candidate, worker);
        }
    }

    getPendingReportDiscovery(worker) {
        if (!worker || !worker.pendingDiscoveryId) return null;
        return this.discoveriesData.find(item => item.id === worker.pendingDiscoveryId) || null;
    }

    meetsRequirements(discovery, worker) {
        // 研究選錯後，該族人需要整理三個回合；期間不會再觸發新的研究線索。
        if (worker && worker.researchCooldownRounds > 0) return false;
        const living = this.game.characters.filter(c => c.isAlive);
        if (discovery.requiresPopulation && living.length < discovery.requiresPopulation) return false;
        if (discovery.requiresDiscoveries && !discovery.requiresDiscoveries.every(id => this.unlockedDiscoveries.has(id))) return false;
        if (discovery.requiresResources) {
            for (const [key, amount] of Object.entries(discovery.requiresResources)) {
                if ((this.game.resources[key] || 0) < amount) return false;
            }
        }
        if (discovery.requiresFemaleElderPair) {
            const elderFemale = living.find(c => c.id === 'elder_f' && c.age_stage === 'elder' && c.currentTask === 'COASTAL_GATHER');
            if (!elderFemale || !worker || worker.gender !== 'FEMALE' || worker.id === elderFemale.id || worker.currentTask !== 'COASTAL_GATHER') return false;
        }
        return true;
    }

    triggerDiscoveryEvent(discovery, worker) {
        // 發現先掛在角色身上，等角色在回報時搖晃提示，讓玩家閱讀故事後再做選擇。
        worker.pendingDiscoveryId = discovery.id;
        worker.hasDiscoveryBulb = true;

        // 1. 角色頭頂浮現 💡 燈泡
        worker.hasDiscoveryBulb = true;
        worker.say(discovery.speech, "💡", 200);

        // 2. 音效提醒
        this.game.sound.playTone(587.33, 'triangle', 0.2, 0.25);
        this.game.sound.playTone(880, 'sine', 0.25, 0.3);

        this.game.showToast(`💡【${worker.name}】在勞動中有了一個驚人的意外發現！點擊查看！`);

        setTimeout(() => { worker.hasDiscoveryBulb = false; }, 1200);
    }

    showDiscoveryModal(discovery, worker) {
        const modal = document.getElementById('modal-discovery');
        if (!modal) return;

        document.getElementById('disc-title').innerText = discovery.title;
        document.getElementById('disc-worker-quote').innerText = `「${discovery.speech}」—— ${worker.name}`;
        document.getElementById('disc-story').innerText = discovery.story;
        document.getElementById('disc-question').innerText = discovery.question;
        document.getElementById('disc-correct-text').innerText = discovery.correctOption.text;
        document.getElementById('disc-wrong-text').innerText = discovery.wrongOption.text;
        document.getElementById('disc-museum-note').innerText = discovery.museumNote;

        modal.style.display = 'flex';
    }

    // 玩家選擇收納入技巧 (正確發明)
    chooseCorrectOption() {
        if (!this.activeDiscovery) return;
        const disc = this.activeDiscovery;

        this.unlockedDiscoveries.add(disc.id);
        if (this.activeWorker && this.activeWorker.discoveryBonuses) {
            this.activeWorker.discoveryBonuses.add(disc.id);
        }
        // 發現是部族共同技術，收納後讓所有可工作的族人都能受益。
        this.game.characters.filter(c => c.isAlive).forEach(c => {
            if (c.discoveryBonuses) c.discoveryBonuses.add(disc.id);
        });
        if (this.game.registerTechnologyDiscovery) this.game.registerTechnologyDiscovery(disc.id);
        this.game.sound.playEvolutionFanfare();

        // 關閉彈窗
        this.closeDiscoveryModal();

        // 彈出文化突破慶祝 Toast
        this.game.showToast(`✨ 文化大進展！部族成功收納【${disc.name}】！${disc.correctOption.effect}`);

        // 在畫面上記錄已收納技能
        const listEl = document.getElementById('discovered-skills-list');
        if (listEl) {
            const tag = document.createElement('span');
            tag.className = "paper-tag text-xs font-black text-amber-900 bg-amber-100 border-amber-300";
            tag.innerText = `${disc.icon} ${disc.name}`;
            listEl.appendChild(tag);
        }
        if (this.game.renderSkillTree) this.game.renderSkillTree();
    }

    // 玩家選擇丟棄或忽略
    chooseWrongOption() {
        if (!this.activeDiscovery) return;
        this.game.sound.playTone(220, 'sawtooth', 0.2, 0.2);
        this.game.showToast(this.activeDiscovery.wrongOption.feedback);
    }

    closeDiscoveryModal() {
        const modal = document.getElementById('modal-discovery');
        if (modal) modal.style.display = 'none';
        this.activeDiscovery = null;
        this.activeWorker = null;
    }
}

window.DiscoveryManager = DiscoveryManager;
