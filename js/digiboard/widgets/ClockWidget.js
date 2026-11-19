window.DigiboardWidgets = window.DigiboardWidgets || {};

class ClockWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Uhrzeit';
        this.title = 'Uhrzeit';
        this.size = { width: 280, height: 210 };
        this.minSize = { width: 160, height: 120 };
        this.resizable = true;

        this.displayMode = 'digital'; // 'digital' or 'analog'
        this.showSeconds = false;
        this.interval = null;
    }

    renderContent(container) {
        container.style.position = 'relative';

        const toggleBar = document.createElement('div');
        toggleBar.className = 'clock-toggle-bar';
        toggleBar.addEventListener('pointerdown', (e) => e.stopPropagation());

        const secBtn = document.createElement('button');
        secBtn.type = 'button';
        secBtn.className = 'widget-btn';
        secBtn.textContent = 'Sek';
        secBtn.title = 'Sekunden ein-/ausblenden';
        secBtn.setAttribute('aria-label', 'Sekunden ein- oder ausblenden');
        secBtn.style.fontSize = '0.72rem';
        secBtn.onclick = () => {
            this.showSeconds = !this.showSeconds;
            this.syncToggleButtons();
            this.updateDigital();
            this.notifyChange();
        };
        this.secBtn = secBtn;
        toggleBar.appendChild(secBtn);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'widget-btn';
        toggleBtn.title = 'Digital / Analog umschalten';
        toggleBtn.setAttribute('aria-label', 'Zwischen Digital- und Analoguhr wechseln');
        toggleBtn.textContent = '🔄';
        toggleBtn.onclick = () => {
            this.displayMode = this.displayMode === 'digital' ? 'analog' : 'digital';
            this.syncToggleButtons();
            this.updateDisplay();
            this.notifyChange();
        };
        this.modeBtn = toggleBtn;
        toggleBar.appendChild(toggleBtn);

        container.appendChild(toggleBar);

        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';
        contentWrapper.style.alignItems = 'center';
        contentWrapper.style.justifyContent = 'center';
        contentWrapper.style.width = '100%';
        contentWrapper.style.height = '100%';
        contentWrapper.style.minHeight = '0';
        container.appendChild(contentWrapper);
        this.contentWrapper = contentWrapper;

        this.syncToggleButtons();
        this.updateDisplay();

        const tick = () => {
            if (this.displayMode === 'digital') {
                this.updateDigital();
            } else {
                this.updateAnalog();
            }
        };

        this.interval = setInterval(tick, 1000);
        tick();
    }

    syncToggleButtons() {
        if (this.secBtn) {
            this.secBtn.style.display = this.displayMode === 'digital' ? 'inline-flex' : 'none';
            this.secBtn.classList.toggle('active', this.showSeconds);
            this.secBtn.setAttribute('aria-pressed', String(this.showSeconds));
        }
    }

    updateDisplay() {
        if (!this.contentWrapper) return;
        this.contentWrapper.innerHTML = '';

        if (this.displayMode === 'digital') {
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'timer-display';
            this.timeDisplay = timeDisplay;

            const dateDisplay = document.createElement('div');
            dateDisplay.className = 'clock-date-display';
            this.dateDisplay = dateDisplay;

            this.contentWrapper.appendChild(timeDisplay);
            this.contentWrapper.appendChild(dateDisplay);
            this.updateDigital();
            this.updateDigitalSize(this.size.width, this.size.height);
        } else {
            this.timeDisplay = null;
            this.dateDisplay = null;
            this.renderAnalog(this.contentWrapper);
            this.updateAnalog();
        }
    }

    updateDigital() {
        if (!this.timeDisplay) return;
        const now = new Date();
        const opts = this.showSeconds
            ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
            : { hour: '2-digit', minute: '2-digit' };
        this.timeDisplay.textContent = now.toLocaleTimeString('de-DE', opts);
        if (this.dateDisplay) {
            this.dateDisplay.textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    }

    renderAnalog(container) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.width = '88%';
        svg.style.height = '88%';
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';
        svg.setAttribute('aria-hidden', 'true');
        this.analogSvg = svg;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '46');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'var(--db-text)');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        for (let i = 0; i < 12; i++) {
            const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const angle = (i * 30) * Math.PI / 180;
            mark.setAttribute('x1', String(50 + 39 * Math.sin(angle)));
            mark.setAttribute('y1', String(50 - 39 * Math.cos(angle)));
            mark.setAttribute('x2', String(50 + 44 * Math.sin(angle)));
            mark.setAttribute('y2', String(50 - 44 * Math.cos(angle)));
            mark.setAttribute('stroke', 'var(--db-text)');
            mark.setAttribute('stroke-width', i % 3 === 0 ? '2.5' : '1.5');
            svg.appendChild(mark);
        }

        this.hourHand = this.createHand(50, 50, 24, 3.8, 'var(--db-text)');
        this.minuteHand = this.createHand(50, 50, 34, 2.6, 'var(--db-text)');
        this.secondHand = this.createHand(50, 50, 38, 1.2, '#ef4444');

        svg.appendChild(this.hourHand);
        svg.appendChild(this.minuteHand);
        svg.appendChild(this.secondHand);

        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', '50');
        dot.setAttribute('cy', '50');
        dot.setAttribute('r', '2.4');
        dot.setAttribute('fill', '#ef4444');
        svg.appendChild(dot);

        container.appendChild(svg);
    }

    createHand(x, y, length, width, color) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(x));
        line.setAttribute('y2', String(y - length));
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', String(width));
        line.setAttribute('stroke-linecap', 'round');
        return line;
    }

    updateAnalog() {
        if (!this.analogSvg) return;
        const now = new Date();
        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const hours = now.getHours() % 12;

        const secAngle = (seconds * 6) * Math.PI / 180;
        const minAngle = (minutes * 6 + seconds * 0.1) * Math.PI / 180;
        const hourAngle = (hours * 30 + minutes * 0.5) * Math.PI / 180;

        this.setHandAngle(this.secondHand, secAngle, 38);
        this.setHandAngle(this.minuteHand, minAngle, 34);
        this.setHandAngle(this.hourHand, hourAngle, 24);
    }

    setHandAngle(hand, angle, length) {
        if (!hand) return;
        hand.setAttribute('x2', String(50 + length * Math.sin(angle)));
        hand.setAttribute('y2', String(50 - length * Math.cos(angle)));
    }

    updateDigitalSize(w, h) {
        if (!this.timeDisplay) return;
        const factor = this.showSeconds ? 0.16 : 0.21;
        const size = Math.round(Math.max(18, Math.min(w * factor, (h - 52) * 0.42)));
        this.timeDisplay.style.fontSize = `${size}px`;
        if (this.dateDisplay) {
            this.dateDisplay.style.display = h < 145 ? 'none' : 'block';
            this.dateDisplay.style.fontSize = `${Math.max(11, Math.round(size * 0.34))}px`;
        }
    }

    onResize(w, h) {
        if (this.displayMode === 'digital') {
            this.updateDigitalSize(w, h);
        }
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            displayMode: this.displayMode,
            showSeconds: this.showSeconds
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data.displayMode === 'digital' || data.displayMode === 'analog') {
            this.displayMode = data.displayMode;
        }
        if (typeof data.showSeconds === 'boolean') {
            this.showSeconds = data.showSeconds;
        }
        this.syncToggleButtons();
        this.updateDisplay();
    }
}

window.DigiboardWidgets.ClockWidget = ClockWidget;
