class Digiboard {
    constructor() {
        this.containerId = 'digiboard-container';
        this.manager = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Ensure dependencies
        if (!window.Digiboard || !window.Digiboard.WidgetManager) {
            console.error('Digiboard dependencies missing');
            return;
        }

        this.manager = new window.Digiboard.WidgetManager(this.containerId);
        this.renderToolbar();
        // Background picker removed in favor of global theme

        this.initialized = true;
    }

    renderToolbar() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let toolbar = container.querySelector('.digiboard-toolbar');
        if (!toolbar) {
            // Fallback: Create if missing
            toolbar = document.createElement('div');
            toolbar.className = 'digiboard-toolbar';
            container.appendChild(toolbar);
        }

        // Clear existing to avoid duplicates if re-init
        toolbar.innerHTML = '';

        const w = window.DigiboardWidgets;
        const tools = [
            { id: 'random', label: 'Zufall', class: w.RandomNameWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>' },
            { id: 'dice', label: 'Würfel', class: w.DiceWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 12c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>' },
            { id: 'drawing', label: 'Zeichnen', class: w.DrawingWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>' },
            { id: 'text', label: 'Text', class: w.TextWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>' },
            { id: 'symbol', label: 'Sozial', class: w.SymbolWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' },
            { id: 'traffic', label: 'Ampel', class: w.TrafficLightWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/><path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 19c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" style="fill:none;stroke:currentColor;stroke-width:2"/></svg>' },
            { id: 'timer', label: 'Timer', class: w.TimerWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>' },
            { id: 'clock', label: 'Uhr', class: w.ClockWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>' }
        ];

        console.log('DigiBoard: Rendering Toolbar with', tools.length, 'tools');

        tools.forEach(tool => {
            if (!tool.class) return;
            const btn = document.createElement('button');
            btn.className = 'digiboard-tool-btn';
            btn.innerHTML = `
                <div style="width: 24px; height: 24px;">${tool.icon}</div>
                <span>${tool.label}</span>
            `;

            btn.onclick = () => {
                this.manager.createWidget(tool.class);
            };
            toolbar.appendChild(btn);
        });

        // Separator removed to fix visual issue
        // const sep = document.createElement('div');
        // sep.style.width = '1px';
        // sep.style.height = '30px';
        // sep.style.background = 'rgba(255,255,255,0.2)';
        // sep.style.margin = '0 0.5rem';
        // toolbar.appendChild(sep);

        // --- Burger Menu Integration ---
        const menuContainer = document.createElement('div');
        menuContainer.className = 'digiboard-menu-container';

        // Burger Button
        const burgerBtn = document.createElement('button');
        burgerBtn.className = 'digiboard-tool-btn';
        burgerBtn.innerHTML = `
            <div style="width: 24px; height: 24px;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg></div>
            <span>Menü</span>
        `;

        // Dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'digiboard-dropdown';

        // Actions
        const actions = [
            {
                label: 'Board speichern',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>',
                action: () => this.saveBoard()
            },
            {
                label: 'Board laden',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>',
                action: () => this.loadBoard()
            },
            {
                label: 'Alles löschen',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
                action: () => this.clearBoard(),
                danger: true
            }
        ];

        actions.forEach(act => {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'digiboard-dropdown-btn' + (act.danger ? ' danger' : '');
            actionBtn.innerHTML = `${act.icon} ${act.label}`;
            actionBtn.onclick = () => {
                act.action();
                dropdown.classList.remove('active'); // Close on action
            };
            dropdown.appendChild(actionBtn);
        });

        burgerBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        };

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!menuContainer.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        menuContainer.appendChild(burgerBtn);
        menuContainer.appendChild(dropdown);
        toolbar.appendChild(menuContainer);
    }

    clearBoard() {
        if (confirm('Möchten Sie wirklich alle Widgets löschen?')) {
            this.manager.widgets.forEach(w => this.manager.removeWidget(w.id));
        }
    }

    saveBoard() {
        const widgets = this.manager.serializeWidgets();
        const data = {
            version: '1.0',
            timestamp: Date.now(),
            widgets: widgets
        };

        // Convert to XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<digiboard>\n';
        xml += `  <meta>\n    <version>${data.version}</version>\n    <timestamp>${data.timestamp}</timestamp>\n  </meta>\n`;
        xml += '  <widgets>\n';

        widgets.forEach(w => {
            // Simple XML conversion
            let attrs = `type="${w.type}" id="${w.id}" x="${w.x}" y="${w.y}" width="${w.width}" height="${w.height}" zIndex="${w.zIndex}"`;
            let content = '';

            // Custom props to child nodes or json-in-cdata
            let customProps = { ...w };
            delete customProps.type;
            delete customProps.id;
            delete customProps.x;
            delete customProps.y;
            delete customProps.width;
            delete customProps.height;
            delete customProps.zIndex;

            content = JSON.stringify(customProps);

            xml += `    <widget ${attrs}><![CDATA[${content}]]></widget>\n`;
        });

        xml += '  </widgets>\n</digiboard>';

        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `digiboard-${new Date().toISOString().slice(0, 10)}.xml`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadBoard() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/xml';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                this.parseXML(text);
            };
            reader.readAsText(file);
        };
        input.click();
    }

    parseXML(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const widgetNodes = xmlDoc.getElementsByTagName('widget');
            const widgetsData = [];

            for (let i = 0; i < widgetNodes.length; i++) {
                const node = widgetNodes[i];
                const type = node.getAttribute('type');
                const id = parseInt(node.getAttribute('id'));
                const x = parseFloat(node.getAttribute('x'));
                const y = parseFloat(node.getAttribute('y'));
                const width = parseFloat(node.getAttribute('width'));
                const height = parseFloat(node.getAttribute('height'));
                const zIndex = parseInt(node.getAttribute('zIndex'));

                const content = node.textContent; // JSON content
                const customProps = JSON.parse(content);

                widgetsData.push({
                    type, id, x, y, width, height, zIndex,
                    ...customProps
                });
            }

            this.manager.deserializeWidgets(widgetsData);

        } catch (err) {
            console.error('Failed to load board:', err);
            alert('Fehler beim Laden der Datei.');
        }
    }
}

// Global instance
window.digiboardApp = new Digiboard();

// Initial check and listeners
document.addEventListener('DOMContentLoaded', () => {
    // Other initializations if needed
});
