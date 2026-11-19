window.DigiboardWidgets = window.DigiboardWidgets || {};

class TextWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.baseTitle = 'Notiz';
        this.title = 'Notiz';
        this.size = { width: 320, height: 260 };
        this.minSize = { width: 180, height: 150 };
        this.resizable = true;

        this.fontSize = 16;
        this.htmlContent = '';
    }

    sanitizeHtml(rawHtml) {
        if (!rawHtml || typeof rawHtml !== 'string') return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        const root = doc.body.firstChild;
        const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN']);

        const cleanNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.textContent || '');
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return null;
            }
            const tag = node.tagName.toUpperCase();
            if (!allowedTags.has(tag)) {
                const frag = document.createDocumentFragment();
                node.childNodes.forEach((child) => {
                    const cleaned = cleanNode(child);
                    if (cleaned) frag.appendChild(cleaned);
                });
                return frag;
            }
            const el = document.createElement(tag.toLowerCase());
            node.childNodes.forEach((child) => {
                const cleaned = cleanNode(child);
                if (cleaned) el.appendChild(cleaned);
            });
            return el;
        };

        const wrapper = document.createElement('div');
        if (root) {
            root.childNodes.forEach((child) => {
                const cleaned = cleanNode(child);
                if (cleaned) wrapper.appendChild(cleaned);
            });
        }
        return wrapper.innerHTML;
    }

    renderContent(container) {
        container.classList.add('text-widget-content');

        const editor = document.createElement('div');
        editor.className = 'text-editor';
        editor.contentEditable = 'true';
        editor.setAttribute('data-placeholder', 'Schreibe hier...');
        editor.setAttribute('aria-label', 'Notizfeld');
        editor.style.fontSize = `${this.fontSize}px`;
        if (this.htmlContent) {
            editor.innerHTML = this.sanitizeHtml(this.htmlContent);
        }

        editor.addEventListener('pointerdown', (e) => e.stopPropagation());
        editor.addEventListener('input', () => {
            // Normalize empty <br>-only content so placeholder reappears cleanly
            if (editor.textContent.trim() === '' && !editor.querySelector('li')) {
                editor.innerHTML = '';
            }
            this.htmlContent = editor.innerHTML;
            this.notifyChange();
        });

        this.editorEl = editor;
        container.appendChild(editor);

        const toolbar = document.createElement('div');
        toolbar.className = 'text-toolbar';
        toolbar.addEventListener('pointerdown', (e) => e.stopPropagation());

        const execFormat = (cmd) => {
            if (document.activeElement !== editor) {
                editor.focus();
            }
            document.execCommand(cmd, false, null);
            this.htmlContent = editor.innerHTML;
            this.notifyChange();
        };

        const makeFmtBtn = (label, title, onAction, styleProps = {}) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'widget-btn';
            btn.textContent = label;
            btn.title = title;
            btn.setAttribute('aria-label', title);
            Object.assign(btn.style, styleProps);

            // Prevent button focus steal so current selection in contentEditable remains intact
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
            });
            btn.onclick = () => onAction();
            return btn;
        };

        toolbar.appendChild(makeFmtBtn('B', 'Fett', () => execFormat('bold'), { fontWeight: '700' }));
        toolbar.appendChild(makeFmtBtn('I', 'Kursiv', () => execFormat('italic'), { fontStyle: 'italic' }));
        toolbar.appendChild(makeFmtBtn('U', 'Unterstrichen', () => execFormat('underline'), { textDecoration: 'underline' }));
        toolbar.appendChild(makeFmtBtn('•', 'Aufzählung', () => execFormat('insertUnorderedList')));

        toolbar.appendChild(makeFmtBtn('A-', 'Schrift verkleinern', () => {
            this.fontSize = Math.max(12, this.fontSize - 2);
            editor.style.fontSize = `${this.fontSize}px`;
            this.notifyChange();
        }));
        toolbar.appendChild(makeFmtBtn('A+', 'Schrift vergrößern', () => {
            this.fontSize = Math.min(48, this.fontSize + 2);
            editor.style.fontSize = `${this.fontSize}px`;
            this.notifyChange();
        }));

        container.appendChild(toolbar);
    }

    serialize() {
        const currentHtml = this.editorEl ? this.editorEl.innerHTML : this.htmlContent;
        return {
            ...super.serialize(),
            html: currentHtml,
            fontSize: this.fontSize
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (typeof data.fontSize === 'number') {
            this.fontSize = Math.max(12, Math.min(48, data.fontSize));
            if (this.editorEl) this.editorEl.style.fontSize = `${this.fontSize}px`;
        }
        if (typeof data.html === 'string') {
            this.htmlContent = this.sanitizeHtml(data.html);
            if (this.editorEl) this.editorEl.innerHTML = this.htmlContent;
        }
    }
}

window.DigiboardWidgets.TextWidget = TextWidget;
