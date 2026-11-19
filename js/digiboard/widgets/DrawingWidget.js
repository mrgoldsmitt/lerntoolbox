window.DigiboardWidgets = window.DigiboardWidgets || {};

class DrawingWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Zeichnen';
        this.title = 'Zeichnen';
        this.size = { width: 420, height: 340 };
        this.minSize = { width: 210, height: 190 };
        this.resizable = true;

        this.color = '#111827';
        this.lineWidth = 4;
        this.isEraser = false;
        this.strokes = [];
        this.activeStroke = null;
        this.activePointerId = null;
        this.canvasObserver = null;
    }

    renderContent(container) {
        container.classList.add('drawing-widget-content');

        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'drawing-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'drawing-canvas';
        canvasWrap.appendChild(canvas);
        container.appendChild(canvasWrap);

        this.canvasWrap = canvasWrap;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Tools bar
        const tools = document.createElement('div');
        tools.className = 'drawing-tools';
        tools.addEventListener('pointerdown', (e) => e.stopPropagation());

        const colors = [
            { hex: '#111827', name: 'Schwarz' },
            { hex: '#ef4444', name: 'Rot' },
            { hex: '#2563eb', name: 'Blau' },
            { hex: '#16a34a', name: 'Grün' },
            { hex: '#f59e0b', name: 'Gelb' },
            { hex: '#9333ea', name: 'Violett' }
        ];

        this.swatchBtns = [];
        colors.forEach(({ hex, name }) => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = hex;
            swatch.title = name;
            swatch.setAttribute('aria-label', `Farbe ${name}`);
            if (!this.isEraser && this.color === hex) swatch.classList.add('active');

            swatch.onclick = () => {
                this.color = hex;
                this.isEraser = false;
                this.syncToolUI();
                this.notifyChange();
            };
            this.swatchBtns.push({ hex, el: swatch });
            tools.appendChild(swatch);
        });

        // Eraser toggle
        const eraserBtn = document.createElement('button');
        eraserBtn.type = 'button';
        eraserBtn.className = 'widget-btn';
        eraserBtn.title = 'Radierer';
        eraserBtn.setAttribute('aria-label', 'Radierer');
        eraserBtn.setAttribute('aria-pressed', String(this.isEraser));
        eraserBtn.textContent = 'Radierer';
        eraserBtn.style.fontSize = '0.75rem';
        eraserBtn.style.padding = '0.2rem 0.45rem';
        eraserBtn.onclick = () => {
            this.isEraser = !this.isEraser;
            this.syncToolUI();
            this.notifyChange();
        };
        this.eraserBtn = eraserBtn;
        tools.appendChild(eraserBtn);

        // Brush sizes
        this.sizeBtns = [];
        [
            { label: 'S', width: 2 },
            { label: 'M', width: 4 },
            { label: 'L', width: 10 }
        ].forEach(({ label, width }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'widget-btn drawing-size-btn';
            btn.textContent = label;
            btn.title = `Strichstärke ${label}`;
            btn.setAttribute('aria-label', `Strichstärke ${label}`);
            btn.onclick = () => {
                this.lineWidth = width;
                this.syncToolUI();
                this.notifyChange();
            };
            this.sizeBtns.push({ width, el: btn });
            tools.appendChild(btn);
        });

        // Undo Button
        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'widget-btn';
        undoBtn.title = 'Rückgängig';
        undoBtn.setAttribute('aria-label', 'Letzten Strich rückgängig machen');
        undoBtn.textContent = '↩';
        undoBtn.onclick = () => {
            if (this.strokes.length > 0) {
                this.strokes.pop();
                this.redraw();
                this.notifyChange();
            }
        };
        tools.appendChild(undoBtn);

        // Clear Button
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'widget-btn';
        clearBtn.title = 'Zeichnung löschen';
        clearBtn.setAttribute('aria-label', 'Zeichnung löschen');
        clearBtn.textContent = '🗑️';
        clearBtn.onclick = () => {
            this.strokes = [];
            this.redraw();
            this.notifyChange();
        };
        tools.appendChild(clearBtn);

        container.appendChild(tools);
        this.syncToolUI();

        // Pointer drawing events
        canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            if (this.manager) this.manager.bringToFront(this.id);

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.activePointerId = e.pointerId;
            this.activeStroke = {
                color: this.color,
                width: this.isEraser ? Math.max(12, this.lineWidth * 3) : this.lineWidth,
                eraser: this.isEraser,
                points: [{ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }]
            };
            this.strokes.push(this.activeStroke);

            try {
                canvas.setPointerCapture(e.pointerId);
            } catch (_) {
                // Ignore
            }
            this.redraw();
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!this.activeStroke || e.pointerId !== this.activePointerId) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) * 10) / 10;
            const y = Math.round((e.clientY - rect.top) * 10) / 10;

            const pts = this.activeStroke.points;
            const last = pts[pts.length - 1];
            if (last && Math.hypot(x - last.x, y - last.y) < 1) return;

            pts.push({ x, y });
            this.drawSegment(last || { x, y }, { x, y }, this.activeStroke);
        });

        const endStroke = (e) => {
            if (!this.activeStroke || e.pointerId !== this.activePointerId) return;
            try {
                if (canvas.hasPointerCapture(e.pointerId)) {
                    canvas.releasePointerCapture(e.pointerId);
                }
            } catch (_) {
                // Ignore
            }
            this.activeStroke = null;
            this.activePointerId = null;
            this.notifyChange();
        };

        canvas.addEventListener('pointerup', endStroke);
        canvas.addEventListener('pointercancel', endStroke);

        if (typeof ResizeObserver !== 'undefined') {
            this.canvasObserver = new ResizeObserver(() => this.resizeCanvas());
            this.canvasObserver.observe(canvasWrap);
        }

        requestAnimationFrame(() => this.resizeCanvas());
    }

    syncToolUI() {
        if (this.swatchBtns) {
            this.swatchBtns.forEach(({ hex, el }) => {
                el.classList.toggle('active', !this.isEraser && this.color === hex);
            });
        }
        if (this.eraserBtn) {
            this.eraserBtn.classList.toggle('active', this.isEraser);
            this.eraserBtn.setAttribute('aria-pressed', String(this.isEraser));
        }
        if (this.sizeBtns) {
            this.sizeBtns.forEach(({ width, el }) => {
                el.classList.toggle('active', this.lineWidth === width);
                el.setAttribute('aria-pressed', String(this.lineWidth === width));
            });
        }
    }

    resizeCanvas() {
        if (!this.canvas || !this.canvasWrap || !this.ctx) return;
        const rect = this.canvasWrap.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.max(1, Math.floor(rect.width * dpr));
        const targetH = Math.max(1, Math.floor(rect.height * dpr));

        if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
            this.canvas.width = targetW;
            this.canvas.height = targetH;
        }
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.redraw();
    }

    drawSegment(p1, p2, stroke) {
        const ctx = this.ctx;
        if (!ctx) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.width;
        ctx.strokeStyle = stroke.eraser ? '#ffffff' : stroke.color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
    }

    redraw() {
        if (!this.ctx || !this.canvasWrap) return;
        const rect = this.canvasWrap.getBoundingClientRect();
        const ctx = this.ctx;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width || this.canvas.width, rect.height || this.canvas.height);

        this.strokes.forEach((stroke) => {
            const pts = stroke.points;
            if (!pts || pts.length === 0) return;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = stroke.width;
            ctx.strokeStyle = stroke.eraser ? '#ffffff' : stroke.color;
            ctx.fillStyle = stroke.eraser ? '#ffffff' : stroke.color;

            if (pts.length === 1) {
                ctx.beginPath();
                ctx.arc(pts[0].x, pts[0].y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.stroke();
            }
        });
        ctx.restore();
    }

    onResize() {
        requestAnimationFrame(() => this.resizeCanvas());
    }

    destroy() {
        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
            this.canvasObserver = null;
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            color: this.color,
            lineWidth: this.lineWidth,
            isEraser: this.isEraser,
            strokes: this.strokes.map((s) => ({
                color: s.color,
                width: s.width,
                eraser: Boolean(s.eraser),
                points: s.points.map((p) => ({ x: p.x, y: p.y }))
            }))
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (typeof data.color === 'string') this.color = data.color;
        if (typeof data.lineWidth === 'number') this.lineWidth = data.lineWidth;
        if (typeof data.isEraser === 'boolean') this.isEraser = data.isEraser;
        if (Array.isArray(data.strokes)) {
            this.strokes = data.strokes.filter((s) => s && Array.isArray(s.points));
        }
        this.syncToolUI();
        requestAnimationFrame(() => this.resizeCanvas());
    }
}

window.DigiboardWidgets.DrawingWidget = DrawingWidget;
