/**
 * 史前文明演化 - 主遊戲模擬引擎 (GameEngine)
 * 具備：探勘選家系統、高回饋採集數值、存糧直接繁衍人口、意外火苗與文明躍遷
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundFX();

        // 廣闊世界地圖 (2400 x 1800)
        this.worldWidth = 2400;
        this.worldHeight = 1800;

        // 相機視角
        this.camera = { x: 120, y: 150 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.dragDist = 0;

        // 遊戲階段：'SITE_SELECTION' (探勘選家階段) ➔ 'SETTLED' (定居生存階段)
        this.gamePhase = 'SITE_SELECTION';

        // 當前時代 (0: 舊石器未有火, 1: 掌握用火與巨獸, 2: 卑南新石器, 3: 十三行金屬器)
        this.currentEra = 0;
        this.hasDiscoveredFire = false;

        // 庫存資源 (高回饋數值)
        this.resources = {
            cookedFood: 0,  // 熟食 (火之掌握核心)
            rawFood: 6,     // 生鮮 (野果、生肉、鮮魚)
            dryGrass: 0,    // 乾燥枯草茅草 (引燃火苗的助燃物)
            stone: 2,       // 硬礫石材
            stoneTools: 0,  // 打製石斧/石刀
            wood: 0,        // 砍伐原木
            crop: 0,        // 小米
            pottery: 0,     // 陶罐
            jade: 0,        // 人獸形玉飾
            iron: 0,        // 鐵器
            trade: 0        // 海外珍寶
        };

        // 人口與存糧繁衍系統 (食物達成一定，人口增加！)
        this.tribeMembers = [];
        this.maxPopulation = 7; // 八仙洞上限為 7
        this.foodForNextPop = 10; // 繁衍所需存糧門檻
        this.foodProgress = 0;
        this.selectedMember = null;

        // 特效與粒子
        this.clickMarkers = [];
        this.sparks = [];
        this.floatingTexts = [];

        // 候選定居點 (選家階段)
        this.siteCandidates = [];

        // 地景設施與基地
        this.objects = [];
        this.homeBase = { x: 380, y: 260, name: "八仙洞海崖洞穴" };

        // 生態動物
        this.wildBoars = [];
        this.bigFishes = [];

        this.toastTimer = null;

        this.initSiteSelection();
        this.initTribe();
        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.updateHUD();
        this.updateQuestList();

        // 開局故事導引提示
        setTimeout(() => {
            this.showToast("🏕️ 故事起點：一群古先民抵達海崖邊，請點擊【八仙洞海崖洞穴】選定為最初的家園！");
        }, 600);

        requestAnimationFrame(this.loop.bind(this));
    }

    // 初始化選家候選點
    initSiteSelection() {
        this.siteCandidates = [
            new SiteCandidate(
                'forest', 1150, 650, '內陸幽暗密林', 'FOREST', false,
                "❌ 密林幽暗，多猛獸出沒且潮濕難耐，無天然洞穴庇護，不適合做為最初的家園！"
            ),
            new SiteCandidate(
                'beach', 460, 850, '開闊濱海沙灘', 'BEACH', false,
                "❌ 空曠沙灘無遮風擋雨之所，太平洋狂風大浪易侵襲，危險萬分！"
            ),
            new SiteCandidate(
                'cave', 380, 260, '海崖天然海蝕岩洞 (八仙洞)', 'CAVE', true,
                "⭐ 天然海蝕岩洞！背風、遮風避雨、面海便於取水捕魚，是天賜的絕佳家園！"
            )
        ];
    }

    // 初始化 3 位流浪先民
    initTribe() {
        this.tribeMembers = [
            new TribeMember(0, 360, 420, "阿岩", true),  // 首領
            new TribeMember(1, 410, 430, "鹿兒", false), // 採集
            new TribeMember(2, 380, 460, "小火", false)  // 少年
        ];
        this.tribeMembers[0].say("我們跋山涉水來到海崖邊，快找個好地方安家！", "🏕️", 220);
    }

    // 定居後正式建立世界設施節點
    initSettledWorld() {
        this.objects = [
            // 八仙洞基地
            new WorldObject({
                id: 'baxian_cave', name: '八仙洞海崖洞穴', type: 'CAVE',
                x: 380, y: 260, radius: 95, minEra: 0,
                prompt: '部族家園基地 (物資匯集入庫點)', action: 'REST'
            }),
            // 營火 (未點燃，等敲石引火)
            new WorldObject({
                id: 'cave_campfire', name: '八仙洞營火', type: 'CAMPFIRE',
                x: 440, y: 360, radius: 55, minEra: 0,
                isLit: false,
                prompt: '營火堆 (敲石引燃後可烹烤熟食)', action: 'COOK'
            }),
            // 天然礫石灘 (敲擊石頭、摩擦火苗)
            new WorldObject({
                id: 'quarry_pebbles', name: '天然礫石灘', type: 'PEBBLES',
                x: 780, y: 280, radius: 65, minEra: 0,
                prompt: '敲擊石頭 (摩擦打擊，尋求火苗與石斧)', action: 'STRIKE_STONE'
            }),
            // 野果灌木叢 (採集野果與乾燥枯草)
            new WorldObject({
                id: 'fruit_bush_1', name: '野果灌木林 A', type: 'BUSH',
                x: 1220, y: 300, radius: 55, minEra: 0,
                prompt: '採集野果充飢與拾取乾燥茅草枯枝', action: 'FORAGE'
            }),
            new WorldObject({
                id: 'fruit_bush_2', name: '野果灌木林 B', type: 'BUSH',
                x: 1680, y: 460, radius: 55, minEra: 0,
                prompt: '採集野果充飢與拾取乾燥茅草枯枝', action: 'FORAGE'
            }),
            // 巨樟樹 (有火與精製石器後砍伐)
            new WorldObject({
                id: 'tall_tree_1', name: '古老巨樟木 A', type: 'TALL_TREE',
                x: 1450, y: 380, radius: 60, minEra: 1,
                prompt: '以精製石斧砍伐大樹獲得木材', action: 'CHOP_TREE'
            }),
            new WorldObject({
                id: 'tall_tree_2', name: '古老巨樟木 B', type: 'TALL_TREE',
                x: 1850, y: 680, radius: 60, minEra: 1,
                prompt: '以精製石斧砍伐大樹獲得木材', action: 'CHOP_TREE'
            }),
            // 卑南石板屋聚落
            new WorldObject({
                id: 'beinan_slate_house', name: '卑南石板屋', type: 'SLATE_HOUSE',
                x: 980, y: 720, radius: 75, minEra: 2,
                prompt: '定居生活與照料家畜 (提升人口上限)', action: 'REST'
            }),
            new WorldObject({
                id: 'clay_pottery_kiln', name: '泥土製陶作坊', type: 'POTTERY_KILN',
                x: 780, y: 860, radius: 60, minEra: 2,
                prompt: '燒製泥土印紋陶罐 (儲存與熬煮糧食)', action: 'MAKE_POTTERY'
            }),
            new WorldObject({
                id: 'beinan_farmland', name: '金色小米田', type: 'FARMLAND',
                x: 1220, y: 840, radius: 70, minEra: 2,
                prompt: '磨製石刀收割黃金小米', action: 'HARVEST_CROP'
            }),
            new WorldObject({
                id: 'fengtian_jade', name: '花蓮豐田玉工坊', type: 'JADE_WORKSHOP',
                x: 1460, y: 720, radius: 60, minEra: 2,
                prompt: '琢磨國寶「人獸形玉質耳飾」', action: 'CRAFT_JADE'
            }),
            // 十三行干欄與高爐
            new WorldObject({
                id: 'stilt_house', name: '十三行架高干欄建築', type: 'STILT_HOUSE',
                x: 950, y: 1220, radius: 80, minEra: 3,
                prompt: '巡視防潮避獸架高干欄建築', action: 'REST'
            }),
            new WorldObject({
                id: 'blast_iron_furnace', name: '十三行高溫煉鐵高爐', type: 'IRON_FURNACE',
                x: 1280, y: 1220, radius: 70, minEra: 3,
                prompt: '高溫鼓風冶鐵 (打造鐵鋤與鐵刀)', action: 'SMELT_IRON'
            }),
            new WorldObject({
                id: 'coastal_dock', name: '淡水河口跨海貿易碼頭', type: 'TRADE_DOCK',
                x: 480, y: 1480, radius: 85, minEra: 3,
                prompt: '跨海貿易 (以特產換回外來玻璃環與瑪瑙珠飾)', action: 'TRADE'
            })
        ];

        this.wildBoars = [
            new WildBoar(1550, 520),
            new WildBoar(1950, 620)
        ];

        this.bigFishes = [
            new BigSeaFish(260, 780),
            new BigSeaFish(500, 1150)
        ];
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 全畫面觸碰/點擊派遣機制 (完全無搖桿)
    initInput() {
        const c = this.canvas;

        c.addEventListener('pointerdown', (e) => {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.dragDist = 0;
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                this.dragDist += Math.hypot(dx, dy);

                this.camera.x -= dx;
                this.camera.y -= dy;
                this.camera.x = Math.max(0, Math.min(this.worldWidth - this.canvas.width, this.camera.x));
                this.camera.y = Math.max(0, Math.min(this.worldHeight - this.canvas.height, this.camera.y));

                this.panStart = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (this.isPanning && this.dragDist < 8) {
                this.handleClickWorld(e.clientX, e.clientY);
            }
            this.isPanning = false;
        });

        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.y += e.deltaY * 0.5;
            this.camera.y = Math.max(0, Math.min(this.worldHeight - this.canvas.height, this.camera.y));
        }, { passive: false });
    }

    // 點擊地點處理
    handleClickWorld(clientX, clientY) {
        const worldX = clientX + this.camera.x;
        const worldY = clientY + this.camera.y;

        // 【階段一】：探勘選家階段 (Site Selection Phase)
        if (this.gamePhase === 'SITE_SELECTION') {
            for (let candidate of this.siteCandidates) {
                if (Math.hypot(worldX - candidate.x, worldY - candidate.y) < candidate.radius + 15) {
                    this.clickMarkers.push(new ClickMarker(candidate.x, candidate.y, true));
                    this.handleInspectCandidate(candidate);
                    return;
                }
            }
            // 點擊其他地面提示
            this.showToast("🏕️ 請點擊地圖上的候選圓圈，探勘並選定八仙洞為家！");
            return;
        }

        // 【階段二】：定居生存階段 (Settled Simulation Phase)

        // 1. 檢查是否點擊特定族人 (選中該族人)
        for (let m of this.tribeMembers) {
            if (m.alive && Math.hypot(worldX - m.x, worldY - m.y) < 32) {
                this.selectedMember = m;
                m.jump();
                this.sound.playTone(660, 'sine', 0.15, 0.2);
                m.say(`我是${m.name}！請指示我工作地點！`, "🙋", 150);
                this.spawnFloatingText(`選中 ${m.name}`, m.x, m.y - 50, "#38bdf8");
                return;
            }
        }

        // 2. 檢查是否點擊自然資源節點
        let clickedNode = null;
        for (let obj of this.objects) {
            if (this.currentEra >= obj.minEra) {
                if (Math.hypot(worldX - obj.x, worldY - obj.y) < obj.radius + 15) {
                    clickedNode = obj;
                    break;
                }
            }
        }

        // 3. 檢查是否點擊巨型野山豬 (狩獵)
        if (!clickedNode && this.currentEra >= 1) {
            for (let boar of this.wildBoars) {
                if (boar.alive && Math.hypot(worldX - boar.x, worldY - boar.y) < boar.radius + 15) {
                    clickedNode = { name: "巨型野山豬", x: boar.x, y: boar.y, radius: boar.radius, action: 'HUNT_BOAR' };
                    break;
                }
            }
        }

        // 4. 檢查是否點擊近海大魚 (捕魚)
        if (!clickedNode) {
            for (let fish of this.bigFishes) {
                if (Math.hypot(worldX - fish.x, worldY - fish.y) < fish.radius + 15) {
                    clickedNode = { name: "近海大魚", x: fish.x, y: fish.y, radius: fish.radius, action: 'FISH' };
                    break;
                }
            }
        }

        if (clickedNode) {
            // 點擊了工作節點：派遣小人前往！
            this.clickMarkers.push(new ClickMarker(clickedNode.x, clickedNode.y, true));
            this.sound.playTone(587.33, 'triangle', 0.12, 0.15);

            let worker = this.selectedMember;
            if (!worker || !worker.alive) {
                worker = this.findBestIdleWorker(clickedNode.x, clickedNode.y);
            }

            if (worker) {
                worker.assignTask(clickedNode);
                this.spawnFloatingText(`派遣 ${worker.name} ➔ ${clickedNode.name}`, clickedNode.x, clickedNode.y - 40, "#ffd166");
                this.selectedMember = null;
            } else {
                this.showToast("所有族人都在忙碌工作中！可點選特定族人重新指派。");
            }
        } else {
            // 點擊了空曠地面
            this.clickMarkers.push(new ClickMarker(worldX, worldY, false));
            this.sound.playTone(493.88, 'sine', 0.06, 0.08);

            if (this.selectedMember) {
                this.selectedMember.assignTask({ x: worldX, y: worldY, radius: 10, action: 'REST', name: '指定地點' }, "跑步前往指定地點！", "👟");
                this.selectedMember = null;
            }
        }
    }

    // 探勘選家處理 (真實體驗選家決策！)
    handleInspectCandidate(candidate) {
        if (!candidate.isBest) {
            // 不適合的候選點
            this.sound.playTone(220, 'square', 0.25, 0.15);
            this.showToast(candidate.description);
            for (let m of this.tribeMembers) {
                m.say("這裡風浪大又危險，不適合安家！", "❌", 160);
            }
        } else {
            // 選中八仙洞海崖洞穴！天賜家園！
            this.sound.playEvolutionFanfare();
            this.gamePhase = 'SETTLED';
            this.initSettledWorld();

            // 族人歡呼前往八仙洞安家！
            for (let m of this.tribeMembers) {
                m.jump();
                m.x = 380 + (Math.random() - 0.5) * 40;
                m.y = 300 + (Math.random() - 0.5) * 40;
                m.say("太棒了！天然海蝕岩洞能遮風避雨，我們在此安家！", "🎉", 220);
            }

            // 完成選家任務
            const task = ERAS[0].tasks.find(t => t.id === 'choose_home');
            if (task) task.current = 1;

            this.showToast("🏆 成功選家！在【長濱八仙洞海崖岩洞】建立部族家園！開始採集與敲石！");
            this.updateHUD();
            this.updateQuestList();
        }
    }

    // 尋找最適宜的空閒族人
    findBestIdleWorker(x, y) {
        let best = null;
        let minD = Infinity;
        for (let m of this.tribeMembers) {
            if (m.alive && m.state === 'IDLE') {
                const d = Math.hypot(x - m.x, y - m.y);
                if (d < minD) { minD = d; best = m; }
            }
        }
        if (!best) {
            for (let m of this.tribeMembers) {
                if (m.alive && m.state !== 'RETURNING_HOME') {
                    const d = Math.hypot(x - m.x, y - m.y);
                    if (d < minD) { minD = d; best = m; }
                }
            }
        }
        return best;
    }

    // 族人物資入庫回調 (高回饋結算、存糧繁衍與任務推進)
    handleWorkerDeposit(carrying, worker) {
        const r = this.resources;

        // 入庫高回饋數值
        if (carrying.type === 'stone') {
            r.stone += carrying.amount;
            if (carrying.subType === 'stoneTool') r.stoneTools += carrying.subAmount;
            this.spawnFloatingText(`+${carrying.amount} 硬礫石材`, worker.x, worker.y - 30, "#cbd5e1");
            this.spawnFloatingText(`+${carrying.subAmount} 打製石器`, worker.x, worker.y - 50, "#93c5fd");
            this.handleStoneStrikeSparks(worker.x, worker.y);
        } else if (carrying.type === 'rawFood') {
            r.rawFood += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 生鮮食材`, worker.x, worker.y - 30, "#ef4444");
            if (carrying.subType === 'dryGrass') {
                r.dryGrass += carrying.subAmount;
                this.spawnFloatingText(`+${carrying.subAmount} 乾燥茅草`, worker.x, worker.y - 50, "#fde047");
                const task = ERAS[0].tasks.find(t => t.id === 'gather_bushes');
                if (task) task.current += carrying.amount;
            }
        } else if (carrying.type === 'cookedFood') {
            r.cookedFood += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 噴香熟肉`, worker.x, worker.y - 30, "#f97316");
            const task = ERAS[1]?.tasks.find(t => t.id === 'cook_meals');
            if (task) task.current += carrying.amount;
        } else if (carrying.type === 'wood') {
            r.wood += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 堅實原木`, worker.x, worker.y - 30, "#a16207");
            const task = ERAS[1]?.tasks.find(t => t.id === 'chop_big_trees');
            if (task) task.current += carrying.amount;
        } else if (carrying.type === 'crop') {
            r.crop += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 黃金小米`, worker.x, worker.y - 30, "#facc15");
            const task = ERAS[2]?.tasks.find(t => t.id === 'harvest_millet');
            if (task) task.current += carrying.amount;
        } else if (carrying.type === 'pottery') {
            r.pottery += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 印紋陶罐`, worker.x, worker.y - 30, "#ea580c");
            const task = ERAS[2]?.tasks.find(t => t.id === 'make_pottery');
            if (task) task.current += carrying.amount;
        } else if (carrying.type === 'jade') {
            r.jade += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 人獸形玉玦`, worker.x, worker.y - 30, "#34d399");
            const task = ERAS[2]?.tasks.find(t => t.id === 'craft_jade_earring');
            if (task) task.current += carrying.amount;
        } else if (carrying.type === 'iron') {
            r.iron += carrying.amount;
            this.spawnFloatingText(`+${carrying.amount} 鍛造鐵器`, worker.x, worker.y - 30, "#f97316");
            const task = ERAS[3]?.tasks.find(t => t.id === 'smelt_iron_tools');
            if (task) task.current += carrying.amount;
        }

        // 【核心機制】：食物達成一定，人口增加！
        this.checkFoodPopulationGrowth();

        this.updateHUD();
        this.updateQuestList();
    }

    // 食物達成一定門檻，立即繁衍誕生新族人！
    checkFoodPopulationGrowth() {
        const livingPop = this.tribeMembers.filter(m => m.alive).length;
        if (livingPop >= this.maxPopulation) return;

        // 在尚未掌握火的時期：生鮮野果達到門檻繁衍/迎來同伴
        // 在掌握火後：營火熟肉達到門檻繁衍新生兒！
        let currentFoodForPop = this.currentEra >= 1 ? this.resources.cookedFood : this.resources.rawFood;

        if (currentFoodForPop >= this.foodForNextPop) {
            // 扣除繁衍食物消耗
            if (this.currentEra >= 1) {
                this.resources.cookedFood -= this.foodForNextPop;
            } else {
                this.resources.rawFood -= this.foodForNextPop;
            }

            // 誕生新族人！
            const newId = this.tribeMembers.length;
            const newName = TRIBE_NAMES[newId % TRIBE_NAMES.length];
            const baby = new TribeMember(newId, this.homeBase.x + (Math.random() - 0.5) * 35, this.homeBase.y + 35, newName, false);
            this.tribeMembers.push(baby);

            this.sound.playEvolutionFanfare();
            this.showToast(`🎉 存糧充足！新族人【${newName}】加入部族！部族人口增長至 ${livingPop + 1} 人！`);
            baby.jump();
            baby.say("存糧豐盈，我在溫暖的部族中長大了！加入勞動！", "👶", 220);

            // 更新時代人口任務
            const era = ERAS[this.currentEra];
            const popTask = era.tasks.find(t => t.id.includes('pop'));
            if (popTask) popTask.current = livingPop + 1;

            // 下一次人口門檻微調提升 (10 ➔ 12 ➔ 14)
            this.foodForNextPop = Math.min(20, this.foodForNextPop + 2);
        }
    }

    // 敲石引發火苗核心檢測 (不小心碰出火星！)
    handleStoneStrikeSparks(x, y) {
        for (let i = 0; i < 6; i++) {
            this.sparks.push(new SparkParticle(x, y, false));
        }

        if (this.currentEra === 0 && !this.hasDiscoveredFire) {
            const taskStrike = ERAS[0].tasks.find(t => t.id === 'strike_pebbles');
            if (taskStrike) {
                taskStrike.current++;
                this.updateQuestList();

                // 當乾草枯枝充足且敲石達到 6 次以上，意外引發天降神火！
                if (taskStrike.current >= 6 && this.resources.dryGrass >= 4) {
                    this.triggerFireDiscovery(x, y);
                }
            }
        }
    }

    // 觸發火苗誕生奇蹟
    triggerFireDiscovery(x, y) {
        this.hasDiscoveredFire = true;
        this.sound.playEvolutionFanfare();

        // 噴發漫天絢麗火星！
        for (let i = 0; i < 45; i++) {
            this.sparks.push(new SparkParticle(x, y, true));
        }

        // 點燃營火！
        const campfire = this.objects.find(o => o.type === 'CAMPFIRE');
        if (campfire) campfire.isLit = true;

        for (let m of this.tribeMembers) {
            m.jump();
            m.say("🔥 出現火苗了！我們意外發現火了！", "🎉", 240);
        }

        document.getElementById('m-evo-icon').innerText = "🔥";
        document.getElementById('m-evo-title').innerText = "文明奇蹟：意外引燃第一簇火苗！";
        document.getElementById('m-evo-subtitle').innerText = "舊石器時代人類掌握火的劃時代突破";
        document.getElementById('m-evo-card').innerHTML = `
            <h4>📍 長濱八仙洞海崖的驚世奇蹟</h4>
            <p>在猛烈敲打硬質礫石製作石器時，飛濺的高溫火星不小心落入了曬乾的枯枝茅草中，冒出陣陣青煙，隨即綻放出<strong>人類文明的第一道火苗</strong>！</p>
            <ul>
                <li>🔥 <strong>八仙洞營火升起</strong>：夜晚不再寒冷黑暗，野獸不敢靠近岩洞。</li>
                <li>🍖 <strong>告別生食</strong>：烤熟獵物更易吸收營養，族人壽命大幅延長，<strong>存糧將快速繁衍新生兒</strong>！</li>
                <li>🪓 <strong>精製石矛與砍樹</strong>：能精製出尖銳石器，解鎖<strong>砍伐巨樹</strong>、獵捕<strong>巨型野山豬</strong>與近海捕大魚！</li>
            </ul>
        `;
        document.getElementById('modal-evolution').style.display = 'flex';

        this.currentEra = 1;
        this.updateHUD();
        this.updateQuestList();
        this.showToast("🔥 奇蹟降臨！火苗誕生，進入【舊石器成熟期：用火與巨獸時代】！");
    }

    // 時代進化躍遷
    triggerEvolution() {
        if (this.currentEra >= ERAS.length - 1) return;

        this.currentEra++;
        this.sound.playEvolutionFanfare();

        const eraData = ERAS[this.currentEra];
        document.getElementById('m-evo-icon').innerText = eraData.badgeIcon;
        document.getElementById('m-evo-title').innerText = `文明躍遷：${eraData.name}`;
        document.getElementById('m-evo-subtitle').innerText = eraData.period;
        document.getElementById('m-evo-card').innerHTML = eraData.historyDesc;
        document.getElementById('modal-evolution').style.display = 'flex';

        if (this.currentEra === 2) {
            this.maxPopulation = 12;
            this.homeBase = { x: 980, y: 720, name: "卑南石板屋" };
            this.camera = { x: 700, y: 550 };
            for (let m of this.tribeMembers) {
                m.say("走出洞穴定居！歡迎來到卑南石板屋聚落！", "🏺", 200);
            }
        } else if (this.currentEra === 3) {
            this.maxPopulation = 18;
            this.homeBase = { x: 950, y: 1220, name: "十三行干欄屋" };
            this.camera = { x: 650, y: 1000 };
            for (let m of this.tribeMembers) {
                m.say("高溫煉鐵與外貿！十三行水陸大港繁榮昌盛！", "⚒️", 200);
            }
        }

        this.updateHUD();
        this.updateQuestList();
        this.showToast(`🎉 恭喜！跨入【${eraData.name}】！`);
    }

    closeEvolutionModal() { document.getElementById('modal-evolution').style.display = 'none'; }
    openHistoryModal() { document.getElementById('modal-history').style.display = 'flex'; }
    closeHistoryModal() { document.getElementById('modal-history').style.display = 'none'; }
    toggleQuestPanel() {
        const list = document.getElementById('quest-list');
        list.style.display = list.style.display === 'none' ? 'flex' : 'none';
    }
    toggleSound() {
        this.sound.enabled = !this.sound.enabled;
        document.getElementById('btn-sound').innerHTML = this.sound.enabled ? '<span>🔊 音效: 開</span>' : '<span>🔇 音效: 關</span>';
    }

    checkEvolutionReadiness() {
        const era = ERAS[this.currentEra];
        const allDone = era.tasks.every(t => t.current >= t.target);
        const btnEvolve = document.getElementById('btn-evolve');
        if (allDone && this.currentEra < ERAS.length - 1) {
            btnEvolve.classList.remove('hidden');
        } else {
            btnEvolve.classList.add('hidden');
        }
    }

    // 更新頂部 HUD 與存糧繁衍進度
    updateHUD() {
        const era = ERAS[this.currentEra];
        const badge = document.getElementById('era-badge');
        badge.className = `era-badge ${era.eraClass}`;
        document.getElementById('era-icon').innerText = era.badgeIcon;
        document.getElementById('era-name').innerText = era.name;

        const livingPop = this.tribeMembers.filter(m => m.alive).length;
        document.getElementById('res-pop').innerText = `${livingPop} / ${this.maxPopulation}`;

        // 存糧繁衍進度顯示
        const currentFood = this.currentEra >= 1 ? this.resources.cookedFood : this.resources.rawFood;
        const foodTypeLabel = this.currentEra >= 1 ? '熟食' : '生鮮';
        const progEl = document.getElementById('pop-progress-text');
        if (progEl) {
            progEl.innerText = `${foodTypeLabel}存糧: ${currentFood} / ${this.foodForNextPop} ➔ 滿額迎新族人！`;
        }

        const r = this.resources;
        document.getElementById('res-food').innerText = r.cookedFood;
        document.getElementById('res-raw').innerText = r.rawFood;
        document.getElementById('res-stone').innerText = r.stone;
        document.getElementById('res-wood').innerText = r.wood;
        document.getElementById('res-pottery').innerText = r.pottery;
        document.getElementById('res-crop').innerText = r.crop;
        document.getElementById('res-iron').innerText = r.iron;
        document.getElementById('res-trade').innerText = r.trade;

        document.getElementById('chip-wood').classList.toggle('hidden', this.currentEra < 1);
        document.getElementById('chip-pottery').classList.toggle('hidden', this.currentEra < 2);
        document.getElementById('chip-crop').classList.toggle('hidden', this.currentEra < 2);
        document.getElementById('chip-iron').classList.toggle('hidden', this.currentEra < 3);
        document.getElementById('chip-trade').classList.toggle('hidden', this.currentEra < 3);
    }

    updateQuestList() {
        const era = ERAS[this.currentEra];
        document.getElementById('quest-era-title').innerText = `${era.name} 進化條件`;
        const listEl = document.getElementById('quest-list');
        listEl.innerHTML = '';

        era.tasks.forEach(t => {
            const isDone = t.current >= t.target;
            const li = document.createElement('li');
            li.className = `quest-item ${isDone ? 'done' : ''}`;
            li.innerHTML = `
                <div class="flex items-center">
                    <span class="check">${isDone ? '✅' : '⏳'}</span>
                    <span>${t.desc}</span>
                </div>
                <span class="font-bold text-xs ${isDone ? 'text-emerald-400' : 'text-amber-300'}">
                    ${t.current} / ${t.target}
                </span>
            `;
            listEl.appendChild(li);
        });

        this.checkEvolutionReadiness();
    }

    showToast(msg) {
        const el = document.getElementById('toast-bar');
        el.innerText = msg;
        el.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
    }

    spawnFloatingText(text, x, y, color = "#ffd166") {
        this.floatingTexts.push({ text, x, y, color, alpha: 1, timer: 0 });
    }

    loop() {
        this.update();
        this.render();
        requestAnimationFrame(this.loop.bind(this));
    }

    update() {
        // 選家候選點動畫
        if (this.gamePhase === 'SITE_SELECTION') {
            for (let c of this.siteCandidates) c.update();
        }

        // 野生動物與大魚
        for (let b of this.wildBoars) b.update();
        for (let f of this.bigFishes) f.update();

        // 族人行為循環
        for (let m of this.tribeMembers) {
            m.update(
                this.homeBase,
                this.resources,
                this.sound,
                this.currentEra,
                (carrying, worker) => this.handleWorkerDeposit(carrying, worker)
            );

            // 敲石產生火星
            if (m.state === 'WORKING' && m.assignedTarget && m.assignedTarget.action === 'STRIKE_STONE') {
                if (m.workTimer % 35 === 0) {
                    this.handleStoneStrikeSparks(m.assignedTarget.x, m.assignedTarget.y);
                }
            }
        }

        // 火花粒子
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const sp = this.sparks[i];
            sp.update();
            if (sp.alpha <= 0) this.sparks.splice(i, 1);
        }

        // 點擊光標
        for (let i = this.clickMarkers.length - 1; i >= 0; i--) {
            const cm = this.clickMarkers[i];
            cm.update();
            if (!cm.alive) this.clickMarkers.splice(i, 1);
        }

        // 浮動文字
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.timer++;
            ft.y -= 0.8;
            ft.alpha -= 0.016;
            if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
        }

        // 設施節點
        for (let obj of this.objects) obj.update();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // 1. 繪製大地圖地形
        this.drawWorldTerrain(ctx);

        // 2. 選家階段候選點
        if (this.gamePhase === 'SITE_SELECTION') {
            for (let c of this.siteCandidates) c.draw(ctx);
        }

        // 3. 點擊光標與火花
        for (let cm of this.clickMarkers) cm.draw(ctx);
        for (let sp of this.sparks) sp.draw(ctx);

        // 4. 前後遮擋深度排序渲染
        const renderList = [
            ...this.objects.filter(o => this.currentEra >= o.minEra),
            ...this.wildBoars,
            ...this.bigFishes,
            ...this.tribeMembers.filter(m => m.alive)
        ];
        renderList.sort((a, b) => a.y - b.y);

        for (let ent of renderList) {
            if (ent instanceof TribeMember) {
                if (ent === this.selectedMember) {
                    ctx.save();
                    ctx.strokeStyle = "#38bdf8";
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.ellipse(ent.x, ent.y + 26, 26, 12, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                ent.draw(ctx, this.currentEra);
            } else if (ent instanceof WildBoar) {
                ent.draw(ctx, this.currentEra);
            } else if (ent instanceof BigSeaFish) {
                ent.draw(ctx);
            } else {
                ent.draw(ctx, this.currentEra);
            }
        }

        // 5. 浮動文字
        for (let ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = "900 16px 'Noto Sans TC'";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 4;
            ctx.textAlign = "center";
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        ctx.restore();
    }

    drawWorldTerrain(ctx) {
        ctx.fillStyle = "#1e4620";
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

        // 自然土徑
        ctx.strokeStyle = "#5a3e2b";
        ctx.lineWidth = 70;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(380, 260);
        ctx.quadraticCurveTo(680, 500, 980, 720);
        ctx.quadraticCurveTo(1150, 950, 950, 1220);
        ctx.quadraticCurveTo(700, 1400, 480, 1480);
        ctx.stroke();

        // 礫石灘碎石
        ctx.fillStyle = "#64748b";
        ctx.beginPath();
        ctx.ellipse(780, 280, 115, 65, 0, 0, Math.PI * 2);
        ctx.fill();

        // 太平洋深海
        const oceanGrad = ctx.createLinearGradient(0, 600, 400, 1800);
        oceanGrad.addColorStop(0, "#0284c7");
        oceanGrad.addColorStop(1, "#0369a1");
        ctx.fillStyle = oceanGrad;
        ctx.beginPath();
        ctx.moveTo(0, 550);
        ctx.bezierCurveTo(450, 700, 520, 1300, 150, 1800);
        ctx.lineTo(0, 1800);
        ctx.closePath();
        ctx.fill();

        // 白色海潮碎浪
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 550);
        ctx.bezierCurveTo(450, 700, 520, 1300, 150, 1800);
        ctx.stroke();

        // 海崖懸崖岩壁 (八仙洞天然庇護所)
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1150, 0);
        ctx.lineTo(1080, 180);
        ctx.lineTo(0, 180);
        ctx.closePath();
        ctx.fill();

        // 森林巨木群
        ctx.fillStyle = "#14532d";
        const treeSpots = [
            [1300, 160], [1520, 200], [1820, 280], [2150, 420],
            [1720, 820], [1980, 900], [1780, 1320], [2120, 1480],
            [1420, 1580], [1680, 1620]
        ];
        for (let [tx, ty] of treeSpots) {
            ctx.beginPath();
            ctx.arc(tx, ty, 38, 0, Math.PI * 2);
            ctx.arc(tx - 16, ty - 12, 30, 0, Math.PI * 2);
            ctx.arc(tx + 16, ty - 12, 30, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});
