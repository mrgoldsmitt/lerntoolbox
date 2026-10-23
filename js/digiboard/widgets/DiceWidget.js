window.DigiboardWidgets = window.DigiboardWidgets || {};

class DiceWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Würfel";
        this.size = { width: 450, height: 300 }; // Wider to fit buttons
        this.diceCount = 1;
    }

    renderContent(container) {
        const controls = document.createElement('div');
        controls.style.marginBottom = '1rem';

        [1, 2, 3].forEach(num => {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.textContent = `${num} Würfel`;
            btn.style.marginRight = '5px';
            btn.onclick = () => this.setDiceCount(num, diceContainer);
            controls.appendChild(btn);
        });
        container.appendChild(controls);

        const diceContainer = document.createElement('div');
        diceContainer.className = 'dice-container';
        container.appendChild(diceContainer);

        this.renderDice(diceContainer);
    }

    setDiceCount(count, container) {
        this.diceCount = count;
        this.renderDice(container);
    }

    renderDice(container) {
        container.innerHTML = '';
        for (let i = 0; i < this.diceCount; i++) {
            const die = document.createElement('div');
            die.className = 'die';
            die.innerHTML = this.getDieFace(1); // Default 1
            die.onclick = () => this.rollDice(container);
            container.appendChild(die);
        }
    }

    rollDice(container) {
        const dice = container.querySelectorAll('.die');
        dice.forEach(die => {
            die.classList.add('rolling');

            setTimeout(() => {
                const result = Math.floor(Math.random() * 6) + 1;
                die.innerHTML = this.getDieFace(result);
                die.classList.remove('rolling');
            }, 500);
        });
    }

    getDieFace(num) {
        // SVG mappings for dice faces
        const dots = {
            1: '<circle cx="50" cy="50" r="10"/>',
            2: '<circle cx="25" cy="25" r="10"/><circle cx="75" cy="75" r="10"/>',
            3: '<circle cx="20" cy="20" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="80" cy="80" r="10"/>',
            4: '<circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/>',
            5: '<circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/>',
            6: '<circle cx="25" cy="20" r="10"/><circle cx="75" cy="20" r="10"/><circle cx="25" cy="50" r="10"/><circle cx="75" cy="50" r="10"/><circle cx="25" cy="80" r="10"/><circle cx="75" cy="80" r="10"/>'
        };

        return `<svg viewBox="0 0 100 100" fill="#333">${dots[num]}</svg>`;
    }
}

window.DigiboardWidgets.DiceWidget = DiceWidget;
