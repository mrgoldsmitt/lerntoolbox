window.DigiboardWidgets = window.DigiboardWidgets || {};

class TrafficLightWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Ampel';
        this.title = 'Ampel';
        this.size = { width: 150, height: 340 };
        this.minSize = { width: 110, height: 200 };
        this.resizable = true;

        this.activeLights = {
            red: false,
            yellow: false,
            green: false
        };
        this.lightEls = {};
    }

    renderContent(container) {
        container.classList.add('traffic-light-content');

        const trafficLight = document.createElement('div');
        trafficLight.className = 'traffic-light';
        this.trafficLightEl = trafficLight;

        const labels = { red: 'Rot', yellow: 'Gelb', green: 'Grün' };
        this.lightEls = {};

        ['red', 'yellow', 'green'].forEach((color) => {
            const light = document.createElement('button');
            light.type = 'button';
            light.className = `light ${color}`;
            light.setAttribute('aria-label', `Ampel ${labels[color]}`);
            light.setAttribute('aria-pressed', String(Boolean(this.activeLights[color])));
            if (this.activeLights[color]) {
                light.classList.add('active');
            }

            light.onclick = () => {
                this.activeLights[color] = !this.activeLights[color];
                light.classList.toggle('active', this.activeLights[color]);
                light.setAttribute('aria-pressed', String(this.activeLights[color]));
                this.notifyChange();
            };

            this.lightEls[color] = light;
            trafficLight.appendChild(light);
        });

        container.appendChild(trafficLight);
        this.onResize(this.size.width, this.size.height);
    }

    onResize(w, h) {
        if (!this.lightEls) return;
        const availW = Math.max(60, w - 24);
        const availH = Math.max(120, h - 64);
        const diameter = Math.round(Math.max(24, Math.min(availW - 20, (availH - 36) / 3)));

        Object.values(this.lightEls).forEach((el) => {
            el.style.width = `${diameter}px`;
            el.style.height = `${diameter}px`;
        });
    }

    serialize() {
        return {
            ...super.serialize(),
            activeLights: { ...this.activeLights }
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data.activeLights && typeof data.activeLights === 'object') {
            ['red', 'yellow', 'green'].forEach((color) => {
                this.activeLights[color] = Boolean(data.activeLights[color]);
                if (this.lightEls[color]) {
                    this.lightEls[color].classList.toggle('active', this.activeLights[color]);
                    this.lightEls[color].setAttribute('aria-pressed', String(this.activeLights[color]));
                }
            });
        }
    }
}

window.DigiboardWidgets.TrafficLightWidget = TrafficLightWidget;
