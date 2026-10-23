window.DigiboardWidgets = window.DigiboardWidgets || {};

class DrawingWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Zeichnen";
        this.color = '#000000';
        this.lineWidth = 3;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.resizable = true;
    }

    renderContent(container) {
        // Remove default padding for this widget to maximize space
        container.style.padding = '0';
        container.style.overflow = 'hidden';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'drawing-canvas';
        // CSS handles display size
        canvas.style.width = '100%';
        canvas.style.height = '100%'; // Ensure it fills flex item
        canvas.style.flex = '1';
        canvas.style.display = 'block';
        canvas.style.minHeight = '0'; // CRITICAL: Allow shrinking in flex container

        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Save ctx for resize restore
        this.ctx = ctx;
        this.canvas = canvas;

        // Tools
        const tools = document.createElement('div');
        tools.className = 'drawing-tools';
        tools.style.flexShrink = '0'; // Don't shrink tools
        tools.style.margin = '0.5rem'; // Add margin manually since we removed padding

        // Colors
        const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffffff'];
        colors.forEach(c => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = c;
            if (c === this.color) swatch.classList.add('active');

            swatch.onclick = () => {
                this.color = c;
                // If white, it's essentially eraser but let's keep it simple
                this.lineWidth = c === '#ffffff' ? 10 : 3;

                tools.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
                swatch.classList.add('active');
            };
            tools.appendChild(swatch);
        });

        // Clear Button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'widget-btn';
        clearBtn.innerHTML = '🗑️';
        clearBtn.onclick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        tools.appendChild(clearBtn);

        container.appendChild(tools);

        // Events logic remains the same...
        // ... (events are attached below)

        // Events
        const start = (e) => {
            // Handle offsets correctly with new layout
            this.startDrawing(e, canvas, ctx);
        };

        canvas.addEventListener('mousedown', (e) => this.startDrawing(e, canvas, ctx));
        canvas.addEventListener('mousemove', (e) => this.draw(e, canvas, ctx));
        canvas.addEventListener('mouseup', () => this.stopDrawing());
        canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrawing(touch, canvas, ctx);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.draw(touch, canvas, ctx);
        }, { passive: false });

        canvas.addEventListener('touchend', () => this.stopDrawing());

        // Initial sizing function
        const updateCanvasSize = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                // Save content
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                // Only draw if we had content (check dimensions)
                if (canvas.width > 0 && canvas.height > 0) {
                    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
                }

                // Resize
                canvas.width = rect.width;
                canvas.height = rect.height;

                // Restore props
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = this.lineWidth;
                ctx.strokeStyle = this.color;

                // Restore content
                if (tempCanvas.width > 0) { // Only if we had content
                    ctx.drawImage(tempCanvas, 0, 0);
                }
            }
        };

        // Initialize size immediately
        requestAnimationFrame(updateCanvasSize);

        // Handle Resize
        this.onResize = (w, h) => {
            // Wait for DOM update
            requestAnimationFrame(updateCanvasSize);
        };
    }

    startDrawing(e, canvas, ctx) {
        this.isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    }

    draw(e, canvas, ctx) {
        if (!this.isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    stopDrawing() {
        this.isDrawing = false;
    }
}

window.DigiboardWidgets.DrawingWidget = DrawingWidget;
