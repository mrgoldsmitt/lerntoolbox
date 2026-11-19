window.DigiboardWidgets = window.DigiboardWidgets || {};

class SymbolWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Arbeitssymbol';
        this.title = 'Arbeitssymbol';
        this.size = { width: 260, height: 290 };
        this.minSize = { width: 150, height: 160 };
        this.resizable = true;

        this.states = [
            {
                id: 'silence',
                short: 'Still',
                label: 'Stillarbeit',
                color: '#38bdf8',
                svg: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
            },
            {
                id: 'whisper',
                short: 'Flüstern',
                label: 'Flüstern',
                color: '#2dd4bf',
                svg: '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><circle cx="8" cy="10" r="1.4"/><circle cx="12" cy="10" r="1.4"/><circle cx="16" cy="10" r="1.4"/>'
            },
            {
                id: 'partner',
                short: 'Partner',
                label: 'Partnerarbeit',
                color: '#fbbf24',
                svg: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>'
            },
            {
                id: 'group',
                short: 'Gruppe',
                label: 'Gruppenarbeit',
                color: '#34d399',
                svg: '<path d="M12 5.9a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zm-6.5 1.5a1.85 1.85 0 1 1 0 3.7 1.85 1.85 0 0 1 0-3.7zm13 0a1.85 1.85 0 1 1 0 3.7 1.85 1.85 0 0 1 0-3.7zM12 11.5c2.2 0 4.4 1.05 4.4 2.75V18H7.6v-3.75c0-1.7 2.2-2.75 4.4-2.75zm-6.5.9c.7 0 1.4.14 2 .36-.56.63-.9 1.4-.9 2.24V18H2v-2.7c0-1.5 1.75-2.9 3.5-2.9zm13 0c1.75 0 3.5 1.4 3.5 2.9V18h-4.6v-3c0-.84-.34-1.61-.9-2.24.6-.22 1.3-.36 2-.36z"/>'
            }
        ];
        this.currentStateIndex = 0;
        this.selectorBtns = [];
    }

    renderContent(container) {
        container.classList.add('symbol-widget-content');

        const wrapper = document.createElement('div');
        wrapper.className = 'symbol-display';
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.title = 'Klicken zum Wechseln';
        wrapper.onclick = () => this.nextState();
        wrapper.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.nextState();
            }
        };
        this.wrapperEl = wrapper;
        container.appendChild(wrapper);

        const selector = document.createElement('div');
        selector.className = 'symbol-selector';
        this.selectorBtns = [];

        this.states.forEach((st, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'symbol-dot-btn';
            btn.textContent = st.short;
            btn.title = st.label;
            btn.onclick = () => {
                this.currentStateIndex = idx;
                this.updateDisplay();
                this.notifyChange();
            };
            this.selectorBtns.push(btn);
            selector.appendChild(btn);
        });
        container.appendChild(selector);

        this.updateDisplay();
    }

    nextState() {
        this.currentStateIndex = (this.currentStateIndex + 1) % this.states.length;
        this.updateDisplay();
        this.notifyChange();
    }

    updateDisplay() {
        if (!this.wrapperEl) return;
        const state = this.states[this.currentStateIndex] || this.states[0];
        this.wrapperEl.innerHTML = `
            <svg class="symbol-icon" viewBox="0 0 24 24" style="color: ${state.color};" aria-hidden="true">
                ${state.svg}
            </svg>
            <div class="symbol-text" style="color: ${state.color};">${state.label}</div>
        `;

        this.selectorBtns.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === this.currentStateIndex);
            btn.setAttribute('aria-pressed', String(idx === this.currentStateIndex));
        });

        this.onResize(this.size.width, this.size.height);
    }

    onResize(w, h) {
        if (!this.wrapperEl) return;
        const icon = this.wrapperEl.querySelector('.symbol-icon');
        const text = this.wrapperEl.querySelector('.symbol-text');
        const iconSize = Math.round(Math.max(36, Math.min(132, Math.min(w - 40, h - 135))));
        if (icon) {
            icon.style.width = `${iconSize}px`;
            icon.style.height = `${iconSize}px`;
        }
        if (text) {
            const fontSize = Math.round(Math.max(13, Math.min(24, iconSize * 0.2)));
            text.style.fontSize = `${fontSize}px`;
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            currentStateIndex: this.currentStateIndex
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (typeof data.currentStateIndex === 'number') {
            this.currentStateIndex = Math.max(0, Math.min(this.states.length - 1, data.currentStateIndex));
            this.updateDisplay();
        }
    }
}

window.DigiboardWidgets.SymbolWidget = SymbolWidget;
