window.DigiboardWidgets = window.DigiboardWidgets || {};

class DiceWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Würfel';
        this.title = 'Würfel';
        this.size = { width: 340, height: 280 };
        this.minSize = { width: 180, height: 170 };
        this.resizable = true;

        this.diceCount = 1;
        this.values = [1];
        this.rollTimeout = null;
        this.countBtns = [];
    }

    renderContent(container) {
        container.classList.add('dice-widget-content');

        const controls = document.createElement('div');
        controls.className = 'dice-controls-row';
        this.countBtns = [];

        [1, 2, 3, 4].forEach((num) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-secondary';
            btn.textContent = `${num}W`;
            btn.title = `${num} Würfel`;
            btn.setAttribute('aria-pressed', String(num === this.diceCount));
            btn.onclick = () => this.setDiceCount(num);
            this.countBtns.push({ num, btn });
            controls.appendChild(btn);
        });
        container.appendChild(controls);

        const diceContainer = document.createElement('div');
        diceContainer.className = 'dice-container';
        this.diceContainer = diceContainer;
        container.appendChild(diceContainer);

        const footer = document.createElement('div');
        footer.className = 'dice-footer-row';

        const rollBtn = document.createElement('button');
        rollBtn.type = 'button';
        rollBtn.className = 'btn-primary';
        rollBtn.textContent = 'Würfeln';
        rollBtn.onclick = () => this.rollDice();
        footer.appendChild(rollBtn);

        const sumBadge = document.createElement('span');
        sumBadge.className = 'dice-sum';
        this.sumEl = sumBadge;
        footer.appendChild(sumBadge);

        container.appendChild(footer);

        this.renderDice();
    }

    setDiceCount(count) {
        this.diceCount = Math.max(1, Math.min(4, count));
        while (this.values.length < this.diceCount) {
            this.values.push(1);
        }
        this.values = this.values.slice(0, this.diceCount);

        this.countBtns.forEach(({ num, btn }) => {
            btn.setAttribute('aria-pressed', String(num === this.diceCount));
        });

        this.renderDice();
        this.notifyChange();
    }

    renderDice() {
        if (!this.diceContainer) return;
        this.diceContainer.innerHTML = '';

        for (let i = 0; i < this.diceCount; i++) {
            const val = this.values[i] || 1;
            const die = document.createElement('button');
            die.type = 'button';
            die.className = 'die';
            die.setAttribute('aria-label', `Würfel ${i + 1}: ${val}. Klicken zum Würfeln`);
            die.innerHTML = this.getDieFace(val);
            die.onclick = () => this.rollDice();
            this.diceContainer.appendChild(die);
        }

        this.updateSum();
        this.onResize(this.size.width, this.size.height);
    }

    updateSum() {
        if (!this.sumEl) return;
        if (this.diceCount > 1) {
            const total = this.values.slice(0, this.diceCount).reduce((a, b) => a + b, 0);
            this.sumEl.textContent = `Summe: ${total}`;
            this.sumEl.style.display = 'inline-block';
        } else {
            this.sumEl.style.display = 'none';
        }
    }

    rollDice() {
        if (!this.diceContainer) return;
        if (this.rollTimeout) {
            clearTimeout(this.rollTimeout);
            this.rollTimeout = null;
        }

        const dice = this.diceContainer.querySelectorAll('.die');
        dice.forEach((die) => {
            die.classList.remove('rolling');
            void die.offsetWidth; // restart animation
            die.classList.add('rolling');
        });

        this.rollTimeout = setTimeout(() => {
            this.rollTimeout = null;
            const nextValues = [];
            dice.forEach((die, idx) => {
                const result = Math.floor(Math.random() * 6) + 1;
                nextValues.push(result);
                die.innerHTML = this.getDieFace(result);
                die.setAttribute('aria-label', `Würfel ${idx + 1}: ${result}. Klicken zum Würfeln`);
                die.classList.remove('rolling');
            });
            this.values = nextValues;
            this.updateSum();
            this.notifyChange();
        }, 420);
    }

    onResize(w, h) {
        if (!this.diceContainer) return;
        const availW = Math.max(100, w - 32);
        const availH = Math.max(60, h - 125);
        const gap = 10;

        let cols = this.diceCount;
        let rows = 1;
        if (this.diceCount === 4 && availW < availH * 2) {
            cols = 2;
            rows = 2;
        } else if (this.diceCount === 3 && availW < 220) {
            cols = 2;
            rows = 2;
        }

        const maxByW = (availW - gap * (cols - 1)) / cols;
        const maxByH = (availH - gap * (rows - 1)) / rows;
        const dieSize = Math.round(Math.max(36, Math.min(115, maxByW, maxByH)));

        this.diceContainer.querySelectorAll('.die').forEach((die) => {
            die.style.width = `${dieSize}px`;
            die.style.height = `${dieSize}px`;
        });
    }

    getDieFace(num) {
        const dots = {
            1: '<circle cx="50" cy="50" r="10"/>',
            2: '<circle cx="26" cy="26" r="10"/><circle cx="74" cy="74" r="10"/>',
            3: '<circle cx="24" cy="24" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="76" cy="76" r="10"/>',
            4: '<circle cx="26" cy="26" r="10"/><circle cx="74" cy="26" r="10"/><circle cx="26" cy="74" r="10"/><circle cx="74" cy="74" r="10"/>',
            5: '<circle cx="26" cy="26" r="10"/><circle cx="74" cy="26" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="26" cy="74" r="10"/><circle cx="74" cy="74" r="10"/>',
            6: '<circle cx="28" cy="22" r="10"/><circle cx="72" cy="22" r="10"/><circle cx="28" cy="50" r="10"/><circle cx="72" cy="50" r="10"/><circle cx="28" cy="78" r="10"/><circle cx="72" cy="78" r="10"/>'
        };
        return `<svg viewBox="0 0 100 100" fill="#1f2937" aria-hidden="true">${dots[num] || dots[1]}</svg>`;
    }

    destroy() {
        if (this.rollTimeout) {
            clearTimeout(this.rollTimeout);
            this.rollTimeout = null;
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            diceCount: this.diceCount,
            values: [...this.values]
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (typeof data.diceCount === 'number' && data.diceCount >= 1 && data.diceCount <= 4) {
            this.diceCount = data.diceCount;
        }
        if (Array.isArray(data.values) && data.values.length > 0) {
            this.values = data.values.map((v) => Math.max(1, Math.min(6, parseInt(v, 10) || 1)));
        }
        this.countBtns.forEach(({ num, btn }) => {
            btn.setAttribute('aria-pressed', String(num === this.diceCount));
        });
        this.renderDice();
    }
}

window.DigiboardWidgets.DiceWidget = DiceWidget;
