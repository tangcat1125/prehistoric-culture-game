/**
 * 史前文明演化 - 橫軸工作站點實體 (HORIZONTAL WORKSTATIONS)
 * 橫式展開：海崖洞穴 ➔ 刺魚灘 ➔ 獨木舟船塢 ➔ 卑南石板屋 ➔ 小米田 ➔ 製陶坊 ➔ 玉器坊 ➔ 石板棺墓地 ➔ 巨木林 ➔ 礫石灘
 */

class Workstation {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius || 50;
        this.icon = config.icon;
        this.actionType = config.actionType;
        this.minEra = config.minEra || 0;
        this.outputResource = config.outputResource;
        this.outputAmount = config.outputAmount || 1;
        this.description = config.description;
        this.eraName = config.eraName;

        this.animTimer = Math.random() * 100;
        this.isHovered = false;
    }

    update() {
        this.animTimer += 0.05;
    }

    draw(ctx, currentEra, assets) {
        if (currentEra < this.minEra) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 懸停高亮
        if (this.isHovered) {
            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        switch (this.id) {
            case 'cave_camp':
                this.drawSeaCave(ctx);
                break;
            case 'coastal_shellfish':
            case 'coastal_fishing':
                this.drawShellfishReef(ctx);
                break;
            case 'forest_wood':
            case 'camphor_forest':
                this.drawCamphorForest(ctx);
                break;
            case 'wild_bushes':
                this.drawCamphorForest(ctx);
                break;
            case 'canoe_dock':
                this.drawCanoeDock(ctx, assets);
                break;
            case 'beinan_slate_house':
                this.drawSlateHouse(ctx);
                break;
            case 'millet_field':
                this.drawMilletField(ctx);
                break;
            case 'pottery_kiln':
                this.drawPotteryKiln(ctx, assets);
                break;
            case 'jade_workshop':
                this.drawJadeWorkshop(ctx, assets);
                break;
            case 'slate_cist_cemetery':
                this.drawCemetery(ctx, assets);
                break;
            case 'camphor_forest':
                this.drawCamphorForest(ctx);
                break;
            case 'pebble_quarry':
                this.drawPebbleQuarry(ctx);
                break;
        }

        // 頂部紙板站點名稱招牌
        this.drawStationSign(ctx);

        ctx.restore();
    }

    drawStationSign(ctx) {
        ctx.save();
        const signY = -this.radius - 24;

        // 厚紙板外框
        ctx.fillStyle = "#faf5ea";
        ctx.strokeStyle = "#431407";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-65, signY, 130, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#3e2716";
        ctx.font = "bold 11px 'Noto Sans TC'";
        ctx.textAlign = "center";
        ctx.fillText(`${this.icon} ${this.name}`, 0, signY + 16);
        ctx.restore();
    }

    // 1. 八仙洞海崖洞穴
    drawSeaCave(ctx) {
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(0, 0, 75, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.arc(0, 0, 50, Math.PI, Math.PI * 2);
        ctx.fill();
        // 營火
        const fSize = 14 + Math.sin(this.animTimer * 6) * 4;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(0, 10, fSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. 潮間帶魚貝淺灘 (舊石器先民潮間帶撿拾海貝、海螺與魚蟹)
    drawShellfishReef(ctx) {
        const wave = Math.sin(this.animTimer * 1.5) * 4;
        // 潮間帶海水淺波
        ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 15, 65, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // 黑色與灰色礁石
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.ellipse(-15, 12, 24, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // 貝類海螺剪紙點綴
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(10 + wave, 14, 6, 0, Math.PI * 2);
        ctx.arc(24, 16, 5, 0, Math.PI * 2);
        ctx.arc(-6, 18, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 3. 史前竹筏與獨木舟船塢
    drawCanoeDock(ctx, assets) {
        // 木棧道
        ctx.fillStyle = "#854d0e";
        ctx.fillRect(-45, 10, 90, 16);
        // 獨木舟
        const bob = Math.sin(this.animTimer * 2) * 4;
        ctx.fillStyle = "#a16207";
        ctx.beginPath();
        ctx.ellipse(0, 32 + bob, 52, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 4. 卑南板岩石板屋
    drawSlateHouse(ctx) {
        // 板岩屋壁
        ctx.fillStyle = "#475569";
        ctx.fillRect(-55, -20, 110, 55);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        for (let y = -10; y < 35; y += 12) {
            ctx.beginPath(); ctx.moveTo(-55, y); ctx.lineTo(55, y); ctx.stroke();
        }
        // 三角屋頂
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.moveTo(-65, -20); ctx.lineTo(0, -60); ctx.lineTo(65, -20);
        ctx.closePath();
        ctx.fill();
        // 木門
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-15, 5, 30, 30);
    }

    // 5. 黃金小米田
    drawMilletField(ctx) {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-50, 0, 100, 35);
        // 金黃搖曳穗浪
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 3;
        for (let x = -40; x <= 40; x += 12) {
            const sway = Math.sin(this.animTimer * 3 + x) * 6;
            ctx.beginPath();
            ctx.moveTo(x, 30);
            ctx.lineTo(x + sway, -10);
            ctx.stroke();
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(x + sway, -10, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 6. 繩紋雙耳陶窯
    drawPotteryKiln(ctx, assets) {
        // 圓拱紅陶窯
        ctx.fillStyle = "#c2410c";
        ctx.beginPath();
        ctx.arc(0, 0, 42, Math.PI, Math.PI * 2);
        ctx.fill();
        // 窯口高溫火光
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(0, 5, 18, Math.PI, Math.PI * 2);
        ctx.fill();
    }

    // 7. 花蓮豐田玉工坊
    drawJadeWorkshop(ctx, assets) {
        ctx.fillStyle = "#334155";
        ctx.fillRect(-35, -5, 70, 40);
        // 玉石原料與國寶玉玦光澤
        const pulse = 0.7 + Math.sin(this.animTimer * 4) * 0.3;
        ctx.fillStyle = `rgba(46, 160, 115, ${pulse})`;
        ctx.beginPath();
        ctx.arc(0, -10, 18, 0, Math.PI * 2);
        ctx.fill();
    }

    // 8. 都蘭山神聖石板棺墓地
    drawCemetery(ctx, assets) {
        // 板岩石柱與石板棺排列 (指示都蘭山)
        ctx.fillStyle = "#64748b";
        ctx.fillRect(-45, -15, 20, 45);
        ctx.fillRect(-10, -30, 20, 60); // 主紀念石柱
        ctx.fillRect(25, -15, 20, 45);

        // 聖光向都蘭山
        ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -30); ctx.lineTo(-30, -75);
        ctx.stroke();
    }

    // 9. 古樟巨木林
    drawCamphorForest(ctx) {
        // 粗壯樹幹
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-16, -10, 32, 50);
        // 茂密樹冠
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.arc(0, -40, 48, 0, Math.PI * 2);
        ctx.arc(-26, -30, 36, 0, Math.PI * 2);
        ctx.arc(26, -30, 36, 0, Math.PI * 2);
        ctx.fill();
    }

    // 10. 天然礫石灘
    drawPebbleQuarry(ctx) {
        ctx.fillStyle = "#64748b";
        [[-20, 10], [15, 15], [0, -5], [-35, 20], [30, 5]].forEach(([rx, ry]) => {
            ctx.beginPath();
            ctx.ellipse(rx, ry, 16, 10, 0.2, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
