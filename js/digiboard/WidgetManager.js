window.Digiboard = window.Digiboard || {};

class WidgetManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.widgets = [];
        this.highestZ = 10;
        this.nextSeq = 1;
        this.onChangeCallback = null;
        this.suppressNotify = false;

        this.initContainerObserver();
        this.updateEmptyHint();
    }

    generateId() {
        return `db-w-${Date.now()}-${this.nextSeq++}`;
    }

    initContainerObserver() {
        if (!this.container || typeof ResizeObserver === 'undefined') return;
        this.resizeObserver = new ResizeObserver(() => {
            if (this.container.clientWidth > 0 && this.container.clientHeight > 0) {
                this.clampAllWidgets();
            }
        });
        this.resizeObserver.observe(this.container);
    }

    getToolbarSafeTop() {
        if (!this.container) return 72;
        if (document.body.classList.contains('toolbar-hidden')) return 12;
        const toolbar = this.container.querySelector('.digiboard-toolbar');
        if (!toolbar || toolbar.offsetHeight === 0) return 72;
        const containerRect = this.container.getBoundingClientRect();
        const toolbarRect = toolbar.getBoundingClientRect();
        const relBottom = Math.round(toolbarRect.bottom - containerRect.top);
        return relBottom > 0 ? relBottom : 72;
    }

    getNextTitle(WidgetClass, baseTitle) {
        const base = baseTitle || 'Widget';
        const existingTitles = new Set(
            this.widgets
                .filter((w) => w.constructor === WidgetClass)
                .map((w) => w.title)
        );
        if (!existingTitles.has(base)) return base;
        let num = 2;
        while (existingTitles.has(`${base} ${num}`)) {
            num++;
        }
        return `${base} ${num}`;
    }

    clampWidgetGeometry(widget) {
        if (!this.container || !widget || !widget.element) return;
        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        if (cw <= 0 || ch <= 0) return;

        const maxW = Math.max(110, cw - 16);
        const maxH = Math.max(110, ch - 16);
        const minW = Math.min(widget.minSize?.width || 160, maxW);
        const minH = Math.min(widget.minSize?.height || 130, maxH);

        const w = Math.round(Math.min(Math.max(widget.size.width || minW, minW), maxW));
        const h = Math.round(Math.min(Math.max(widget.size.height || minH, minH), maxH));

        const maxX = Math.max(0, cw - w);
        const maxY = Math.max(0, ch - h);
        const x = Math.round(Math.max(0, Math.min(widget.position.x || 0, maxX)));
        const y = Math.round(Math.max(0, Math.min(widget.position.y || 0, maxY)));

        widget.setPosition(x, y);
        widget.setSize(w, h);
    }

    clampAllWidgets() {
        this.widgets.forEach((w) => this.clampWidgetGeometry(w));
    }

    createWidget(WidgetClass, options = {}) {
        if (!this.container || !WidgetClass) return null;

        const id = this.generateId();
        const widget = new WidgetClass(id, this);
        const baseTitle = widget.baseTitle || widget.title;
        widget.baseTitle = baseTitle;
        widget.title = options.title || this.getNextTitle(WidgetClass, baseTitle);

        const el = widget.render();
        this.container.appendChild(el);
        this.widgets.push(widget);

        const cw = this.container.clientWidth || window.innerWidth;
        const ch = this.container.clientHeight || window.innerHeight;
        const safeTop = this.getToolbarSafeTop();

        // Clamp initial size first so cascade calculation fits inside container
        const maxW = Math.max(110, cw - 16);
        const maxH = Math.max(110, ch - safeTop - 16);
        const targetW = Math.min(widget.size.width, maxW);
        const targetH = Math.min(widget.size.height, Math.max(110, ch - 16));
        widget.setSize(Math.round(targetW), Math.round(targetH));

        const step = ((this.widgets.length - 1) % 6) * 28;
        const rawX = 16 + step;
        const rawY = safeTop + 10 + step;
        const clampedX = Math.max(8, Math.min(rawX, Math.max(8, cw - targetW - 8)));
        const clampedY = Math.max(8, Math.min(rawY, Math.max(8, ch - targetH - 8)));
        widget.setPosition(Math.round(clampedX), Math.round(clampedY));

        this.clampWidgetGeometry(widget);
        this.initWidgetListeners(widget);
        this.bringToFront(widget.id);

        requestAnimationFrame(() => {
            if (typeof widget.onResize === 'function') {
                widget.onResize(widget.size.width, widget.size.height);
            }
        });

        this.updateEmptyHint();
        this.notifyChange();
        return widget;
    }

    duplicateWidget(sourceWidget) {
        if (!sourceWidget || !this.container) return null;
        const data = sourceWidget.serialize();
        const WidgetClass = sourceWidget.constructor;
        const id = this.generateId();
        const clone = new WidgetClass(id, this);
        clone.baseTitle = sourceWidget.baseTitle || sourceWidget.title;

        const el = clone.render();
        this.container.appendChild(el);
        this.widgets.push(clone);

        const cloneData = {
            ...data,
            id,
            title: this.getNextTitle(WidgetClass, clone.baseTitle),
            x: (Number(data.x) || 0) + 28,
            y: (Number(data.y) || 0) + 28
        };

        this.suppressNotify = true;
        try {
            clone.deserialize(cloneData);
        } finally {
            this.suppressNotify = false;
        }

        this.clampWidgetGeometry(clone);
        this.initWidgetListeners(clone);
        this.bringToFront(clone.id);

        requestAnimationFrame(() => {
            if (typeof clone.onResize === 'function') {
                clone.onResize(clone.size.width, clone.size.height);
            }
        });

        this.updateEmptyHint();
        this.notifyChange();
        return clone;
    }

    removeWidget(id) {
        const index = this.widgets.findIndex((w) => w.id === id);
        if (index === -1) return;

        const widget = this.widgets[index];
        if (typeof widget.destroy === 'function') {
            try {
                widget.destroy();
            } catch (err) {
                console.warn('Widget destroy error:', err);
            }
        }
        if (widget.element) {
            widget.element.remove();
        }
        this.widgets.splice(index, 1);

        this.updateEmptyHint();
        this.notifyChange();
    }

    clearAll() {
        this.suppressNotify = true;
        try {
            [...this.widgets].forEach((w) => this.removeWidget(w.id));
            this.highestZ = 10;
        } finally {
            this.suppressNotify = false;
        }
        this.updateEmptyHint();
        this.notifyChange();
    }

    arrangeWidgets() {
        if (!this.container || this.widgets.length === 0) return;
        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        if (cw <= 0 || ch <= 0) return;

        const safeTop = this.getToolbarSafeTop() + 10;
        const pad = 12;
        const availW = Math.max(140, cw - pad * 2);
        const availH = Math.max(140, ch - safeTop - pad);
        const count = this.widgets.length;

        // Calculate balanced grid columns based on container aspect & count
        const cols = Math.max(1, Math.min(count, Math.ceil(Math.sqrt(count * (availW / availH)))));
        const rows = Math.ceil(count / cols);

        const cellW = Math.floor((availW - (cols - 1) * pad) / cols);
        const cellH = Math.floor((availH - (rows - 1) * pad) / rows);

        this.widgets.forEach((widget, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);

            const targetW = Math.max(110, Math.min(widget.size.width, cellW));
            const targetH = Math.max(110, Math.min(widget.size.height, cellH));

            // If cell is larger than minSize and widget is tiny or oversized, fit comfortably into cell
            const finalW = Math.max(Math.min(widget.minSize?.width || 160, cellW), Math.min(cellW, Math.max(targetW, Math.min(cellW, 240))));
            const finalH = Math.max(Math.min(widget.minSize?.height || 130, cellH), Math.min(cellH, Math.max(targetH, Math.min(cellH, 220))));

            const x = pad + col * (cellW + pad);
            const y = safeTop + row * (cellH + pad);

            widget.setSize(Math.round(finalW), Math.round(finalH));
            widget.setPosition(Math.round(x), Math.round(y));
            this.clampWidgetGeometry(widget);
        });

        this.notifyChange();
    }

    bringToFront(id) {
        const widget = this.widgets.find((w) => w.id === id);
        if (!widget || !widget.element) return;

        this.highestZ++;
        if (this.highestZ >= 780) {
            this.normalizeZIndices();
            this.highestZ++;
        }

        widget.element.style.zIndex = String(this.highestZ);
        this.widgets.forEach((w) => {
            if (w.element) w.element.classList.remove('active');
        });
        widget.element.classList.add('active');
    }

    normalizeZIndices() {
        const sorted = [...this.widgets].sort((a, b) => {
            const za = parseInt(a.element?.style.zIndex, 10) || 10;
            const zb = parseInt(b.element?.style.zIndex, 10) || 10;
            return za - zb;
        });
        let z = 10;
        sorted.forEach((w) => {
            if (w.element) {
                w.element.style.zIndex = String(z);
            }
            z++;
        });
        this.highestZ = z;
    }

    initWidgetListeners(widget) {
        const header = widget.element.querySelector('.widget-header');
        if (!header) return;

        let dragState = null;

        header.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (e.target.closest('.widget-controls')) return;

            e.preventDefault();
            this.bringToFront(widget.id);

            const cw = this.container.clientWidth;
            const ch = this.container.clientHeight;
            const rect = widget.element.getBoundingClientRect();

            dragState = {
                pointerId: e.pointerId,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startPosX: widget.position.x,
                startPosY: widget.position.y,
                width: rect.width || widget.size.width,
                height: rect.height || widget.size.height,
                cw,
                ch,
                moved: false
            };

            widget.element.style.transition = 'none';
            try {
                header.setPointerCapture(e.pointerId);
            } catch (_) {
                // Ignore if capture is unsupported
            }
        });

        header.addEventListener('pointermove', (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            e.preventDefault();

            const dx = e.clientX - dragState.startClientX;
            const dy = e.clientY - dragState.startClientY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                dragState.moved = true;
            }

            const maxX = Math.max(0, dragState.cw - dragState.width);
            const maxY = Math.max(0, dragState.ch - dragState.height);
            const x = Math.round(Math.max(0, Math.min(dragState.startPosX + dx, maxX)));
            const y = Math.round(Math.max(0, Math.min(dragState.startPosY + dy, maxY)));

            widget.setPosition(x, y);
        });

        const endDrag = (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            try {
                if (header.hasPointerCapture(e.pointerId)) {
                    header.releasePointerCapture(e.pointerId);
                }
            } catch (_) {
                // Ignore
            }
            widget.element.style.transition = '';
            const didMove = dragState.moved;
            dragState = null;
            if (didMove) {
                this.notifyChange();
            }
        };

        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);

        widget.element.addEventListener('pointerdown', () => {
            this.bringToFront(widget.id);
        });
    }

    updateEmptyHint() {
        if (!this.container) return;
        const hint = this.container.querySelector('#digiboard-empty-hint');
        if (hint) {
            hint.classList.toggle('hidden', this.widgets.length > 0);
        }
    }

    notifyChange() {
        if (this.suppressNotify) return;
        if (typeof this.onChangeCallback === 'function') {
            this.onChangeCallback();
        }
    }

    serializeWidgets() {
        return this.widgets.map((widget) => widget.serialize());
    }

    deserializeWidgets(dataList) {
        if (!Array.isArray(dataList)) return;

        this.suppressNotify = true;
        try {
            [...this.widgets].forEach((w) => this.removeWidget(w.id));
            this.highestZ = 10;

            const usedIds = new Set();

            dataList.forEach((data) => {
                if (!data || !data.type) return;
                const WidgetClass = window.DigiboardWidgets[data.type];
                if (!WidgetClass) return;

                let widgetId = data.id !== undefined && data.id !== null && String(data.id).trim() !== ''
                    ? String(data.id)
                    : this.generateId();

                if (usedIds.has(widgetId)) {
                    widgetId = this.generateId();
                }
                usedIds.add(widgetId);

                const widget = new WidgetClass(widgetId, this);
                widget.baseTitle = widget.baseTitle || widget.title;
                const el = widget.render();
                this.container.appendChild(el);
                this.widgets.push(widget);

                widget.deserialize(data);
                this.clampWidgetGeometry(widget);
                this.initWidgetListeners(widget);

                const parsedZ = parseInt(data.zIndex, 10);
                if (!Number.isNaN(parsedZ) && parsedZ > this.highestZ) {
                    this.highestZ = parsedZ;
                }
            });

            if (this.highestZ >= 780) {
                this.normalizeZIndices();
            }

            // Activate top widget visually
            if (this.widgets.length > 0) {
                const topWidget = this.widgets.reduce((best, curr) => {
                    const zb = parseInt(best.element?.style.zIndex, 10) || 0;
                    const zc = parseInt(curr.element?.style.zIndex, 10) || 0;
                    return zc >= zb ? curr : best;
                }, this.widgets[0]);
                if (topWidget && topWidget.element) {
                    topWidget.element.classList.add('active');
                }
            }
        } finally {
            this.suppressNotify = false;
        }

        this.updateEmptyHint();
        requestAnimationFrame(() => {
            this.clampAllWidgets();
            this.widgets.forEach((w) => {
                if (typeof w.onResize === 'function') {
                    w.onResize(w.size.width, w.size.height);
                }
            });
        });
    }
}

window.Digiboard.WidgetManager = WidgetManager;
