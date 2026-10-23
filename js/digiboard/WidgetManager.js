window.Digiboard = window.Digiboard || {};

class WidgetManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.widgets = [];
        this.highestZ = 1000;
        this.dragState = null;

        this.initGlobalListeners();
    }

    createWidget(WidgetClass) {
        const id = Date.now();
        const widget = new WidgetClass(id, this);
        const el = widget.render();

        // Initial Position (cascade)
        const offset = (this.widgets.length % 5) * 30; // 30px cascade
        widget.setPosition(50 + offset, 50 + offset);

        this.container.appendChild(el);
        this.widgets.push(widget);
        this.bringToFront(widget.id);

        this.initWidgetListeners(widget);
    }

    removeWidget(id) {
        const index = this.widgets.findIndex(w => w.id === id);
        if (index !== -1) {
            const widget = this.widgets[index];
            if (widget.element) {
                widget.element.remove();
            }
            this.widgets.splice(index, 1);
        }
    }

    bringToFront(id) {
        const widget = this.widgets.find(w => w.id === id);
        if (widget) {
            this.highestZ++;
            widget.element.style.zIndex = this.highestZ;

            // Visual active state
            this.widgets.forEach(w => w.element.classList.remove('active'));
            widget.element.classList.add('active');
        }
    }

    initWidgetListeners(widget) {
        const header = widget.element.querySelector('.widget-header');

        // Mouse Down (Start Drag)
        header.addEventListener('mousedown', (e) => {
            this.startDrag(e, widget);
        });

        // Touch Start
        header.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.startDrag(touch, widget);
        }, { passive: false });

        // Click to focus
        widget.element.addEventListener('mousedown', () => {
            this.bringToFront(widget.id);
        });
        widget.element.addEventListener('touchstart', () => {
            this.bringToFront(widget.id);
        }, { passive: true });
    }

    initGlobalListeners() {
        // Move
        window.addEventListener('mousemove', (e) => this.dragMove(e));
        window.addEventListener('touchmove', (e) => {
            if (this.dragState) {
                e.preventDefault();
                this.dragMove(e.touches[0]);
            }
        }, { passive: false });

        // End
        window.addEventListener('mouseup', () => this.dragEnd());
        window.addEventListener('touchend', () => this.dragEnd());
    }

    startDrag(e, widget) {
        this.bringToFront(widget.id);
        const rect = widget.element.getBoundingClientRect();
        this.dragState = {
            widget: widget,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
        widget.element.style.transition = 'none'; // Disable transition during drag
    }

    dragMove(e) {
        if (!this.dragState) return;

        const { widget, offsetX, offsetY } = this.dragState;
        const containerRect = this.container.getBoundingClientRect();

        let x = e.clientX - containerRect.left - offsetX;
        let y = e.clientY - containerRect.top - offsetY;

        // Simple Bounds Check (allow partial off-screen but keep header visible)
        x = Math.max(0, Math.min(x, containerRect.width - 50));
        y = Math.max(0, Math.min(y, containerRect.height - 50));

        widget.setPosition(x, y);
    }

    dragEnd() {
        if (this.dragState) {
            this.dragState.widget.element.style.transition = ''; // Re-enable
            this.dragState = null;
        }
    }

    serializeWidgets() {
        return this.widgets.map(widget => widget.serialize());
    }

    deserializeWidgets(dataList) {
        // Clear all existing
        [...this.widgets].forEach(w => this.removeWidget(w.id));

        dataList.forEach(data => {
            // Find class from global scope
            const WidgetClass = window.DigiboardWidgets[data.type];
            if (WidgetClass) {
                const widget = new WidgetClass(data.id, this); // Reuse ID
                const el = widget.render();
                this.container.appendChild(el);
                this.widgets.push(widget);

                // Apply base state
                widget.deserialize(data);

                this.initWidgetListeners(widget);

                // Update global z-index tracker
                if (data.zIndex && data.zIndex > this.highestZ) {
                    this.highestZ = parseInt(data.zIndex);
                }
            }
        });
    }
}

window.Digiboard.WidgetManager = WidgetManager;
