/**
 * 史前文明演化 - 原生 Web Audio API 沉浸音效引擎 (PREHISTORIC SOUNDSCAPE)
 * 無需外部音訊檔，純程式化振盪器合成：海潮、石器敲砸、伐木、水花、划船、琢玉鐘鳴、木鼓吹管
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicStarted = false;
        this.backgroundMusic = new Audio('media/background/stones_for_the_fire.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.preload = 'auto';
        this.backgroundMusic.volume = 0.24;
        this.specialMusic = null;
        this.festivalMusic = new Audio('media/festival/beneath_the_sacred_stone.mp3');
        this.funeralMusic = new Audio('media/funeral/the_last_stone_laid.mp3');
        [this.festivalMusic, this.funeralMusic].forEach(track => {
            track.loop = true;
            track.preload = 'auto';
            track.volume = 0.34;
        });
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 背景音樂：啟動時先嘗試播放；若瀏覽器攔截自動播放，第一次玩家操作時會再次啟動。
    startBackgroundMusic() {
        if (!this.enabled || this.musicStarted || this.specialMusic) return;
        const playAttempt = this.backgroundMusic.play();
        if (playAttempt && playAttempt.then) {
            playAttempt.then(() => { this.musicStarted = true; }).catch(() => {});
        } else {
            this.musicStarted = true;
        }
    }

    stopBackgroundMusic() {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
        this.musicStarted = false;
    }

    playSpecialMusic(track) {
        if (!this.enabled || !track) return;
        this.stopBackgroundMusic();
        if (this.specialMusic && this.specialMusic !== track) {
            this.specialMusic.pause();
            this.specialMusic.currentTime = 0;
        }
        this.specialMusic = track;
        track.currentTime = 0;
        const playAttempt = track.play();
        if (playAttempt && playAttempt.catch) playAttempt.catch(() => {});
    }

    playFestivalMusic() {
        this.playSpecialMusic(this.festivalMusic);
    }

    playFuneralMusic() {
        this.playSpecialMusic(this.funeralMusic);
    }

    stopSpecialMusic() {
        if (!this.specialMusic) return;
        this.specialMusic.pause();
        this.specialMusic.currentTime = 0;
        this.specialMusic = null;
        this.startBackgroundMusic();
    }

    toggleBackgroundMusic() {
        if (this.backgroundMusic.paused) {
            this.musicStarted = false;
            this.startBackgroundMusic();
        } else {
            this.backgroundMusic.pause();
            this.musicStarted = false;
        }
    }

    // 基礎單音合成
    playTone(freq, type, duration, gainVal = 0.15) {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    // 1. 敲擊天然礫石打製砍砸器 (清脆堅硬撞擊聲)
    playStoneChip() {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(620 + Math.random() * 80, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch (e) {}
    }

    // 2. 石斧伐木劈砍 (沉厚木質撞擊聲)
    playWoodChop() {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    // 3. 刺魚與水花飛濺 (柔和正弦下沉)
    playFishSplash() {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(380, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.22);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.22);
        } catch (e) {}
    }

    // 4. 划船木槳劃水 (兩段式水流聲)
    playCanoePaddle() {
        this.playFishSplash();
        setTimeout(() => this.playTone(180, 'sine', 0.2, 0.12), 90);
    }

    // 5. 麻繩結網紡紗沙沙聲
    playNetWeave() {
        this.playTone(420, 'triangle', 0.12, 0.12);
    }

    // 6. 琢磨國寶「人獸形玉玦」空靈鐘鳴金石之聲
    playJadeChime() {
        if (!this.enabled) return;
        this.init();
        const base = 880; // A5
        this.playTone(base, 'sine', 0.6, 0.2);
        setTimeout(() => this.playTone(base * 1.5, 'sine', 0.8, 0.15), 60);
        setTimeout(() => this.playTone(base * 2.0, 'sine', 0.9, 0.1), 120);
    }

    // 7. 神聖墓葬儀典：史前骨笛吹管與空心木鼓 (莊嚴肅穆)
    playAncestralDirge() {
        if (!this.enabled) return;
        this.init();
        // 沉厚空心木鼓咚咚聲
        const drum = (delay, freq) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.35, 0.3);
            }, delay);
        };
        drum(0, 95);
        drum(240, 85);
        drum(480, 110);
        drum(720, 80);

        // 悠遠骨笛吹管飄揚
        const fluteNotes = [330, 392, 440, 523, 440];
        fluteNotes.forEach((f, idx) => {
            setTimeout(() => {
                this.playTone(f, 'sine', 0.5, 0.15);
            }, 300 + idx * 260);
        });
    }

    // 8. 天災暴風雷鳴
    playDisasterThunder() {
        if (!this.enabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 1.2);
            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 1.2);
        } catch (e) {}
    }

    // 9. 猛獸咆哮 (低頻方波)
    playBeastRoar() {
        this.playTone(110, 'sawtooth', 0.5, 0.3);
        setTimeout(() => this.playTone(85, 'square', 0.4, 0.25), 80);
    }

    // 10. 時代躍遷雄偉號角
    playEvolutionFanfare() {
        const fanfare = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        fanfare.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.7, 0.25);
            }, idx * 120);
        });
    }
}
