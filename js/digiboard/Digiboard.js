class Digiboard {
    constructor() {
        this.containerId = 'digiboard-container';
        this.manager = null;
        this.initialized = false;
        this.saveTimer = null;
        this.menuBtn = null;
        this.menuPopover = null;
        this.supportsPopover = Object.hasOwn(HTMLElement.prototype, 'popover');
    }

    init() {
        if (this.initialized) return;

        if (!window.Digiboard || !window.Digiboard.WidgetManager) {
            console.error('Digiboard dependencies missing');
            return;
        }

        this.manager = new window.Digiboard.WidgetManager(this.containerId);
        this.manager.onChangeCallback = () => this.scheduleSave();

        this.renderToolbar();

        if (Array.isArray(window.__pendingDigiboardState) && window.__pendingDigiboardState.length > 0) {
            const pending = window.__pendingDigiboardState;
            window.__pendingDigiboardState = null;
            this.manager.deserializeWidgets(pending);
        } else {
            this.manager.updateEmptyHint();
        }

        this.initialized = true;
    }

    onActivate() {
        if (!this.initialized) {
            this.init();
        }
        if (!this.manager) return;

        requestAnimationFrame(() => {
            this.manager.clampAllWidgets();
            this.manager.widgets.forEach((w) => {
                if (typeof w.onResize === 'function') {
                    w.onResize(w.size.width, w.size.height);
                }
            });
            this.manager.updateEmptyHint();
        });
    }

    scheduleSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            if (typeof saveAppState === 'function') {
                saveAppState();
            }
        }, 250);
    }

    announce(message) {
        const statusEl = document.getElementById('digiboard-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    renderToolbar() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let toolbar = container.querySelector('.digiboard-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.className = 'digiboard-toolbar';
            container.appendChild(toolbar);
        }

        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('focusgroup', 'toolbar wrap');
        toolbar.setAttribute('aria-label', 'DigiBoard Werkzeuge');
        toolbar.innerHTML = '';

        const w = window.DigiboardWidgets || {};
        const tools = [
            { id: 'random', label: 'Zufall', title: 'Zufallsname hinzufügen', class: w.RandomNameWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>' },
            { id: 'dice', label: 'Würfel', title: 'Würfel hinzufügen', class: w.DiceWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 4c.83 0 1.5.67 1.5 1.5S15.83 10 15 10s-1.5-.67-1.5-1.5S14.17 7 15 7zm-6 0c.83 0 1.5.67 1.5 1.5S9.83 10 9 10s-1.5-.67-1.5-1.5S8.17 7 9 7zm3 3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM9 14c.83 0 1.5.67 1.5 1.5S9.83 17 9 17s-1.5-.67-1.5-1.5S8.17 14 9 14zm6 0c.83 0 1.5.67 1.5 1.5S15.83 17 15 17s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg>' },
            { id: 'drawing', label: 'Zeichnen', title: 'Zeichenfeld hinzufügen', class: w.DrawingWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>' },
            { id: 'text', label: 'Text', title: 'Textnotiz hinzufügen', class: w.TextWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' },
            { id: 'symbol', label: 'Sozial', title: 'Sozialform-Symbol hinzufügen', class: w.SymbolWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' },
            { id: 'traffic', label: 'Ampel', title: 'Ampel hinzufügen', class: w.TrafficLightWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 2H8C6.9 2 6 2.9 6 4v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>' },
            { id: 'timer', label: 'Timer', title: 'Timer / Stoppuhr hinzufügen', class: w.TimerWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>' },
            { id: 'clock', label: 'Uhr', title: 'Uhr hinzufügen', class: w.ClockWidget, icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>' }
        ];

        const toolsGroup = document.createElement('div');
        toolsGroup.className = 'digiboard-toolbar-tools';
        toolsGroup.setAttribute('role', 'group');
        toolsGroup.setAttribute('aria-label', 'Widgets hinzufügen');

        tools.forEach((tool) => {
            if (!tool.class) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'digiboard-tool-btn';
            btn.dataset.toolId = tool.id;
            btn.title = tool.title;
            btn.setAttribute('aria-label', tool.title);
            btn.innerHTML = `${tool.icon}<span>${tool.label}</span>`;

            btn.onclick = () => {
                const created = this.manager.createWidget(tool.class);
                if (created) {
                    this.announce(`${created.title} geöffnet`);
                }
            };
            toolsGroup.appendChild(btn);
        });

        toolbar.appendChild(toolsGroup);

        const sep = document.createElement('span');
        sep.className = 'digiboard-toolbar-sep';
        sep.setAttribute('role', 'separator');
        sep.setAttribute('aria-orientation', 'vertical');
        toolbar.appendChild(sep);

        // --- Burger Menu Integration ---
        const menuContainer = document.createElement('div');
        menuContainer.className = 'digiboard-menu-container';

        const burgerBtn = document.createElement('button');
        burgerBtn.type = 'button';
        burgerBtn.className = 'digiboard-tool-btn digiboard-menu-btn';
        burgerBtn.title = 'Board-Menü';
        burgerBtn.setAttribute('aria-label', 'Board-Menü');
        burgerBtn.setAttribute('aria-expanded', 'false');
        burgerBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg><span>Menü</span>';

        const dropdown = document.createElement('div');
        dropdown.id = 'digiboard-menu-popover';
        dropdown.className = 'digiboard-dropdown';

        if (this.supportsPopover) {
            dropdown.setAttribute('popover', 'auto');
            burgerBtn.setAttribute('popovertarget', 'digiboard-menu-popover');
        }

        const actions = [
            {
                label: 'Board speichern (XML)',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>',
                action: () => this.saveBoard()
            },
            {
                label: 'Board laden (XML)',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>',
                action: () => this.loadBoard()
            },
            {
                label: 'Fenster anordnen',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>',
                action: () => {
                    this.manager.arrangeWidgets();
                    this.announce('Fenster wurden angeordnet');
                }
            },
            {
                label: 'Alles löschen',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
                action: () => this.clearBoard(),
                danger: true
            }
        ];

        actions.forEach((act) => {
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.className = 'digiboard-dropdown-btn' + (act.danger ? ' danger' : '');
            actionBtn.innerHTML = `${act.icon}<span>${act.label}</span>`;
            actionBtn.onclick = () => {
                this.closeMenu();
                act.action();
            };
            dropdown.appendChild(actionBtn);
        });

        const positionFallbackPopover = () => {
            const t = burgerBtn.getBoundingClientRect();
            const m = dropdown.getBoundingClientRect();
            const below = t.bottom + 6 + m.height <= window.innerHeight;
            const top = below ? t.bottom + 6 : Math.max(8, t.top - m.height - 6);
            const left = Math.max(8, Math.min(t.right - m.width, window.innerWidth - m.width - 8));
            dropdown.style.top = `${Math.round(top)}px`;
            dropdown.style.left = `${Math.round(left)}px`;
        };

        if (this.supportsPopover) {
            dropdown.addEventListener('toggle', (e) => {
                const isOpen = e.newState === 'open';
                burgerBtn.setAttribute('aria-expanded', String(isOpen));
                if (isOpen && !CSS.supports('position-area', 'block-end')) {
                    positionFallbackPopover();
                }
            });
        } else {
            burgerBtn.onclick = (e) => {
                e.stopPropagation();
                const willOpen = !dropdown.classList.contains('active');
                dropdown.classList.toggle('active', willOpen);
                burgerBtn.setAttribute('aria-expanded', String(willOpen));
                if (willOpen) {
                    requestAnimationFrame(positionFallbackPopover);
                }
            };

            if (!this._outsideClickHandler) {
                this._outsideClickHandler = (e) => {
                    if (this.menuPopover && !this.menuPopover.contains(e.target) && e.target !== this.menuBtn && !this.menuBtn?.contains(e.target)) {
                        this.closeMenu();
                    }
                };
                document.addEventListener('click', this._outsideClickHandler);
            }
        }

        menuContainer.appendChild(burgerBtn);
        menuContainer.appendChild(dropdown);
        toolbar.appendChild(menuContainer);

        this.menuBtn = burgerBtn;
        this.menuPopover = dropdown;

        // Roving tabindex fallback where native focusgroup is unsupported
        if (!('focusGroup' in HTMLElement.prototype)) {
            const items = Array.from(toolbar.querySelectorAll('.digiboard-tool-btn'));
            items.forEach((b, i) => {
                b.tabIndex = i === 0 ? 0 : -1;
            });

            toolbar.addEventListener('focusin', ({ target }) => {
                if (items.includes(target)) {
                    items.forEach((b) => {
                        b.tabIndex = b === target ? 0 : -1;
                    });
                }
            });

            toolbar.addEventListener('keydown', (e) => {
                const currentIdx = items.indexOf(document.activeElement);
                if (currentIdx === -1) return;

                const rtl = getComputedStyle(toolbar).direction === 'rtl';
                const steps = {
                    ArrowRight: rtl ? -1 : 1,
                    ArrowLeft: rtl ? 1 : -1
                };

                let nextIdx = null;
                if (e.key in steps) {
                    nextIdx = (currentIdx + steps[e.key] + items.length) % items.length;
                } else if (e.key === 'Home') {
                    nextIdx = 0;
                } else if (e.key === 'End') {
                    nextIdx = items.length - 1;
                }

                if (nextIdx !== null) {
                    e.preventDefault();
                    items[nextIdx].focus();
                }
            });
        }
    }

    closeMenu() {
        if (this.menuPopover) {
            if (this.supportsPopover && typeof this.menuPopover.hidePopover === 'function') {
                try {
                    if (this.menuPopover.matches(':popover-open')) {
                        this.menuPopover.hidePopover();
                    }
                } catch (_) {
                    // Ignore if already closed
                }
            }
            this.menuPopover.classList.remove('active');
        }
        if (this.menuBtn) {
            this.menuBtn.setAttribute('aria-expanded', 'false');
        }
    }

    clearBoard() {
        if (!this.manager || this.manager.widgets.length === 0) {
            this.announce('Keine Fenster zum Löschen vorhanden');
            return;
        }
        if (confirm('Möchten Sie wirklich alle Widgets löschen?')) {
            this.manager.clearAll();
            this.announce('Alle Fenster gelöscht');
        }
    }

    escapeXmlAttr(val) {
        return String(val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    saveBoard() {
        if (!this.manager) return;
        const widgets = this.manager.serializeWidgets();
        const data = {
            version: '2.0',
            timestamp: Date.now(),
            widgets
        };

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<digiboard>\n';
        xml += `  <meta>\n    <version>${data.version}</version>\n    <timestamp>${data.timestamp}</timestamp>\n  </meta>\n`;
        xml += '  <widgets>\n';

        widgets.forEach((w) => {
            const attrs = [
                `type="${this.escapeXmlAttr(w.type)}"`,
                `id="${this.escapeXmlAttr(w.id)}"`,
                `x="${this.escapeXmlAttr(w.x)}"`,
                `y="${this.escapeXmlAttr(w.y)}"`,
                `width="${this.escapeXmlAttr(w.width)}"`,
                `height="${this.escapeXmlAttr(w.height)}"`,
                `zIndex="${this.escapeXmlAttr(w.zIndex)}"`
            ].join(' ');

            const customProps = { ...w };
            delete customProps.type;
            delete customProps.id;
            delete customProps.x;
            delete customProps.y;
            delete customProps.width;
            delete customProps.height;
            delete customProps.zIndex;

            const jsonSafe = JSON.stringify(customProps).replace(/]]>/g, ']]]]><![CDATA[>');
            xml += `    <widget ${attrs}><![CDATA[${jsonSafe}]]></widget>\n`;
        });

        xml += '  </widgets>\n</digiboard>';

        const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `digiboard-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.announce('Board wurde gespeichert');
    }

    loadBoard() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xml,application/xml,text/xml';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target.result;
                this.parseXML(text);
            };
            reader.readAsText(file);
        };
        input.click();
    }

    parseXML(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            if (xmlDoc.querySelector('parsererror')) {
                throw new Error('Invalid XML syntax');
            }

            const widgetNodes = xmlDoc.getElementsByTagName('widget');
            const widgetsData = [];

            for (let i = 0; i < widgetNodes.length; i++) {
                const node = widgetNodes[i];
                const type = node.getAttribute('type');
                if (!type) continue;

                const rawId = node.getAttribute('id');
                const id = rawId && rawId.trim() !== '' ? rawId : undefined;
                const x = parseFloat(node.getAttribute('x'));
                const y = parseFloat(node.getAttribute('y'));
                const width = parseFloat(node.getAttribute('width'));
                const height = parseFloat(node.getAttribute('height'));
                const zIndex = parseInt(node.getAttribute('zIndex'), 10);

                const content = (node.textContent || '').trim();
                const customProps = content ? JSON.parse(content) : {};

                widgetsData.push({
                    ...customProps,
                    type,
                    id,
                    x: Number.isFinite(x) ? x : 20,
                    y: Number.isFinite(y) ? y : 80,
                    width: Number.isFinite(width) && width > 0 ? width : undefined,
                    height: Number.isFinite(height) && height > 0 ? height : undefined,
                    zIndex: Number.isFinite(zIndex) ? zIndex : 10 + i
                });
            }

            this.manager.deserializeWidgets(widgetsData);
            this.manager.notifyChange();
            this.announce('Board wurde geladen');
        } catch (err) {
            console.error('Failed to load board:', err);
            alert('Fehler beim Laden der Datei.');
        }
    }

    getSerializedState() {
        if (this.initialized && this.manager) {
            return this.manager.serializeWidgets();
        }
        return Array.isArray(window.__pendingDigiboardState) ? window.__pendingDigiboardState : null;
    }
}

// Global instance
window.digiboardApp = new Digiboard();
