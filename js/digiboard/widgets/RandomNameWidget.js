window.DigiboardWidgets = window.DigiboardWidgets || {};

class RandomNameWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Zufallsname";
        this.size = { width: 300, height: 400 }; // Larger default
        this.names = [];
    }

    renderContent(container) {
        // Input Area
        const input = document.createElement('textarea');
        input.className = 'random-name-input';
        input.placeholder = "Namen eingeben (einer pro Zeile)";
        input.oninput = (e) => {
            this.names = e.target.value.split('\n').filter(n => n.trim() !== '');
        };
        container.appendChild(input);

        // Display Area
        const display = document.createElement('div');
        display.className = 'name-display';
        display.textContent = "?";
        container.appendChild(display);

        // Controls
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.marginTop = '1rem';
        controls.style.gap = '0.5rem';

        const pickBtn = document.createElement('button');
        pickBtn.className = 'btn-primary';
        pickBtn.textContent = "Wählen";
        pickBtn.onclick = () => this.pickRandom(display);
        controls.appendChild(pickBtn);

        container.appendChild(controls);
    }

    pickRandom(displayEl) {
        if (this.names.length === 0) return;

        // Simple animation effect
        let count = 0;
        const interval = setInterval(() => {
            const random = this.names[Math.floor(Math.random() * this.names.length)];
            displayEl.textContent = random;
            count++;
            if (count > 10) {
                clearInterval(interval);
                displayEl.style.transform = "scale(1.2)";
                setTimeout(() => displayEl.style.transform = "scale(1)", 200);
            }
        }, 100);
    }
}
window.DigiboardWidgets.RandomNameWidget = RandomNameWidget;
