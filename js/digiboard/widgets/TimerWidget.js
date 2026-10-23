window.DigiboardWidgets = window.DigiboardWidgets || {};

class TimerWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Timer";
        this.mode = 'timer'; // 'timer' or 'stopwatch'
        this.timeLeft = 600; // 10 minutes default
        this.isRunning = false;
        this.interval = null;
        this.audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        this.size = { width: 350, height: 350 }; // Larger default to avoid scrolling
    }

    renderContent(container) {
        // Mode Toggle
        const toggleDiv = document.createElement('div');
        toggleDiv.style.marginBottom = '1rem';

        const btnTimer = document.createElement('button');
        btnTimer.className = 'btn-secondary';
        btnTimer.textContent = 'Sanduhr';
        btnTimer.onclick = () => this.setMode('timer', display);

        const btnStopwatch = document.createElement('button');
        btnStopwatch.className = 'btn-secondary';
        btnStopwatch.textContent = 'Stoppuhr';
        btnStopwatch.style.marginLeft = '0.5rem';
        btnStopwatch.onclick = () => this.setMode('stopwatch', display);

        toggleDiv.appendChild(btnTimer);
        toggleDiv.appendChild(btnStopwatch);
        container.appendChild(toggleDiv);

        // Display
        const display = document.createElement('div');
        display.className = 'timer-display';
        display.textContent = this.formatTime(this.timeLeft);
        container.appendChild(display);

        // Input Controls (for timer)
        const inputs = document.createElement('div');
        inputs.className = 'timer-inputs';
        inputs.style.display = 'flex';
        inputs.style.gap = '0.2rem';
        inputs.style.marginBottom = '1rem';

        const addBtn = (min) => {
            const b = document.createElement('button');
            b.className = 'btn-secondary';
            b.textContent = `+${min}m`;
            b.onclick = () => {
                this.timeLeft += min * 60;
                display.textContent = this.formatTime(this.timeLeft);
            };
            return b;
        };

        inputs.appendChild(addBtn(1));
        inputs.appendChild(addBtn(5));
        inputs.appendChild(addBtn(10));
        container.appendChild(inputs);
        this.inputsEl = inputs;

        // Controls
        const controls = document.createElement('div');
        controls.className = 'timer-controls';

        const startBtn = document.createElement('button');
        startBtn.className = 'btn-primary';
        startBtn.textContent = 'Start';
        startBtn.onclick = () => this.toggle(startBtn, display);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn-secondary';
        resetBtn.textContent = 'Reset';
        resetBtn.style.marginLeft = '0.5rem';
        resetBtn.onclick = () => this.reset(startBtn, display);

        controls.appendChild(startBtn);
        controls.appendChild(resetBtn);
        container.appendChild(controls);
    }

    setMode(mode, display) {
        this.mode = mode;
        this.reset(null, display); // Reset state
        if (mode === 'stopwatch') {
            this.timeLeft = 0;
            if (this.inputsEl) this.inputsEl.style.display = 'none';
        } else {
            this.timeLeft = 600;
            if (this.inputsEl) this.inputsEl.style.display = 'flex';
        }
        display.textContent = this.formatTime(this.timeLeft);
    }

    toggle(btn, display) {
        if (this.isRunning) {
            this.stop(btn);
        } else {
            this.start(btn, display);
        }
    }

    start(btn, display) {
        this.isRunning = true;
        btn.textContent = 'Pause';

        this.interval = setInterval(() => {
            if (this.mode === 'timer') {
                if (this.timeLeft > 0) {
                    this.timeLeft--;
                } else {
                    this.finish(btn);
                    return;
                }
            } else {
                this.timeLeft++;
            }
            display.textContent = this.formatTime(this.timeLeft);
        }, 1000);
    }

    stop(btn) {
        this.isRunning = false;
        if (btn) btn.textContent = 'Start';
        clearInterval(this.interval);
    }

    finish(btn) {
        this.stop(btn);
        this.audio.play().catch(e => console.log('Audio error:', e));
        // Visual alert
        this.element.style.backgroundColor = '#ef4444';
        setTimeout(() => this.element.style.backgroundColor = '', 1000);
    }

    reset(btn, display) {
        this.stop(btn);
        this.timeLeft = this.mode === 'timer' ? 600 : 0;
        display.textContent = this.formatTime(this.timeLeft);
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        if (h > 0) {
            return `${h}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    }
}

window.DigiboardWidgets.TimerWidget = TimerWidget;
