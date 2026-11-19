window.DigiboardWidgets = window.DigiboardWidgets || {};

class TimerWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Timer';
        this.title = 'Timer';
        this.size = { width: 320, height: 330 };
        this.minSize = { width: 200, height: 210 };
        this.resizable = true;

        this.mode = 'timer'; // 'timer' or 'stopwatch'
        this.initialDuration = 600;
        this.timeLeft = 600; // seconds
        this.isRunning = false;
        this.interval = null;
        this.finishTimeout = null;
    }

    renderContent(container) {
        container.classList.add('timer-widget-content');

        // Mode Toggle
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'timer-mode-row';

        const btnTimer = document.createElement('button');
        btnTimer.type = 'button';
        btnTimer.className = 'btn-secondary';
        btnTimer.textContent = 'Sanduhr';
        btnTimer.onclick = () => this.setMode('timer');

        const btnStopwatch = document.createElement('button');
        btnStopwatch.type = 'button';
        btnStopwatch.className = 'btn-secondary';
        btnStopwatch.textContent = 'Stoppuhr';
        btnStopwatch.onclick = () => this.setMode('stopwatch');

        this.btnTimer = btnTimer;
        this.btnStopwatch = btnStopwatch;
        toggleDiv.appendChild(btnTimer);
        toggleDiv.appendChild(btnStopwatch);
        container.appendChild(toggleDiv);

        // Display
        const display = document.createElement('div');
        display.className = 'timer-display';
        display.textContent = this.formatTime(this.timeLeft);
        this.displayEl = display;
        container.appendChild(display);

        // Progress Track
        const track = document.createElement('div');
        track.className = 'timer-progress-track';
        const fill = document.createElement('div');
        fill.className = 'timer-progress-fill';
        track.appendChild(fill);
        this.progressTrack = track;
        this.progressFill = fill;
        container.appendChild(track);

        // Input Controls (for timer)
        const inputs = document.createElement('div');
        inputs.className = 'timer-inputs';

        const addAdjustBtn = (label, deltaSec, isZero = false) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn-secondary';
            b.textContent = label;
            b.onclick = () => {
                this.clearFinishedState();
                if (isZero) {
                    this.stop();
                    this.timeLeft = 0;
                    this.initialDuration = 0;
                } else {
                    this.timeLeft = Math.max(0, this.timeLeft + deltaSec);
                    if (!this.isRunning) {
                        this.initialDuration = this.timeLeft;
                    } else if (this.timeLeft > this.initialDuration) {
                        this.initialDuration = this.timeLeft;
                    }
                }
                this.updateUI();
                this.notifyChange();
            };
            return b;
        };

        inputs.appendChild(addAdjustBtn('-1m', -60));
        inputs.appendChild(addAdjustBtn('+30s', 30));
        inputs.appendChild(addAdjustBtn('+1m', 60));
        inputs.appendChild(addAdjustBtn('+5m', 300));
        inputs.appendChild(addAdjustBtn('0', 0, true));
        this.inputsEl = inputs;
        container.appendChild(inputs);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'timer-controls';

        const startBtn = document.createElement('button');
        startBtn.type = 'button';
        startBtn.className = 'btn-primary';
        startBtn.textContent = 'Start';
        startBtn.onclick = () => this.toggle();
        this.startBtn = startBtn;

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn-secondary';
        resetBtn.textContent = 'Reset';
        resetBtn.onclick = () => this.reset();

        controls.appendChild(startBtn);
        controls.appendChild(resetBtn);
        container.appendChild(controls);

        this.updateModeUI();
        this.updateUI();
        this.onResize(this.size.width, this.size.height);
    }

    updateModeUI() {
        if (this.btnTimer) {
            this.btnTimer.setAttribute('aria-pressed', String(this.mode === 'timer'));
        }
        if (this.btnStopwatch) {
            this.btnStopwatch.setAttribute('aria-pressed', String(this.mode === 'stopwatch'));
        }
        if (this.inputsEl) {
            this.inputsEl.style.display = this.mode === 'timer' ? 'flex' : 'none';
        }
        if (this.progressTrack) {
            this.progressTrack.style.display = this.mode === 'timer' ? 'block' : 'none';
        }
    }

    updateUI() {
        if (this.displayEl) {
            this.displayEl.textContent = this.formatTime(this.timeLeft);
        }
        if (this.startBtn) {
            this.startBtn.textContent = this.isRunning ? 'Pause' : 'Start';
        }
        if (this.progressFill && this.mode === 'timer') {
            const ratio = this.initialDuration > 0
                ? Math.max(0, Math.min(1, this.timeLeft / this.initialDuration))
                : 0;
            this.progressFill.style.width = `${Math.round(ratio * 100)}%`;
        }
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;
        this.stop();
        this.clearFinishedState();
        if (mode === 'stopwatch') {
            this.timeLeft = 0;
        } else {
            this.initialDuration = 600;
            this.timeLeft = 600;
        }
        this.updateModeUI();
        this.updateUI();
        this.notifyChange();
    }

    toggle() {
        this.clearFinishedState();
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (this.isRunning) return;
        if (this.mode === 'timer' && this.timeLeft <= 0) return;

        if (this.mode === 'timer' && this.initialDuration <= 0) {
            this.initialDuration = this.timeLeft;
        }

        this.isRunning = true;
        this.updateUI();

        this.interval = setInterval(() => {
            if (this.mode === 'timer') {
                if (this.timeLeft > 1) {
                    this.timeLeft--;
                    this.updateUI();
                } else {
                    this.timeLeft = 0;
                    this.updateUI();
                    this.finish();
                }
            } else {
                this.timeLeft++;
                this.updateUI();
            }
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.updateUI();
    }

    clearFinishedState() {
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }
        if (this.element) {
            this.element.classList.remove('timer-finished');
        }
    }

    playAlarm() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        try {
            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            [0, 0.22, 0.44].forEach((offset) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now + offset);
                gain.gain.setValueAtTime(0.001, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.19);
            });
            setTimeout(() => {
                ctx.close().catch(() => {});
            }, 900);
        } catch (err) {
            console.log('WebAudio chime skipped:', err);
        }
    }

    finish() {
        this.stop();
        this.playAlarm();
        if (this.element) {
            this.element.classList.add('timer-finished');
            this.finishTimeout = setTimeout(() => {
                this.finishTimeout = null;
                if (this.element) {
                    this.element.classList.remove('timer-finished');
                }
            }, 2500);
        }
        this.notifyChange();
    }

    reset() {
        this.stop();
        this.clearFinishedState();
        if (this.mode === 'timer') {
            this.timeLeft = this.initialDuration > 0 ? this.initialDuration : 600;
            if (this.initialDuration <= 0) this.initialDuration = 600;
        } else {
            this.timeLeft = 0;
        }
        this.updateUI();
        this.notifyChange();
    }

    formatTime(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;

        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        if (h > 0) {
            return `${h}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    }

    onResize(w, h) {
        if (!this.displayEl) return;
        const size = Math.round(Math.max(24, Math.min(72, Math.min(w * 0.22, (h - 140) * 0.45))));
        this.displayEl.style.fontSize = `${size}px`;
    }

    destroy() {
        this.stop();
        this.clearFinishedState();
    }

    serialize() {
        return {
            ...super.serialize(),
            mode: this.mode,
            timeLeft: this.timeLeft,
            initialDuration: this.initialDuration
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data.mode === 'timer' || data.mode === 'stopwatch') {
            this.mode = data.mode;
        }
        if (typeof data.initialDuration === 'number' && data.initialDuration >= 0) {
            this.initialDuration = data.initialDuration;
        }
        if (typeof data.timeLeft === 'number' && data.timeLeft >= 0) {
            this.timeLeft = data.timeLeft;
        }
        this.updateModeUI();
        this.updateUI();
    }
}

window.DigiboardWidgets.TimerWidget = TimerWidget;
