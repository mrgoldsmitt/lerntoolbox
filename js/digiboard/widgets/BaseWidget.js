// Ensure namespace
window.DigiboardWidgets = window.DigiboardWidgets || {};

class BaseWidget {
    constructor(id, manager) {
        this.id = id;
        this.manager = manager;
        this.baseTitle = 'Widget';
        this.title = 'Widget';
        this.element = null;
        this.titleEl = null;
        this.contentEl = null;
        this.position = { x: 24, y: 80 };
        this.size = { width: 300, height: 220 };
        this.minSize = { width: 170, height: 140 };
        this.resizable = true;
    }

    /**
     * Creates the DOM structure for the widget window
     * @returns {HTMLElement} The widget container
     */
    render() {
        this.element = document.createElement('div');
        this.element.id = String(this.id);
        this.element.className = 'widget-window';
        this.element.dataset.widgetType = this.constructor.name;
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;

        if (this.size) {
            this.element.style.width = `${this.size.width}px`;
            this.element.style.height = `${this.size.height}px`;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'widget-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'widget-title';
        titleSpan.textContent = this.title;
        this.titleEl = titleSpan;
        header.appendChild(titleSpan);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'widget-controls';
        controls.addEventListener('pointerdown', (e) => e.stopPropagation());

        const dupBtn = document.createElement('button');
        dupBtn.type = 'button';
        dupBtn.className = 'widget-btn duplicate';
        dupBtn.title = 'Fenster duplizieren';
        dupBtn.setAttribute('aria-label', 'Fenster duplizieren');
        dupBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        dupBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.manager && typeof this.manager.duplicateWidget === 'function') {
                this.manager.duplicateWidget(this);
            }
        };
        controls.appendChild(dupBtn);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'widget-btn close';
        closeBtn.title = 'Fenster schließen';
        closeBtn.setAttribute('aria-label', 'Fenster schließen');
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.close();
        };
        controls.appendChild(closeBtn);

        header.appendChild(controls);
        this.element.appendChild(header);

        // Content Container
        const content = document.createElement('div');
        content.className = 'widget-content';
        this.contentEl = content;
        this.element.appendChild(content);

        // Render Child Content
        this.renderContent(content);

        // Resizing
        if (this.resizable) {
            this.makeResizable();
        }

        return this.element;
    }

    setTitle(newTitle) {
        this.title = newTitle;
        if (this.titleEl) {
            this.titleEl.textContent = newTitle;
        }
    }

    makeResizable() {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

        dirs.forEach((dir) => {
            const handle = document.createElement('div');
            handle.className = `digiboard-resize-handle digiboard-resize-${dir}`;
            handle.dataset.dir = dir;

            if (dir === 'se') {
                handle.setAttribute('aria-label', 'Größe ändern');
                handle.title = 'Größe ändern';
                handle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 14H20V12H22V14Z"/></svg>';
            }

            let dragState = null;

            const onPointerDown = (e) => {
                if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
                e.stopPropagation();
                e.preventDefault();

                if (this.manager) {
                    this.manager.bringToFront(this.id);
                }

                const container = this.manager?.container || this.element.parentElement;
                const containerW = container ? container.clientWidth : window.innerWidth;
                const containerH = container ? container.clientHeight : window.innerHeight;

                const rect = this.element.getBoundingClientRect();
                const computed = document.defaultView.getComputedStyle(this.element);

                dragState = {
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    startLeft: this.position.x,
                    startTop: this.position.y,
                    startWidth: parseFloat(computed.width) || rect.width,
                    startHeight: parseFloat(computed.height) || rect.height,
                    containerW,
                    containerH
                };

                this.element.style.transition = 'none';
                try {
                    handle.setPointerCapture(e.pointerId);
                } catch (_) {
                    // Ignore if capture is unsupported
                }
            };

            const onPointerMove = (e) => {
                if (!dragState || e.pointerId !== dragState.pointerId) return;
                e.preventDefault();

                const dx = e.clientX - dragState.startX;
                const dy = e.clientY - dragState.startY;
                const { startLeft, startTop, startWidth, startHeight, containerW, containerH } = dragState;

                const minW = Math.min(this.minSize?.width || 160, Math.max(110, containerW - 8));
                const minH = Math.min(this.minSize?.height || 130, Math.max(110, containerH - 8));

                let newLeft = startLeft;
                let newTop = startTop;
                let newWidth = startWidth;
                let newHeight = startHeight;

                // Horizontal adjustments
                if (dir.includes('e')) {
                    const maxW = Math.max(minW, containerW - startLeft);
                    newWidth = Math.min(Math.max(startWidth + dx, minW), maxW);
                } else if (dir.includes('w')) {
                    const rightEdge = startLeft + startWidth;
                    const desiredLeft = startLeft + dx;
                    const clampedLeft = Math.max(0, Math.min(desiredLeft, rightEdge - minW));
                    newLeft = clampedLeft;
                    newWidth = rightEdge - clampedLeft;
                }

                // Vertical adjustments
                if (dir.includes('s')) {
                    const maxH = Math.max(minH, containerH - startTop);
                    newHeight = Math.min(Math.max(startHeight + dy, minH), maxH);
                } else if (dir.includes('n')) {
                    const bottomEdge = startTop + startHeight;
                    const desiredTop = startTop + dy;
                    const clampedTop = Math.max(0, Math.min(desiredTop, bottomEdge - minH));
                    newTop = clampedTop;
                    newHeight = bottomEdge - clampedTop;
                }

                this.setPosition(Math.round(newLeft), Math.round(newTop));
                this.setSize(Math.round(newWidth), Math.round(newHeight));
            };

            const onPointerEnd = (e) => {
                if (!dragState || e.pointerId !== dragState.pointerId) return;
                try {
                    if (handle.hasPointerCapture(e.pointerId)) {
                        handle.releasePointerCapture(e.pointerId);
                    }
                } catch (_) {
                    // Ignore
                }
                this.element.style.transition = '';
                dragState = null;
                this.notifyChange();
            };

            handle.addEventListener('pointerdown', onPointerDown);
            handle.addEventListener('pointermove', onPointerMove);
            handle.addEventListener('pointerup', onPointerEnd);
            handle.addEventListener('pointercancel', onPointerEnd);

            this.element.appendChild(handle);
        });
    }

    /**
     * Override this method to render specific widget content
     * @param {HTMLElement} container - The content container
     */
    renderContent(container) {
        container.textContent = 'Base Widget Content';
    }

    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        if (this.element) {
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
        }
    }

    setSize(width, height) {
        this.size.width = width;
        this.size.height = height;
        if (this.element) {
            this.element.style.width = `${width}px`;
            this.element.style.height = `${height}px`;
        }
        if (typeof this.onResize === 'function') {
            this.onResize(width, height);
        }
    }

    notifyChange() {
        if (this.manager && typeof this.manager.notifyChange === 'function') {
            this.manager.notifyChange();
        }
    }

    destroy() {
        // Override in subclasses to clean up intervals/timeouts
    }

    close() {
        this.manager.removeWidget(this.id);
    }

    serialize() {
        return {
            type: this.constructor.name,
            id: this.id,
            title: this.title,
            x: Math.round(this.position.x),
            y: Math.round(this.position.y),
            width: Math.round(this.size.width),
            height: Math.round(this.size.height),
            zIndex: parseInt(this.element?.style.zIndex, 10) || 10
        };
    }

    deserialize(data) {
        if (data.title && typeof data.title === 'string') {
            this.setTitle(data.title);
        }
        if (data.x !== undefined && data.y !== undefined) {
            this.setPosition(Number(data.x) || 0, Number(data.y) || 0);
        }
        if (data.width && data.height && this.element) {
            this.setSize(Number(data.width) || this.size.width, Number(data.height) || this.size.height);
        }
        if (data.zIndex && this.element) {
            this.element.style.zIndex = String(data.zIndex);
        }
    }
}

window.DigiboardWidgets.BaseWidget = BaseWidget;
