window.DigiboardWidgets = window.DigiboardWidgets || {};

class TrafficLightWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Ampel";
        this.title = "Ampel";
        this.resizable = true;
        this.size = { width: 150, height: 400 }; // Taller default
    }

    renderContent(container) {
        const trafficLight = document.createElement('div');
        trafficLight.className = 'traffic-light';
        trafficLight.style.width = '100%';
        trafficLight.style.height = '100%';
        trafficLight.style.padding = '0'; // Maximieren
        trafficLight.style.justifyContent = 'space-between';

        ['red', 'yellow', 'green'].forEach(color => {
            const lightWrapper = document.createElement('div');
            lightWrapper.style.flex = '1';
            lightWrapper.style.display = 'flex';
            lightWrapper.style.justifyContent = 'center';
            lightWrapper.style.alignItems = 'center';
            lightWrapper.style.width = '100%';

            const light = document.createElement('div');
            light.className = `light ${color}`;
            // Remove fixed size class dependence and use inline/flex
            light.style.width = 'auto'; // Reset CSS
            light.style.height = 'auto'; // Reset CSS
            light.style.aspectRatio = '1/1';
            light.style.height = '80%';
            light.style.maxHeight = '100%';
            light.style.borderRadius = '50%';

            light.onclick = () => {
                light.classList.toggle('active');
            };
            lightWrapper.appendChild(light);
            trafficLight.appendChild(lightWrapper);
        });

        container.appendChild(trafficLight);
    }
}

window.DigiboardWidgets.TrafficLightWidget = TrafficLightWidget;
