window.DigiboardWidgets = window.DigiboardWidgets || {};

class SymbolWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Arbeitssymbol";
        this.size = { width: 300, height: 350 }; // Larger default
        this.states = [
            { id: 'silence', label: 'Stillarbeit', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm1.61-9.96c-2.06-.3-3.88.97-4.43 2.79-.18.58.26.96.8.75 2.56-1.03 5.09 1.57 4.07 3.99-.44 1.05-.1 2.43 1.02 2.43 1.34 0 2.22-1.29 1.74-2.55-.74-1.92-2.14-3.32-4.06-4.06-.38-.15-.76-.29-1.14-.36z' }, // Simplified "Quiet"
            { id: 'whisper', label: 'Flüstern', icon: 'M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21 1.01.33 2.05.33 3.13 0 4.41-3.59 8-8 8z' }, // Simplified Whisper
            { id: 'ask', label: 'Frag den Nachbarn', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' }, // Two people
            { id: 'group', label: 'Gruppenarbeit', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' } // Group (reuse/simulated)
        ];
        this.currentStateIndex = 0;
    }

    renderContent(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'symbol-display';
        wrapper.onclick = () => this.nextState(wrapper);

        container.appendChild(wrapper);
        this.updateDisplay(wrapper);
    }

    nextState(wrapper) {
        this.currentStateIndex = (this.currentStateIndex + 1) % this.states.length;
        this.updateDisplay(wrapper);
    }

    updateDisplay(wrapper) {
        const state = this.states[this.currentStateIndex];
        wrapper.innerHTML = `
            <svg class="symbol-icon" viewBox="0 0 24 24">
                <path d="${state.icon}"/>
            </svg>
            <div class="symbol-text">${state.label}</div>
        `;
    }
}

window.DigiboardWidgets.SymbolWidget = SymbolWidget;
