/**
 * 史前文明演化 - 實體與模擬生態系統 (TribeMember, WorldObject, WildBoar, BigFish, SiteCandidate)
 * 具備：可視化採集進度條、高回饋採集數值、存糧繁衍、選家探勘與搬運循環
 */

// 腳步揚塵粒子
class DustParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = -Math.random() * 0.4;
        this.radius = 2.5 + Math.random() * 3;
        this.alpha = 0.5;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.radius += 0.15;
        this.alpha -= 0.025;
    }
    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(180, 150, 120, ${Math.max(0, this.alpha)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 敲石火花粒子
class SparkParticle {
    constructor(x, y, isSuper = false) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = (isSuper ? 3.5 : 1.8) + Math.random() * 3.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1.5;
        this.radius = isSuper ? 4 : 2.2;
        this.alpha = 1;
        this.color = Math.random() < 0.5 ? "#fef08a" : "#f97316";
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.12;
        this.alpha -= 0.026;
    }
    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 點擊光標
class ClickMarker {
    constructor(x, y, isObject = false) {
        this.x = x;
        this.y = y;
        this.isObject = isObject;
        this.radius = 8;
        this.maxRadius = isObject ? 36 : 24;
        this.alpha = 1;
        this.angle = 0;
        this.alive = true;
    }
    update() {
        this.radius += (this.maxRadius - this.radius) * 0.18;
        this.angle += 0.08;
        this.alpha -= 0.025;
        if (this.alpha <= 0) this.alive = false;
    }
    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = Math.max(0, this.alpha);
        const color = this.isObject ? "#facc15" : "#38bdf8";

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(this.angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, this.radius - 5);
            ctx.lineTo(0, this.radius + 3);
            ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 候選定居點 (探勘選家階段專用)
class SiteCandidate {
    constructor(id, x, y, name, type, isBest, description) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 50;
        this.name = name;
        this.type = type;
        this.isBest = isBest; // 是否為天賜八仙洞
        this.description = description;
        this.timer = Math.random() * 10;
    }
    update() {
        this.timer += 0.05;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const glow = 0.5 + Math.sin(this.timer * 3) * 0.4;
        ctx.fillStyle = this.isBest ? `rgba(250, 204, 21, ${glow * 0.3})` : `rgba(239, 68, 68, ${glow * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.isBest ? "#facc15" : "#f87171";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();

        // 標籤
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-65, -45, 130, 24);
        ctx.strokeStyle = this.isBest ? "#facc15" : "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-65, -45, 130, 24);

        ctx.fillStyle = this.isBest ? "#fde047" : "#e2e8f0";
        ctx.font = "bold 11px 'Noto Sans TC'";
        ctx.textAlign = "center";
        ctx.fillText(this.isBest ? `⭐ 候選：${this.name}` : `🔍 候選：${this.name}`, 0, -29);

        ctx.restore();
    }
}

const TRIBE_NAMES = [
    "阿岩", "鹿兒", "小火", "溪水", "山豬牙", "綠葉", "風兒", "陶匠", 
    "大樹", "貝貝", "海風", "石斧", "小米", "巧匠", "大步", "晴空", "玉石", "鐵鎚"
];

// ==========================================
// 部族成員實體 (TribeMember)
// ==========================================
class TribeMember {
    constructor(id, x, y, name, isLeader = false) {
        this.id = id;
        this.name = name || TRIBE_NAMES[id % TRIBE_NAMES.length];
        this.isLeader = isLeader;
        this.x = x;
        this.y = y;
        this.speed = 3.4 + Math.random() * 0.5;
        this.vx = 0;
        this.vy = 0;
        this.facing = 'down';
        this.walkCycle = 0;
        this.isMoving = false;

        this.hunger = 90 + Math.random() * 10;
        this.health = 100;
        this.alive = true;

        this.state = 'IDLE'; // 'IDLE', 'MOVING_TO_WORK', 'WORKING', 'RETURNING_HOME'
        this.assignedTarget = null;
        this.workTimer = 0;
        this.workDurationNeeded = 110; // 約 1.8 秒完成一次工作 (節奏明快！)
        this.carrying = null; // 攜帶收穫物資

        this.idleTimer = Math.floor(Math.random() * 200);
        this.blinkTimer = 0;
        this.jumpTimer = 0;

        this.speech = { text: "", icon: "", timer: 0, alpha: 0 };
        this.dustParticles = [];
    }

    say(text, icon = "💬", duration = 140) {
        this.speech.text = text;
        this.speech.icon = icon;
        this.speech.timer = duration;
        this.speech.alpha = 1;
    }

    jump() {
        this.jumpTimer = 18;
    }

    assignTask(targetObj, customSaying = null, customIcon = null) {
        this.assignedTarget = targetObj;
        this.state = 'MOVING_TO_WORK';
        if (customSaying) {
            this.say(customSaying, customIcon || "🏃", 130);
        } else if (targetObj) {
            this.say(`前往 ${targetObj.name} 工作！`, "🏃", 120);
        }
    }

    update(homeBase, resources, soundFx, eraId, onDepositCallback) {
        if (!this.alive) return;

        // 飽食消耗與維持
        this.hunger -= 0.012;
        if (this.hunger < 25) {
            if (resources.cookedFood > 0) {
                resources.cookedFood--;
                this.hunger = 100;
                this.say("享用了美味熟食，精神百倍！", "🍖", 120);
                soundFx.playFireSizzle();
            } else if (resources.rawFood > 0) {
                resources.rawFood--;
                this.hunger = 65;
                this.say("生吃野果充飢，好想吃熟肉...", "🍒", 120);
            } else {
                this.health -= 0.04;
                if (Math.random() < 0.01 && this.speech.timer <= 0) {
                    this.say("好餓啊...部落沒有食物了...", "😭", 120);
                }
            }
        }

        if (this.health <= 0) {
            this.alive = false;
            this.say("因飢荒病弱倒下了...", "💀", 200);
            return;
        }

        if (this.jumpTimer > 0) this.jumpTimer--;
        if (this.speech.timer > 0) {
            this.speech.timer--;
            if (this.speech.timer < 20) this.speech.alpha = this.speech.timer / 20;
        } else {
            this.speech.alpha = 0;
        }

        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            const p = this.dustParticles[i];
            p.update();
            if (p.alpha <= 0) this.dustParticles.splice(i, 1);
        }

        let targetX = this.x;
        let targetY = this.y;
        let shouldMove = false;

        switch (this.state) {
            case 'IDLE':
                this.idleTimer++;
                this.blinkTimer++;
                if (this.idleTimer % 240 === 0 && Math.random() < 0.6) {
                    const wanderAngle = Math.random() * Math.PI * 2;
                    const wanderDist = 35 + Math.random() * 55;
                    this.wanderTarget = {
                        x: homeBase.x + Math.cos(wanderAngle) * wanderDist,
                        y: homeBase.y + Math.sin(wanderAngle) * wanderDist
                    };
                }
                if (this.wanderTarget) {
                    const dist = Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y);
                    if (dist > 8) {
                        targetX = this.wanderTarget.x;
                        targetY = this.wanderTarget.y;
                        shouldMove = true;
                    } else {
                        this.wanderTarget = null;
                    }
                }
                break;

            case 'MOVING_TO_WORK':
                if (!this.assignedTarget) { this.state = 'IDLE'; break; }
                targetX = this.assignedTarget.x;
                targetY = this.assignedTarget.y;
                shouldMove = true;

                const distToWork = Math.hypot(targetX - this.x, targetY - this.y);
                const workDistThreshold = (this.assignedTarget.radius || 40) + 12;

                if (distToWork <= workDistThreshold) {
                    this.state = 'WORKING';
                    this.workTimer = 0;
                    shouldMove = false;
                }
                break;

            case 'WORKING':
                if (!this.assignedTarget) { this.state = 'IDLE'; break; }
                this.workTimer++;

                if (this.workTimer % 35 === 0) {
                    this.jump();
                    this.playWorkSound(this.assignedTarget.action, soundFx);
                }

                // 工作完成，結算超豐盛收穫！
                if (this.workTimer >= this.workDurationNeeded) {
                    this.carrying = this.generateCarriedItem(this.assignedTarget.action, eraId);
                    this.state = 'RETURNING_HOME';
                    this.say(`滿載 ${this.carrying.name}，運回基地！`, this.carrying.icon, 120);
                }
                break;

            case 'RETURNING_HOME':
                targetX = homeBase.x;
                targetY = homeBase.y + 20;
                shouldMove = true;

                const distToHome = Math.hypot(targetX - this.x, targetY - this.y);
                if (distToHome < 45) {
                    if (this.carrying) {
                        onDepositCallback(this.carrying, this);
                        soundFx.playTone(523.25, 'triangle', 0.12, 0.2);
                    }
                    this.carrying = null;

                    // 循環回去繼續工作
                    if (this.assignedTarget) {
                        this.state = 'MOVING_TO_WORK';
                    } else {
                        this.state = 'IDLE';
                    }
                }
                break;
        }

        if (shouldMove) {
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 2) {
                this.isMoving = true;
                this.walkCycle += 0.24;
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;

                if (Math.abs(this.vx) > Math.abs(this.vy)) {
                    this.facing = this.vx > 0 ? 'right' : 'left';
                } else {
                    this.facing = this.vy > 0 ? 'down' : 'up';
                }

                this.x += this.vx;
                this.y += this.vy;

                if (Math.random() < 0.28) {
                    this.dustParticles.push(new DustParticle(this.x, this.y + 24));
                }
            } else {
                this.isMoving = false;
                this.vx = 0;
                this.vy = 0;
            }
        } else {
            this.isMoving = false;
            this.vx = 0;
            this.vy = 0;
            this.walkCycle = 0;
        }
    }

    playWorkSound(action, soundFx) {
        switch (action) {
            case 'STRIKE_STONE': soundFx.playStoneHit(); break;
            case 'FORAGE': soundFx.playHarvest(); break;
            case 'FISH': soundFx.playWaterSplash(); break;
            case 'COOK': soundFx.playFireSizzle(); break;
            case 'CHOP_TREE': soundFx.playTone(260, 'sawtooth', 0.12, 0.2); break;
            case 'HUNT_BOAR': soundFx.playTone(180, 'square', 0.15, 0.2); break;
            case 'HARVEST_CROP': soundFx.playHarvest(); break;
            case 'MAKE_POTTERY': soundFx.playTone(600, 'triangle', 0.2, 0.18); break;
            case 'CRAFT_JADE': soundFx.playJadeChime(); break;
            case 'SMELT_IRON': soundFx.playIronAnvil(); break;
        }
    }

    // 高回饋採集數值配置 (辛苦的小人獲得應有的豐盛收穫！)
    generateCarriedItem(action, eraId) {
        const mult = eraId >= 3 ? 2 : 1;
        switch (action) {
            case 'STRIKE_STONE':
                return { type: 'stone', name: '硬礫石材 & 打製石器', icon: '🪨', amount: 3 * mult, subType: 'stoneTool', subAmount: 1 };
            case 'FORAGE':
                return { type: 'rawFood', name: '鮮甜野果 & 乾燥茅草', icon: '🍒', amount: 4 * mult, subType: 'dryGrass', subAmount: 2 };
            case 'FISH':
                return { type: 'rawFood', name: '大魚鮮肉', icon: '🐟', amount: 5 * mult };
            case 'HUNT_BOAR':
                return { type: 'rawFood', name: '野豬大肉 & 獸皮', icon: '🐗', amount: 12 * mult, subType: 'fur', subAmount: 2 };
            case 'CHOP_TREE':
                return { type: 'wood', name: '堅實原木', icon: '🪵', amount: 6 * mult };
            case 'COOK':
                return { type: 'cookedFood', name: '噴香熟肉', icon: '🍖', amount: 5 * mult };
            case 'HARVEST_CROP':
                return { type: 'crop', name: '黃金小米', icon: '🌾', amount: 6 * mult };
            case 'MAKE_POTTERY':
                return { type: 'pottery', name: '印紋陶罐', icon: '🏺', amount: 1 };
            case 'CRAFT_JADE':
                return { type: 'jade', name: '人獸形玉玦', icon: '💎', amount: 1 };
            case 'SMELT_IRON':
                return { type: 'iron', name: '高溫鍛造鐵器', icon: '⚒️', amount: 3 };
            default:
                return { type: 'stone', name: '物資', icon: '📦', amount: 2 };
        }
    }

    // 繪製小人
    draw(ctx, eraId) {
        if (!this.alive) return;

        for (let dp of this.dustParticles) dp.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        const bob = this.isMoving ? Math.sin(this.walkCycle) * 3 : (Math.sin(this.idleTimer * 0.05) * 1.2);
        const legSwing = this.isMoving ? Math.sin(this.walkCycle) * 11 : 0;
        const jumpY = this.jumpTimer > 0 ? -Math.sin((this.jumpTimer / 18) * Math.PI) * 14 : 0;

        ctx.translate(0, jumpY);

        // 1. 影子
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.ellipse(0, 26, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 雙腿
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#a3704c";
        ctx.beginPath();
        ctx.moveTo(-8, 14);
        ctx.lineTo(-8 - (this.facing === 'left' ? legSwing : -legSwing * 0.5), 26);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8, 14);
        ctx.lineTo(8 + (this.facing === 'right' ? legSwing : legSwing * 0.5), 26);
        ctx.stroke();

        // 3. 軀幹服飾
        ctx.save();
        ctx.translate(0, bob);

        if (eraId <= 1) {
            ctx.fillStyle = "#854d0e";
            ctx.fillRect(-12, -4, 24, 20);
            ctx.strokeStyle = "#5a3825"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(8, 16); ctx.stroke();
        } else if (eraId === 2) {
            ctx.fillStyle = "#d4b886";
            ctx.fillRect(-14, -6, 28, 22);
            ctx.strokeStyle = "#b91c1c"; ctx.lineWidth = 2.5;
            ctx.strokeRect(-14, 12, 28, 4);
        } else {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(-15, -7, 30, 24);
            ctx.fillStyle = "#ea580c";
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        }

        // 4. 頭部與面部
        ctx.fillStyle = "#b5835a";
        ctx.beginPath(); ctx.arc(0, -17, 14, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#1c1917";
        ctx.beginPath(); ctx.arc(0, -20, 15, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();

        ctx.fillStyle = "#0f172a";
        let eyeOff = this.facing === 'left' ? -4 : (this.facing === 'right' ? 4 : 0);
        ctx.beginPath();
        ctx.arc(-4 + eyeOff, -17, 2, 0, Math.PI * 2);
        ctx.arc(4 + eyeOff, -17, 2, 0, Math.PI * 2);
        ctx.fill();

        if (eraId >= 2) {
            ctx.fillStyle = "#34d399";
            const earX = this.facing === 'left' ? -15 : 15;
            ctx.fillRect(earX, -15, 3.5, 8);
        }

        // 5. 手中物資或工具展示
        if (this.carrying) {
            ctx.fillStyle = "#0f172a";
            ctx.font = "bold 16px 'Noto Sans TC'";
            ctx.textAlign = "center";
            ctx.fillText(this.carrying.icon, 0, 6);
        } else if (this.state === 'WORKING') {
            ctx.fillStyle = "#64748b";
            ctx.fillRect(10, -6, 4, 16);
        }

        ctx.restore();
        ctx.restore();

        // 6. 工作進度條 (正在採集/製造時即時反饋！)
        if (this.state === 'WORKING' && this.workDurationNeeded > 0) {
            this.drawProgressBar(ctx);
        }

        // 7. 滿載歸來標籤
        if (this.state === 'RETURNING_HOME' && this.carrying) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
            ctx.beginPath();
            ctx.roundRect(-30, -56, 60, 16, 6);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px 'Noto Sans TC'";
            ctx.textAlign = "center";
            ctx.fillText(`滿載 +${this.carrying.amount}`, 0, -44);
            ctx.restore();
        }

        // 8. 頭頂名牌與氣泡
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-24, -40, 48, 15, 6);
        ctx.fill();
        ctx.fillStyle = this.isLeader ? "#ffd166" : "#e2e8f0";
        ctx.font = "bold 10px 'Noto Sans TC'";
        ctx.textAlign = "center";
        ctx.fillText(this.name, 0, -29);

        if (this.speech.alpha > 0.05) {
            this.drawSpeechBubble(ctx);
        }
        ctx.restore();
    }

    // 繪製頭頂工作進度環/條
    drawProgressBar(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const barW = 44;
        const barH = 6;
        const bx = -barW / 2;
        const by = -52;
        const progress = Math.min(1, this.workTimer / this.workDurationNeeded);

        // 背景
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);

        // 進度填充 (金黃到翠綠漸層)
        ctx.fillStyle = progress > 0.8 ? "#10b981" : "#f59e0b";
        ctx.fillRect(bx, by, barW * progress, barH);

        // 外框
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
        ctx.restore();
    }

    drawSpeechBubble(ctx) {
        ctx.save();
        ctx.globalAlpha = this.speech.alpha;
        ctx.font = "bold 11px 'Noto Sans TC'";
        const fullText = `${this.speech.icon} ${this.speech.text}`;
        const w = ctx.measureText(fullText).width + 16;
        const bx = -w / 2;
        const by = -68;

        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#f4a261";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fullText, 0, by + 12);
        ctx.restore();
    }
}

// 史前巨型野山豬
class WildBoar {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 36;
        this.alive = true;
        this.timer = Math.random() * 100;
        this.wanderX = x;
        this.wanderY = y;
    }
    update() {
        this.timer += 0.05;
        if (Math.sin(this.timer) > 0.8 && Math.random() < 0.02) {
            this.wanderX = this.x + (Math.random() - 0.5) * 80;
            this.wanderY = this.y + (Math.random() - 0.5) * 80;
        }
        this.x += (this.wanderX - this.x) * 0.02;
        this.y += (this.wanderY - this.y) * 0.02;
    }
    draw(ctx, eraId) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const bob = Math.sin(this.timer * 3) * 2;

        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.ellipse(0, bob, 32, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1c1917";
        ctx.beginPath();
        ctx.moveTo(-18, -20 + bob); ctx.lineTo(-10, -28 + bob); ctx.lineTo(-4, -20 + bob);
        ctx.moveTo(-2, -20 + bob); ctx.lineTo(6, -28 + bob); ctx.lineTo(12, -20 + bob);
        ctx.fill();

        ctx.strokeStyle = "#fef3c7";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(22, 4 + bob);
        ctx.quadraticCurveTo(34, 0 + bob, 32, -12 + bob);
        ctx.stroke();

        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.ellipse(26, 4 + bob, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 12px 'Noto Sans TC'";
        ctx.textAlign = "center";
        ctx.fillText("🐗 巨型山豬 (可獲大量肉品與獸皮)", 0, 36);
        ctx.restore();
    }
}

// 史前近海大魚
class BigSeaFish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 35;
        this.timer = Math.random() * 50;
    }
    update() {
        this.timer += 0.05;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const rWave = (this.timer * 20) % 40;
        ctx.strokeStyle = `rgba(56, 189, 248, ${1 - rWave / 40})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, rWave, rWave * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        const jumpY = Math.sin(this.timer * 2.5) * 14;
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.ellipse(0, jumpY - 6, 20, 10, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.moveTo(-16, jumpY - 6); ctx.lineTo(-26, jumpY - 14); ctx.lineTo(-24, jumpY + 2);
        ctx.fill();

        ctx.fillStyle = "#bae6fd";
        ctx.font = "bold 12px 'Noto Sans TC'";
        ctx.textAlign = "center";
        ctx.fillText("🐟 近海大魚 (刺魚獲豐盛肉品)", 0, 24);
        ctx.restore();
    }
}

// 世界設施節點
class WorldObject {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius || 45;
        this.minEra = config.minEra || 0;
        this.prompt = config.prompt;
        this.action = config.action;
        this.isLit = config.isLit !== undefined ? config.isLit : true;
        this.animTimer = Math.random() * 100;
    }

    update() {
        this.animTimer += 0.05;
    }

    draw(ctx, currentEra) {
        if (currentEra < this.minEra) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        switch (this.type) {
            case 'CAVE':
                ctx.fillStyle = "#1e293b";
                ctx.beginPath(); ctx.arc(0, 0, 85, Math.PI, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#020617";
                ctx.beginPath(); ctx.arc(0, 0, 56, Math.PI, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#475569"; ctx.lineWidth = 5; ctx.stroke();

                ctx.fillStyle = "#f8fafc";
                ctx.font = "bold 14px 'Noto Sans TC'";
                ctx.textAlign = "center";
                ctx.fillText("🪨 八仙洞海崖洞穴 (部族家園·物資庫)", 0, -95);
                break;

            case 'CAMPFIRE':
                ctx.fillStyle = "#475569";
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(Math.cos(ang) * 22, Math.sin(ang) * 16, 7, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (this.isLit) {
                    const fSize = 16 + Math.sin(this.animTimer * 5) * 5;
                    const grad = ctx.createRadialGradient(0, 0, 2, 0, -4, fSize);
                    grad.addColorStop(0, "#fef08a");
                    grad.addColorStop(0.5, "#f97316");
                    grad.addColorStop(1, "rgba(220, 38, 38, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, -6, fSize, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = "#fef3c7";
                    ctx.font = "bold 12px 'Noto Sans TC'";
                    ctx.textAlign = "center";
                    ctx.fillText("🔥 八仙洞營火 (烤熟肉品·繁衍人口)", 0, 32);
                } else {
                    ctx.fillStyle = "#334155";
                    ctx.beginPath(); ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, 5); ctx.moveTo(10, -5); ctx.lineTo(-10, 5); ctx.stroke();

                    ctx.fillStyle = "#94a3b8";
                    ctx.font = "bold 12px 'Noto Sans TC'";
                    ctx.textAlign = "center";
                    ctx.fillText("🪵 枯枝茅草堆 (待敲石摩擦引燃)", 0, 32);
                }
                break;

            case 'PEBBLES':
                ctx.fillStyle = "#64748b";
                ctx.beginPath();
                ctx.ellipse(-14, -4, 20, 14, 0.4, 0, Math.PI * 2);
                ctx.ellipse(12, 6, 18, 12, -0.2, 0, Math.PI * 2);
                ctx.ellipse(0, -16, 16, 10, 0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#334155"; ctx.lineWidth = 2.5; ctx.stroke();

                ctx.fillStyle = "#cbd5e1";
                ctx.font = "bold 12px 'Noto Sans TC'";
                ctx.textAlign = "center";
                ctx.fillText("🪨 天然礫石灘 (打製石斧·摩擦火星)", 0, 26);
                break;

            case 'BUSH':
                ctx.fillStyle = "#15803d";
                ctx.beginPath();
                ctx.arc(-10, -5, 22, 0, Math.PI * 2);
                ctx.arc(14, -2, 24, 0, Math.PI * 2);
                ctx.arc(0, -18, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ef4444";
                [[-8, -12], [8, -14], [-4, 2], [14, 4], [0, -6]].forEach(([bx, by]) => {
                    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
                });
                ctx.fillStyle = "#bbf7d0";
                ctx.font = "bold 12px 'Noto Sans TC'";
                ctx.textAlign = "center";
                ctx.fillText("🍒 野果灌木林 (採野果+乾燥茅草)", 0, 28);
                break;

            case 'TALL_TREE':
                ctx.fillStyle = "#78350f";
                ctx.fillRect(-12, -10, 24, 40);
                ctx.fillStyle = "#166534";
                ctx.beginPath();
                ctx.arc(0, -35, 38, 0, Math.PI * 2);
                ctx.arc(-22, -25, 26, 0, Math.PI * 2);
                ctx.arc(22, -25, 26, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#86efac";
                ctx.font = "bold 12px 'Noto Sans TC'";
                ctx.textAlign = "center";
                ctx.fillText("🪵 茂盛巨樹 (石斧砍伐獲得原木)", 0, 42);
                break;

            case 'SLATE_HOUSE':
                ctx.fillStyle = "#475569"; ctx.fillRect(-50, -35, 100, 70);
                ctx.strokeStyle = "#334155"; ctx.lineWidth = 2;
                for (let y = -25; y < 35; y += 12) {
                    ctx.beginPath(); ctx.moveTo(-50, y); ctx.lineTo(50, y); ctx.stroke();
                }
                ctx.fillStyle = "#854d0e";
                ctx.beginPath(); ctx.moveTo(-60, -35); ctx.lineTo(0, -68); ctx.lineTo(60, -35); ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#1e293b"; ctx.fillRect(-12, 5, 24, 30);
                ctx.fillStyle = "#fef08a"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("🏘️ 卑南聚落 (定居石板屋)", 0, 52);
                break;

            case 'POTTERY_KILN':
                ctx.fillStyle = "#9a3412"; ctx.beginPath(); ctx.arc(-14, 0, 14, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.arc(0, -8, 14, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(-6, -22, 12, 8);
                ctx.fillStyle = "#fdba74"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("🏺 製陶作坊 (泥土燒罐儲食)", 0, 30);
                break;

            case 'FARMLAND':
                ctx.fillStyle = "#78350f"; ctx.fillRect(-45, -25, 90, 50);
                ctx.fillStyle = "#facc15";
                for (let r = -35; r <= 35; r += 14) {
                    const sway = Math.sin(this.animTimer * 2 + r) * 4;
                    ctx.beginPath(); ctx.moveTo(r, 18); ctx.lineTo(r + sway, -16);
                    ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 3; ctx.stroke();
                    ctx.arc(r + sway, -16, 4, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = "#fef08a"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("🌾 金色小米田 (磨製石刀收割)", 0, 40);
                break;

            case 'JADE_WORKSHOP':
                ctx.fillStyle = "#334155"; ctx.fillRect(-24, -16, 48, 32);
                ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(0, -2, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#6ee7b7"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("💎 玉器工坊 (琢磨人獸形玉玦)", 0, 30);
                break;

            case 'STILT_HOUSE':
                ctx.strokeStyle = "#78350f"; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(-40, 20); ctx.lineTo(-40, -10); ctx.moveTo(40, 20); ctx.lineTo(40, -10); ctx.stroke();
                ctx.fillStyle = "#b45309"; ctx.fillRect(-55, -12, 110, 8);
                ctx.fillStyle = "#92400e"; ctx.fillRect(-45, -45, 90, 34);
                ctx.fillStyle = "#713f12"; ctx.beginPath(); ctx.moveTo(-58, -45); ctx.lineTo(0, -78); ctx.lineTo(58, -45); ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#fde68a"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("🏡 架高干欄建築 (防潮避獸)", 0, 38);
                break;

            case 'IRON_FURNACE':
                ctx.fillStyle = "#3f3f46"; ctx.beginPath();
                ctx.moveTo(-28, 20); ctx.lineTo(-18, -40); ctx.lineTo(18, -40); ctx.lineTo(28, 20); ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#f97316"; ctx.fillRect(-10, 0, 20, 18);
                ctx.fillStyle = "#fdba74"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("⚒️ 煉鐵高爐 (出土鐵鋤與鐵渣)", 0, 38);
                break;

            case 'TRADE_DOCK':
                ctx.fillStyle = "#78350f"; ctx.fillRect(-40, -10, 80, 20);
                const boatBob = Math.sin(this.animTimer * 1.8) * 3;
                ctx.save(); ctx.translate(65, -15 + boatBob);
                ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.moveTo(-35, 10); ctx.lineTo(45, 10); ctx.lineTo(30, 28); ctx.lineTo(-25, 28); ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#fef3c7"; ctx.fillRect(-5, -45, 25, 45); ctx.restore();
                ctx.fillStyle = "#93c5fd"; ctx.font = "bold 12px 'Noto Sans TC'"; ctx.textAlign = "center";
                ctx.fillText("⛵ 跨島貿易碼頭 (玻璃瑪瑙交換)", 0, 32);
                break;
        }

        ctx.restore();
    }
}
