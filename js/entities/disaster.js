/**
 * 史前文明演化 - 天災、野獸襲擊、疾病與生命週期演算法 (DISASTER & LIFECYCLE ENGINE)
 * 涵蓋：臺灣強烈颱風、猛獸（臺灣雲豹/巨山豬）、疾疫、四季年曆與生老病死
 */

class DisasterSystem {
    constructor() {
        this.currentSeason = "春季（播種與近海刺魚）";
        this.seasonIndex = 0;
        this.year = 1;
        // 季節由遊戲回合控制：每回合一季，四季為一年。
        this.seasonTimer = 0;
        this.seasonDuration = 0;

        this.activeDisaster = null; // null, 'TYPHOON', 'BEAST_RAID', 'ILLNESS'
        this.disasterTimer = 0;

        // 天氣雨線粒子
        this.rainParticles = [];
        this.windStreaks = [];

        // 出沒猛獸實體
        this.beast = null; // { type: 'LEOPARD'|'BOAR', x, y, hp, alive }
    }

    setSeason(index, year, showToastCallback) {
        const seasons = [
            "春季（暖陽·播種小米與刺魚）",
            "夏季（西南氣流·強烈颱風季）",
            "秋季（豐收·收割小米與跨島貿易）",
            "冬季（東北季風·天寒地凍與打獵）"
        ];
        this.seasonIndex = ((index % 4) + 4) % 4;
        this.year = Math.max(1, year || 1);
        this.currentSeason = seasons[this.seasonIndex];
        if (this.lastCharacters && this.lastCharacters.length) {
            this.checkRandomDisaster(this.lastCharacters, this.lastSound, showToastCallback || (() => {}));
        }
    }

    update(characters, resources, sound, onDeathCallback, showToastCallback) {
        this.lastCharacters = characters;
        this.lastSound = sound;

        // 天災持續狀態推進
        if (this.activeDisaster) {
            this.disasterTimer--;

            if (this.activeDisaster === 'TYPHOON') {
                this.updateTyphoon(characters);
            } else if (this.activeDisaster === 'BEAST_RAID') {
                this.updateBeast(characters, resources, sound, onDeathCallback, showToastCallback);
            }

            if (this.disasterTimer <= 0) {
                showToastCallback(`☀️ 天災消散，大地重歸平靜！`);
                this.activeDisaster = null;
                this.beast = null;
                const alertEl = document.getElementById('disaster-alert');
                if (alertEl) alertEl.style.display = 'none';
            }
        }
    }

    checkRandomDisaster(characters, sound, showToast) {
        if (this.activeDisaster) return;

        // 夏季容易有颱風
        if (this.seasonIndex === 1 && Math.random() < 0.6) {
            this.triggerTyphoon(sound, showToast);
        }
        // 冬季或秋季容易有野獸突襲
        else if ((this.seasonIndex === 2 || this.seasonIndex === 3) && Math.random() < 0.5) {
            this.triggerBeastRaid(sound, showToast);
        }
        // 隨機偶發疾疫
        else if (Math.random() < 0.25) {
            this.triggerIllness(characters, showToast);
        }
    }

    // 1. 觸發強烈颱風
    triggerTyphoon(sound, showToast) {
        this.activeDisaster = 'TYPHOON';
        this.disasterTimer = 900; // 15秒風暴
        sound.playDisasterThunder();
        showToast("🌀 警報！太平洋強烈颱風侵襲臺灣東海岸！狂風暴雨肆虐！");

        const alertEl = document.getElementById('disaster-alert');
        if (alertEl) {
            alertEl.innerHTML = "🌀 <b>強烈颱風警報</b>：巨浪侵襲沿岸，請盡快躲避至石板屋！";
            alertEl.style.display = 'flex';
        }

        // 初始化雨線
        this.rainParticles = [];
        for (let i = 0; i < 80; i++) {
            this.rainParticles.push({
                x: Math.random() * 3400,
                y: Math.random() * 800,
                speed: 12 + Math.random() * 8,
                len: 18 + Math.random() * 12
            });
        }
    }

    updateTyphoon(characters) {
        // 更新雨滴
        for (let p of this.rainParticles) {
            p.y += p.speed;
            p.x -= 4; // 強風偏吹
            if (p.y > 800) { p.y = 0; p.x = Math.random() * 3400; }
        }

        // 風雨中對戶外族人造成失溫微損
        if (Math.random() < 0.05) {
            for (let c of characters) {
                if (c.isAlive && c.state === 'WORKING' && c.currentTask !== 'REST') {
                    c.health -= 0.6;
                    if (Math.random() < 0.02) c.say("風雨太大，快撐不住了！", "🌧️", 80);
                }
            }
        }
    }

    // 2. 觸發猛獸突襲 (臺灣雲豹或巨型野豬)
    triggerBeastRaid(sound, showToast) {
        this.activeDisaster = 'BEAST_RAID';
        this.disasterTimer = 800;
        sound.playBeastRoar();

        const isLeopard = Math.random() < 0.5;
        this.beast = {
            name: isLeopard ? "臺灣雲豹" : "巨型山豬王",
            icon: isLeopard ? "🐆" : "🐗",
            x: 2900, // 從密林竄出
            y: 520,
            hp: 60,
            maxHp: 60,
            speed: 3.2,
            targetChar: null
        };

        showToast(`⚠️ 猛獸警報！密林深處竄出【${this.beast.name}】，威脅採集族人！`);

        const alertEl = document.getElementById('disaster-alert');
        if (alertEl) {
            alertEl.innerHTML = `⚠️ <b>猛獸警報</b>：${this.beast.icon} ${this.beast.name} 正在攻擊部落邊緣！`;
            alertEl.style.display = 'flex';
        }
    }

    updateBeast(characters, resources, sound, onDeathCallback, showToast) {
        if (!this.beast) return;

        // 尋找最近的活人為目標
        let nearest = null;
        let minDist = Infinity;
        for (let c of characters) {
            if (c.isAlive) {
                const dist = Math.abs(c.x - this.beast.x);
                if (dist < minDist) { minDist = dist; nearest = c; }
            }
        }

        if (nearest) {
            const dir = nearest.x > this.beast.x ? 1 : -1;
            this.beast.x += dir * this.beast.speed;

            // 靠近攻擊
            if (minDist < 35) {
                // 如果目標是青壯年獵人且有石器，發動防禦反擊
                if (nearest.agePhase === 'ADULT' && resources.stone > 0) {
                    this.beast.hp -= 3;
                    nearest.health -= 1.5;
                    sound.playTone(420, 'square', 0.1, 0.2);
                    nearest.say("手持石矛，英勇反擊猛獸！", "🗡️", 60);

                    if (this.beast.hp <= 0) {
                        showToast(`🏆 勇者擊殺了【${this.beast.name}】！獲得大量生鮮肉品與獸皮！`);
                        resources.food += 30;
                        resources.fiber += 10;
                        this.beast = null;
                        this.activeDisaster = null;
                        const alertEl = document.getElementById('disaster-alert');
                        if (alertEl) alertEl.style.display = 'none';
                        return;
                    }
                } else {
                    // 老弱遭受傷害
                    nearest.health -= 4;
                    nearest.say("救命！野獸太兇猛了！", "😱", 60);
                }
            }
        }
    }

    // 3. 觸發突發疾疫
    triggerIllness(characters, showToast) {
        let sickCount = 0;
        for (let c of characters) {
            if (c.isAlive && Math.random() < 0.35) {
                c.isSick = true;
                sickCount++;
            }
        }
        if (sickCount > 0) {
            showToast(`🦠 時疫擴散！部族有 ${sickCount} 位族人染病發熱，需適當休息與祖靈庇護！`);
        }
    }

    // 繪製天災與野獸特效
    draw(ctx, cameraX) {
        // 雨線
        if (this.activeDisaster === 'TYPHOON') {
            ctx.save();
            ctx.strokeStyle = "rgba(186, 230, 253, 0.45)";
            ctx.lineWidth = 1.5;
            for (let p of this.rainParticles) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 6, p.y + p.len);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 野獸
        if (this.beast) {
            ctx.save();
            ctx.translate(this.beast.x, this.beast.y);

            // 野獸厚紙板剪紙外型
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.beginPath();
            ctx.ellipse(0, 16, 28, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.ellipse(0, 0, 32, 20, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = this.beast.name.includes("雲豹") ? "#ca8a04" : "#451a03";
            ctx.beginPath();
            ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // 血條
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(-20, -32, 40, 5);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(-20, -32, 40 * (this.beast.hp / this.beast.maxHp), 5);

            ctx.font = "bold 18px 'Noto Sans TC'";
            ctx.textAlign = "center";
            ctx.fillText(this.beast.icon, 0, 6);

            ctx.restore();
        }
    }
}
