// Ensure namespace
window.DigiboardWidgets = window.DigiboardWidgets || {};

class BaseWidget {
    constructor(id, manager) {
        this.id = id;
        this.manager = manager;
        this.title = "Widget";
        this.element = null;
        this.position = { x: 50, y: 50 };
        this.size = { width: 300, height: 200 };
        this.resizable = false;
    }

    /**
     * Creates the DOM structure for the widget window
     * @returns {HTMLElement} The widget container
     */
    render() {
        // Create container
        this.element = document.createElement('div');
        this.element.id = this.id;
        this.element.className = 'widget-window';
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;

        // Apply initial size
        if (this.size) {
            this.element.style.width = `${this.size.width}px`;
            this.element.style.height = `${this.size.height}px`;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'widget-header';

        // Title
        const titleSpan = document.createElement('span');
        titleSpan.className = 'widget-title';
        titleSpan.textContent = this.title;
        header.appendChild(titleSpan);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'widget-controls';

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'widget-btn close';
        closeBtn.innerHTML = '&times;'; // Or SVG
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
        this.element.appendChild(content);

        // Render Child Content
        this.renderContent(content);

        // Resizing
        if (this.resizable) {
            this.makeResizable();
        }

        return this.element;
    }

    makeResizable() {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';

        // Style handled in CSS, but ensuring basic positioning here if CSS missing
        handle.style.position = 'absolute';
        handle.style.bottom = '0';
        handle.style.right = '0';
        handle.style.width = '15px';
        handle.style.height = '15px';
        handle.style.cursor = 'se-resize';
        handle.style.zIndex = '10';

        // Add SVG icon for grip
        handle.innerHTML = '<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" style="position:absolute;bottom:2px;right:2px;width:12px;height:12px;"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 14H20V12H22V14Z"/></svg>';

        this.element.appendChild(handle);

        let startX, startY, startWidth, startHeight;

        const onMouseDown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(this.element).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(this.element).height, 10);

            document.documentElement.addEventListener('mousemove', onMouseMove, false);
            document.documentElement.addEventListener('mouseup', onMouseUp, false);
        };

        const onMouseMove = (e) => {
            const newWidth = startWidth + e.clientX - startX;
            const newHeight = startHeight + e.clientY - startY;

            // Min dimensions
            if (newWidth > 150) {
                this.element.style.width = newWidth + 'px';
                this.size.width = newWidth;
            }
            if (newHeight > 100) {
                this.element.style.height = newHeight + 'px';
                this.size.height = newHeight;
            }

            if (this.onResize) {
                this.onResize(this.size.width, this.size.height);
            }
        };

        const onMouseUp = () => {
            document.documentElement.removeEventListener('mousemove', onMouseMove, false);
            document.documentElement.removeEventListener('mouseup', onMouseUp, false);
        };

        handle.addEventListener('mousedown', onMouseDown, false);
    }

    /**
     * Override this method to render specific widget content
     * @param {HTMLElement} container - The content container
     */
    renderContent(container) {
        container.textContent = "Base Widget Content";
    }

    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        if (this.element) {
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
        }
    }

    close() {
        this.manager.removeWidget(this.id);
    }

    serialize() {
        return {
            type: this.constructor.name,
            id: this.id,
            x: this.position.x,
            y: this.position.y,
            width: this.size.width,
            height: this.size.height,
            zIndex: this.element.style.zIndex || 1
        };
    }

    deserialize(data) {
        if (data.x !== undefined && data.y !== undefined) {
            this.setPosition(data.x, data.y);
        }
        if (data.width && data.height && this.element) {
            this.size.width = data.width;
            this.size.height = data.height;
            this.element.style.width = data.width + 'px';
            this.element.style.height = data.height + 'px';
            // Trigger resize callback if exists
            if (this.onResize) this.onResize(data.width, data.height);
        }
        if (data.zIndex) {
            this.element.style.zIndex = data.zIndex;
        }
    }
}

window.DigiboardWidgets.BaseWidget = BaseWidget;
