/**
 * 史前文明演化 - 橫式遊戲軸線鏡頭控制器 (HORIZONTAL SIDE-SCROLLING CAMERA)
 * 支援：滑鼠拖曳、觸控滑動、鍵盤 A/D / 左右箭頭、滾輪橫移與底部迷你指南針軸軌
 */

class CameraController {
    constructor(worldWidth = 3400) {
        this.worldWidth = worldWidth;
        this.x = 0;
        this.targetX = 600; // 開局居中偏左（營地視野）
        this.y = 0;
        
        this.isDragging = false;
        this.dragStartX = 0;
        this.cameraStartX = 0;
        this.dragDistance = 0;

        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;

        this.initEvents();
    }

    resize(w, h) {
        this.screenWidth = w;
        this.screenHeight = h;
        this.clamp();
    }

    clamp() {
        const maxScroll = Math.max(0, this.worldWidth - this.screenWidth);
        this.targetX = Math.max(0, Math.min(maxScroll, this.targetX));
        this.x = Math.max(0, Math.min(maxScroll, this.x));
    }

    initEvents() {
        const canvas = document.getElementById('gameCanvas');

        // 滑鼠與觸控拖曳
        canvas.addEventListener('pointerdown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.cameraStartX = this.targetX;
            this.dragDistance = 0;
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.dragStartX;
                this.dragDistance += Math.abs(deltaX);
                this.targetX = this.cameraStartX - deltaX;
                this.clamp();
            }
        });

        window.addEventListener('pointerup', () => {
            this.isDragging = false;
        });

        // 滾輪橫向捲動
        window.addEventListener('wheel', (e) => {
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            this.targetX += delta * 0.8;
            this.clamp();
        }, { passive: true });

        // 鍵盤 A/D 與方向鍵
        window.addEventListener('keydown', (e) => {
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                this.targetX -= 80;
                this.clamp();
            } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                this.targetX += 80;
                this.clamp();
            }
        });

        // 底部指南針軌道點擊快速導航
        const track = document.getElementById('compass-track');
        if (track) {
            track.addEventListener('click', (e) => {
                const rect = track.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                this.targetX = ratio * (this.worldWidth - this.screenWidth);
                this.clamp();
            });
        }
    }

    panTo(worldX) {
        this.targetX = worldX - this.screenWidth / 2;
        this.clamp();
    }

    update() {
        // 平滑插值 (Lerp)
        this.x += (this.targetX - this.x) * 0.16;

        // 更新指南針拇指標示
        const maxScroll = Math.max(1, this.worldWidth - this.screenWidth);
        const ratio = Math.max(0, Math.min(1, this.x / maxScroll));
        const thumb = document.getElementById('compass-thumb');
        if (thumb) {
            thumb.style.left = `${ratio * (220 - 26)}px`;
        }
    }
}
