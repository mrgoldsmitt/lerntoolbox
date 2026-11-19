window.DigiboardWidgets = window.DigiboardWidgets || {};

class RandomNameWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Zufallsname';
        this.title = 'Zufallsname';
        this.size = { width: 300, height: 370 };
        this.minSize = { width: 190, height: 220 };
        this.resizable = true;

        this.rawText = '';
        this.noRepeat = false;
        this.usedNames = [];
        this.lastPicked = '?';
        this.pickInterval = null;
        this.popTimeout = null;
    }

    getAllNames() {
        return this.rawText
            .split('\n')
            .map((n) => n.trim())
            .filter((n) => n.length > 0);
    }

    renderContent(container) {
        container.classList.add('random-name-content');

        // Input Area
        const input = document.createElement('textarea');
        input.className = 'random-name-input';
        input.placeholder = 'Namen eingeben (einer pro Zeile)';
        input.value = this.rawText;
        input.setAttribute('aria-label', 'Namensliste');
        input.addEventListener('pointerdown', (e) => e.stopPropagation());
        input.oninput = (e) => {
            this.rawText = e.target.value;
            this.updateCounter();
            this.notifyChange();
        };
        this.inputEl = input;
        container.appendChild(input);

        // Options Row
        const optionsRow = document.createElement('div');
        optionsRow.className = 'random-name-options';

        const label = document.createElement('label');
        label.className = 'random-name-checkbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.noRepeat;
        checkbox.onchange = () => {
            this.noRepeat = checkbox.checked;
            if (!this.noRepeat) {
                this.usedNames = [];
            }
            this.updateCounter();
            this.notifyChange();
        };
        this.noRepeatCheckbox = checkbox;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode('Ohne Wiederholung'));
        optionsRow.appendChild(label);

        const counterSpan = document.createElement('span');
        this.counterEl = counterSpan;
        optionsRow.appendChild(counterSpan);
        container.appendChild(optionsRow);

        // Display Area
        const display = document.createElement('div');
        display.className = 'name-display';
        display.textContent = this.lastPicked || '?';
        this.displayEl = display;
        container.appendChild(display);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'random-name-actions';

        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'btn-primary';
        pickBtn.textContent = 'Wählen';
        pickBtn.onclick = () => this.pickRandom();
        controls.appendChild(pickBtn);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn-secondary';
        resetBtn.title = 'Gezogene Namen zurücksetzen';
        resetBtn.setAttribute('aria-label', 'Gezogene Namen zurücksetzen');
        resetBtn.textContent = '↺';
        resetBtn.onclick = () => {
            this.usedNames = [];
            this.lastPicked = '?';
            if (this.displayEl) {
                this.displayEl.textContent = '?';
            }
            this.updateCounter();
            this.notifyChange();
        };
        this.resetUsedBtn = resetBtn;
        controls.appendChild(resetBtn);

        container.appendChild(controls);

        this.updateCounter();
        this.onResize(this.size.width, this.size.height);
    }

    updateCounter() {
        const all = this.getAllNames();
        const usedSet = new Set(this.usedNames);
        const remaining = this.noRepeat
            ? all.filter((n) => !usedSet.has(n)).length
            : all.length;

        if (this.counterEl) {
            this.counterEl.textContent = this.noRepeat
                ? `Übrig: ${remaining}/${all.length}`
                : `Namen: ${all.length}`;
        }
        if (this.resetUsedBtn) {
            this.resetUsedBtn.style.display = this.noRepeat || this.usedNames.length > 0 ? 'inline-flex' : 'none';
        }
    }

    pickRandom() {
        if (!this.displayEl) return;
        this.clearAnimationTimers();

        const all = this.getAllNames();
        if (all.length === 0) {
            this.displayEl.textContent = 'Bitte Namen eingeben';
            return;
        }

        const usedSet = new Set(this.usedNames);
        const pool = this.noRepeat ? all.filter((n) => !usedSet.has(n)) : all;

        if (pool.length === 0) {
            this.displayEl.textContent = 'Alle dran gewesen!';
            return;
        }

        const winner = pool[Math.floor(Math.random() * pool.length)];
        let count = 0;

        this.pickInterval = setInterval(() => {
            const preview = pool[Math.floor(Math.random() * pool.length)];
            this.displayEl.textContent = preview;
            count++;

            if (count >= 8) {
                clearInterval(this.pickInterval);
                this.pickInterval = null;

                this.displayEl.textContent = winner;
                this.lastPicked = winner;
                if (this.noRepeat && !usedSet.has(winner)) {
                    this.usedNames.push(winner);
                }
                this.updateCounter();

                this.displayEl.style.transform = 'scale(1.16)';
                this.popTimeout = setTimeout(() => {
                    if (this.displayEl) {
                        this.displayEl.style.transform = 'scale(1)';
                    }
                    this.popTimeout = null;
                }, 200);

                this.notifyChange();
            }
        }, 70);
    }

    clearAnimationTimers() {
        if (this.pickInterval) {
            clearInterval(this.pickInterval);
            this.pickInterval = null;
        }
        if (this.popTimeout) {
            clearTimeout(this.popTimeout);
            this.popTimeout = null;
        }
    }

    onResize(w, h) {
        if (!this.displayEl) return;
        const size = Math.max(18, Math.min(44, Math.min(w * 0.11, h * 0.11)));
        this.displayEl.style.fontSize = `${Math.round(size)}px`;
    }

    destroy() {
        this.clearAnimationTimers();
    }

    serialize() {
        return {
            ...super.serialize(),
            rawText: this.rawText,
            noRepeat: this.noRepeat,
            usedNames: [...this.usedNames],
            lastPicked: this.lastPicked
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (typeof data.rawText === 'string') {
            this.rawText = data.rawText;
            if (this.inputEl) this.inputEl.value = this.rawText;
        }
        if (typeof data.noRepeat === 'boolean') {
            this.noRepeat = data.noRepeat;
            if (this.noRepeatCheckbox) this.noRepeatCheckbox.checked = this.noRepeat;
        }
        if (Array.isArray(data.usedNames)) {
            this.usedNames = data.usedNames.filter((n) => typeof n === 'string');
        }
        if (typeof data.lastPicked === 'string') {
            this.lastPicked = data.lastPicked;
            if (this.displayEl) this.displayEl.textContent = this.lastPicked;
        }
        this.updateCounter();
    }
}

window.DigiboardWidgets.RandomNameWidget = RandomNameWidget;
