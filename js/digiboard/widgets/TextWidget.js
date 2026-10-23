window.DigiboardWidgets = window.DigiboardWidgets || {};

class TextWidget extends window.DigiboardWidgets.BaseWidget {
    constructor(id, manager) {
        super(id, manager);
        this.title = "Notiz";
        this.resizable = true;
    }

    renderContent(container) {
        const editor = document.createElement('div');
        editor.className = 'text-editor';
        editor.contentEditable = true;
        editor.textContent = "Schreibe hier...";

        // Simple placeholder behavior
        editor.onfocus = () => {
            if (editor.textContent === "Schreibe hier...") {
                editor.textContent = "";
            }
        };

        editor.onblur = () => {
            if (editor.textContent.trim() === "") {
                editor.textContent = "Schreibe hier...";
            }
        };

        container.appendChild(editor);

        // Optional: Toolbar for formatting
        const toolbar = document.createElement('div');
        toolbar.style.display = 'flex';
        toolbar.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        toolbar.style.paddingTop = '0.5rem';
        toolbar.style.marginTop = '0.5rem';
        toolbar.style.gap = '0.5rem';

        ['b', 'i', 'u'].forEach(cmd => {
            const btn = document.createElement('button');
            btn.className = 'widget-btn';
            btn.textContent = cmd.toUpperCase();
            btn.onclick = () => document.execCommand(cmd === 'b' ? 'bold' : cmd === 'i' ? 'italic' : 'underline');
            toolbar.appendChild(btn);
        });

        // List
        const listBtn = document.createElement('button');
        listBtn.className = 'widget-btn';
        listBtn.innerHTML = '•';
        listBtn.onclick = () => document.execCommand('insertUnorderedList');
        toolbar.appendChild(listBtn);


        container.appendChild(toolbar);
    }
}

window.DigiboardWidgets.TextWidget = TextWidget;
