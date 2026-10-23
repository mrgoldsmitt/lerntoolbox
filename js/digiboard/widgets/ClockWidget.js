window.DigiboardWidgets = window.DigiboardWidgets || {};

class ClockWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Uhrzeit";
        this.interval = null;
        this.resizable = true;
        this.displayMode = 'digital'; // 'digital' or 'analog'
    }

    renderContent(container) {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.position = 'relative';

        // Mode Toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'widget-btn';
        toggleBtn.style.position = 'absolute';
        toggleBtn.style.top = '5px';
        toggleBtn.style.right = '5px';
        toggleBtn.style.zIndex = '5';
        toggleBtn.innerHTML = '🔄';
        toggleBtn.onclick = () => {
            this.displayMode = this.displayMode === 'digital' ? 'analog' : 'digital';
            this.updateDisplay(container);
        };
        container.appendChild(toggleBtn);

        // Content Wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';
        contentWrapper.style.alignItems = 'center';
        contentWrapper.style.justifyContent = 'center';
        contentWrapper.style.width = '100%';
        contentWrapper.style.height = '100%';
        container.appendChild(contentWrapper);
        this.contentWrapper = contentWrapper;

        this.updateDisplay(container);

        const update = () => {
            if (this.displayMode === 'digital') {
                this.updateDigital();
            } else {
                this.updateAnalog();
            }
        };

        this.interval = setInterval(update, 1000);
        update(); // Initial call

        this.onResize = (w, h) => {
            if (this.displayMode === 'digital') {
                this.updateDigitalSize(w, h);
            }
        };
    }

    updateDisplay(container) {
        this.contentWrapper.innerHTML = '';
        if (this.displayMode === 'digital') {
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'timer-display';
            timeDisplay.style.fontSize = '2.5rem';
            this.timeDisplay = timeDisplay;

            const dateDisplay = document.createElement('div');
            dateDisplay.style.color = 'rgba(255,255,255,0.7)';
            dateDisplay.style.fontSize = '1.1rem';
            this.dateDisplay = dateDisplay;

            this.contentWrapper.appendChild(timeDisplay);
            this.contentWrapper.appendChild(dateDisplay);
            this.updateDigital();
        } else {
            // Analog
            this.renderAnalog(this.contentWrapper);
            this.updateAnalog();
        }
    }

    updateDigital() {
        if (!this.timeDisplay) return;
        const now = new Date();
        this.timeDisplay.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        if (this.dateDisplay) {
            this.dateDisplay.textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    }

    renderAnalog(container) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.width = '80%';
        svg.style.height = '80%';
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';
        this.analogSvg = svg;

        // Face
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '48');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        // Hour Marks
        for (let i = 0; i < 12; i++) {
            const mark = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const angle = (i * 30) * Math.PI / 180;
            const x1 = 50 + 40 * Math.sin(angle);
            const y1 = 50 - 40 * Math.cos(angle);
            const x2 = 50 + 45 * Math.sin(angle);
            const y2 = 50 - 45 * Math.cos(angle);
            mark.setAttribute('x1', x1);
            mark.setAttribute('y1', y1);
            mark.setAttribute('x2', x2);
            mark.setAttribute('y2', y2);
            mark.setAttribute('stroke', 'white');
            mark.setAttribute('stroke-width', '2');
            svg.appendChild(mark);
        }

        // Hands
        this.hourHand = this.createHand(50, 50, 25, 4, 'white');
        this.minuteHand = this.createHand(50, 50, 35, 3, 'white');
        this.secondHand = this.createHand(50, 50, 40, 1, '#ff6b6b');

        svg.appendChild(this.hourHand);
        svg.appendChild(this.minuteHand);
        svg.appendChild(this.secondHand);

        // Center dot
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute('cx', '50');
        dot.setAttribute('cy', '50');
        dot.setAttribute('r', '2');
        dot.setAttribute('fill', '#ff6b6b');
        svg.appendChild(dot);

        container.appendChild(svg);
    }

    createHand(x, y, length, width, color) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', x);
        line.setAttribute('y1', y);
        line.setAttribute('x2', x); // Initial
        line.setAttribute('y2', y - length); // Initial
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
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

        this.setHandAngle(this.secondHand, secAngle, 40);
        this.setHandAngle(this.minuteHand, minAngle, 35);
        this.setHandAngle(this.hourHand, hourAngle, 25);
    }

    setHandAngle(hand, angle, length) {
        const x2 = 50 + length * Math.sin(angle);
        const y2 = 50 - length * Math.cos(angle);
        hand.setAttribute('x2', x2);
        hand.setAttribute('y2', y2);
    }

    updateAnalogSize() {
        // Handled by SVG viewBox
    }

    updateDigitalSize(w, h) {
        if (!this.timeDisplay) return;
        const size = Math.min(w, h) / 6;
        this.timeDisplay.style.fontSize = `${size}px`;
        if (this.dateDisplay) {
            this.dateDisplay.style.fontSize = `${size * 0.4}px`;
        }
    }

    serialize() {
        const base = super.serialize();
        return {
            ...base,
            displayMode: this.displayMode
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data.displayMode) {
            this.displayMode = data.displayMode;
            if (this.contentWrapper) {
                this.updateDisplay(this.contentWrapper.parentElement);
            }
        }
    }

    close() {
        clearInterval(this.interval);
        super.close();
    }
}

window.DigiboardWidgets.ClockWidget = ClockWidget;
