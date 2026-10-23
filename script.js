// --- State Management ---
let currentMode = 'launchpad'; // 'mindmap', 'impressum', 'launchpad'

// Mindmap State
let nodes = [];       // Array of {id, x, y, text, width, height, color}
let connections = []; // Array of {fromId, toId, text, color}
let nextNodeId = 1;
let selectedNodeId = null;
let linkingNodeId = null; // Node currently being linked from

// Grid State
let isGridActive = false;
const GRID_SIZE = 20;

// Auto-Save State
let isAutoSaveActive = localStorage.getItem('osi_autosave_active') !== 'false';

// --- Viewport State ---
let viewState = {
    x: 0,
    y: 0,
    zoom: 1
};

// Context Menus
let contextMenuTarget = null; // { type: 'node'|'connection', id: ... }
const contextMenu = document.getElementById('context-menu');
const colorDialog = document.getElementById('color-dialog');
const dialogColorInput = document.getElementById('dialog-color-input');

function showContextMenu(e, type, id) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    // Determine coordinates
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    contextMenuTarget = { type, id, x: clientX, y: clientY };

    // Toggle Menu Items
    const menuNewNode = document.getElementById('menu-new-node');
    const menuCenter = document.getElementById('menu-center');
    const menuRename = document.getElementById('menu-rename');
    const menuColor = document.getElementById('menu-color');
    const menuDelete = document.getElementById('menu-delete');
    const menuClearAll = document.getElementById('menu-clear-all');

    if (type === 'background') {
        if (menuNewNode) menuNewNode.style.display = 'block';
        if (menuCenter) menuCenter.style.display = 'block';
        if (menuRename) menuRename.style.display = 'none';
        if (menuColor) menuColor.style.display = 'none';
        if (menuDelete) menuDelete.style.display = 'none';
        if (menuClearAll) menuClearAll.style.display = 'block';
    } else {
        if (menuNewNode) menuNewNode.style.display = 'none';
        if (menuCenter) menuCenter.style.display = 'none';
        if (menuRename) menuRename.style.display = 'block';
        if (menuColor) menuColor.style.display = 'block';
        if (menuDelete) menuDelete.style.display = 'block';
        if (menuClearAll) menuClearAll.style.display = 'none';
    }

    showMenuAt(clientX, clientY);
}

function showMenuAt(x, y) {
    if (!contextMenu) return;

    // First display block to get dimensions
    contextMenu.style.display = 'block';

    // Get dimensions
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const padding = 10;

    // Check Right Edge
    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - padding;
    }

    // Check Bottom Edge
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - padding;
    }

    // Ensure not off-screen left/top
    if (x < padding) x = padding;
    if (y < padding) y = padding;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
}

function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
}

// --- DOM Elements ---
const mindmapSection = document.getElementById('mindmap-section');
const impressumSection = document.getElementById('impressum-section');
const disclaimerSection = document.getElementById('disclaimer-section');
const privacySection = document.getElementById('privacy-section');
const changelogSection = document.getElementById('changelog-section');
const sidebar = document.getElementById('sidebar');

const container = document.getElementById('mindmap-container');
const viewport = document.getElementById('mindmap-viewport'); // NEW
const svgLayer = document.getElementById('mindmap-svg');
const nodesLayer = document.getElementById('mindmap-nodes-layer');

// --- Initialization ---
function init() {
    initTheme();
    // Initialize Viewport Center
    centerViewport();

    // Global click to deselect
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mindmap-node') && !e.target.closest('.toolbar')) {
            linkingNodeId = null;
            document.querySelectorAll('.mindmap-node.linking').forEach(el => el.classList.remove('linking'));
            renderConnections(); // Redraw
        }
    });

    // Handle delete key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Only if not editing text
            if (document.activeElement.getAttribute('contenteditable') !== 'true') {
                // For now we rely on context menu, but could add selection logic later
            }
        }
    });

    initViewportControls();

    // Auto-Save Setup
    const sidebarAutoSaveToggle = document.getElementById('sidebar-autosave-toggle');
    if (sidebarAutoSaveToggle) sidebarAutoSaveToggle.checked = isAutoSaveActive;

    if (isAutoSaveActive) {
        let loaded = false;
        if (localStorage.getItem('osi_app_state')) {
            loadAppState();
            loaded = true;
        }
        // Force Launchpad to ALWAYS be the start screen, or just let loadAppState handle it?
        // Wait, the user said "Diese Seite dient als Startbildschirm". So always Launchpad?
        // Usually, apps with a dashboard open the dashboard on fresh load.
        // I will change fallback to launchpad.
        if (!loaded) setMode('launchpad', true);
    } else {
        setMode('launchpad', true); // Only if no load
    }

    // Drag and Drop Import Setup
    setupDragAndDrop('mindmap-container', importXML, 'mindmap-drop-overlay');
    setupDragAndDrop('kanban-board-wrapper', importKanbanXML, 'kanban-drop-overlay');
    setupDragAndDrop('flashcards-section', importFlashcardsXML, 'flashcards-drop-overlay');
    setupDragAndDrop('entschuldigungen-section', handleExcuseImport, 'excuse-drop-overlay');

    // Initialize Excuse Toggle
    const excuseTimeUnitToggle = document.getElementById('excuse-time-unit-toggle');
    if (excuseTimeUnitToggle) toggleExcuseTimeUnit(excuseTimeUnitToggle.checked);
}

function toggleAutoSave(active) {
    isAutoSaveActive = active;
    localStorage.setItem('osi_autosave_active', active);

    // Sync Toggles
    const sidebarAutoSaveToggle = document.getElementById('sidebar-autosave-toggle');
    if (sidebarAutoSaveToggle) sidebarAutoSaveToggle.checked = active;

    if (active) {
        saveAppState(); // Initial save
    } else {
        localStorage.removeItem('osi_app_state');
    }
}

// Ensure state is saved when leaving/reloading the page (helps in Safari)
window.addEventListener('beforeunload', () => {
    if (isAutoSaveActive) saveAppState();
});

function saveAppState() {
    if (!isAutoSaveActive) return;

    const state = {
        currentMode,
        mindmap: {
            nodes,
            connections,
            nextNodeId,
            viewState,
            isGridActive
        },
        kanban: {
            kanbanState
        },
        flashcards: {
            flashcards
        },
        excuses: {
            masterData: {
                name: document.getElementById('excuse-name')?.value || '',
                dob: document.getElementById('excuse-dob')?.value || '',
                teacher: document.getElementById('excuse-teacher')?.value || '',
                attest: document.getElementById('excuse-attest')?.checked || false,
                adult: document.getElementById('excuse-adult')?.checked || false,
                class: document.getElementById('excuse-class')?.value || ''
            },
            dates: {
                attestDate: document.getElementById('excuse-attest-date')?.value || ''
            }
        }
    };

    localStorage.setItem('osi_app_state', JSON.stringify(state));
    console.log('App state saved automatically');
}

function setupDragAndDrop(containerId, importFn, overlayId) {
    const container = document.getElementById(containerId);
    const overlay = document.getElementById(overlayId);
    if (!container || !overlay) return;

    // We use a counter to handle dragenter/dragleave correctly with children
    let dragCounter = 0;

    container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        overlay.classList.add('active');
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            overlay.classList.remove('active');
        }
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        overlay.classList.remove('active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Existing import functions expect an input element with .files
            const dummyInput = { files: files, value: '' };
            importFn(dummyInput);
        }
    });
}

function loadAppState() {
    const savedState = localStorage.getItem('osi_app_state');
    if (!savedState) return;

    try {
        const state = JSON.parse(savedState);

        // Restore Mode
        if (state.currentMode) {
            setMode(state.currentMode, true);
        }

        // Mindmap
        if (state.mindmap) {
            nodes = (state.mindmap.nodes || []).map(n => ({
                ...n,
                parentId: n.parentId !== undefined ? n.parentId : null,
                collapsed: n.collapsed || false
            }));
            connections = state.mindmap.connections || [];
            nextNodeId = state.mindmap.nextNodeId || 1;
            viewState = state.mindmap.viewState || { x: 0, y: 0, zoom: 1 };
            isGridActive = state.mindmap.isGridActive || false;

            // Sync grid UI
            const gridToggle = document.getElementById('grid-toggle');
            if (gridToggle) gridToggle.checked = isGridActive;
            toggleGrid(isGridActive);

            // Render Mindmap
            renderMindmap(); // Need to ensure this function exists or call individual renders
        }

        // Kanban
        if (state.kanban && state.kanban.kanbanState) {
            kanbanState = state.kanban.kanbanState;
            renderKanban();
        }

        // Flashcards
        if (state.flashcards && state.flashcards.flashcards) {
            flashcards = state.flashcards.flashcards;
            if (typeof renderLeitnerRow === 'function') renderLeitnerRow();
            if (typeof renderFlashcardList === 'function') renderFlashcardList();
        }

        // Entschuldigungen Master Data
        if (state.excuses) {
            if (state.excuses.masterData) {
                const md = state.excuses.masterData;
                const nameEl = document.getElementById('excuse-name');
                const dobEl = document.getElementById('excuse-dob');
                const teacherEl = document.getElementById('excuse-teacher');
                const attestEl = document.getElementById('excuse-attest');
                const adultEl = document.getElementById('excuse-adult');
                const classEl = document.getElementById('excuse-class');

                if (nameEl) nameEl.value = md.name || '';
                if (dobEl) dobEl.value = md.dob || '';
                if (teacherEl) teacherEl.value = md.teacher || '';
                if (attestEl) attestEl.checked = md.attest || false;
                if (adultEl) adultEl.checked = md.adult || false;
                if (classEl) classEl.value = md.class || '';

                // Sync pickers for restored DOB
                const dobPicker = document.getElementById('excuse-dob-picker');
                if (dobPicker && dobEl && dobEl.value) {
                    dobPicker.value = toISODate(dobEl.value);
                }
            }

            if (state.excuses.dates) {
                const d = state.excuses.dates;
                const attestDateEl = document.getElementById('excuse-attest-date');

                if (attestDateEl) attestDateEl.value = d.attestDate || '';

                // Sync pickers
                if (attestDateEl && document.getElementById('excuse-attest-date-picker')) {
                    document.getElementById('excuse-attest-date-picker').value = toISODate(attestDateEl.value);
                }
            }

            // Refresh Dependent UI
            if (typeof toggleAttestDate === 'function') toggleAttestDate();
            if (typeof checkAbsenceDuration === 'function') checkAbsenceDuration();
        }

        updateViewport();
    } catch (e) {
        console.error('Failed to load app state:', e);
    }
}

function renderMindmap() {
    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';
    nodes.forEach(n => renderNode(n));
    renderConnections();
    updateAllCollapseButtons();
}

// Prompt Generator Variables
let promptData = {
    role: "",
    task: "",
    context: "",
    format: ""
};

/* --- Prompt Generator Logic --- */

/* --- Prompt Generator Logic --- */

// Templates Data
const PROMPT_TEMPLATES = {
    "default": { role: "", task: "", context: "", format: "" },
    "peer_tutor": {
        role: "Schüler der 11. Klasse",
        task: "Erkläre ... (Thema) ... in einfacher Sprache, so wie du es einem Mitschüler erklären würdest.",
        context: "Du bist hilfsbereit, nutzt Beispiele aus dem Alltag und vermeidest unnötiges Fachchinesisch.",
        format: "Fließtext"
    },
    "swot": {
        role: "Unternehmensberater",
        task: "Erstelle eine detaillierte SWOT-Analyse (Stärken, Schwächen, Chancen, Risiken) für ... (Unternehmen/Idee).",
        context: "Ziel ist die strategische Bewertung eines Geschäftsmodells.",
        format: "Markdown-Tabelle"
    },
    "business_model": {
        role: "Startup-Gründer",
        task: "Entwickle ein Business Model Canvas für ...",
        context: "Fokus auf Value Proposition und Kundensegmente.",
        format: "Aufzählungszeichen"
    },
    "marketing_persona": {
        role: "Marketing-Experte",
        task: "Erstelle eine Buyer Persona für das Produkt ...",
        context: "Demografische Daten, Interessen, Pain Points und Mediennutzung.",
        format: "Steckbrief (Liste)"
    },
    "code_explanation": {
        role: "Software-Entwickler",
        task: "Erkläre den folgenden Code-Schnipsel Zeile für Zeile und finde potenzielle Fehler.",
        context: "Der Code ist in Python/Java/JS geschrieben. Zielgruppe sind Anfänger.",
        format: "Code-Block mit Kommentaren"
    },
    "db_design": {
        role: "Datenbank-Architekt",
        task: "Entwerfe ein ER-Modell (Entity Relationship) für ...",
        context: "Normalisierung bis zur 3. Normalform beachten.",
        format: "Textbeschreibung der Relationen"
    },
    "bug_fix": {
        role: "Senior Developer",
        task: "Debugge diesen Fehler: ...",
        context: "Stack Trace liegt vor. Erkläre die Ursache und die Lösung.",
        format: "Schritt-für-Schritt Anleitung"
    }
};

const IMAGE_PROMPT_TEMPLATES = {
    "default": {
        role: "Kreativer KI-Bildgenerator",
        task: "Erstelle ein Bild nach folgender Beschreibung: ...",
        context: "Stil: Fotorealistisch, 4k, detailreich",
        format: "Englischer Prompt (kommagetrennt)"
    },
    "illustration": {
        role: "Digital Artist",
        task: "Zeichne eine Vektor-Illustration zum Thema: ...",
        context: "Stil: Flat Design, lebhafte Farben, minimaler Hintergrund",
        format: "Englischer Prompt"
    },
    "logo": {
        role: "Logo-Designer",
        task: "Entwerfe ein minimalistisches Logo für: ...",
        context: "Stil: Vektorgrafik, flat, abstrakt",
        format: "Englischer Prompt"
    }
};

let currentPromptMode = 'text';

function togglePromptMode(mode) {
    currentPromptMode = mode;

    // Toggle active classes on buttons
    document.getElementById('prompt-btn-text').classList.toggle('active', mode === 'text');
    document.getElementById('prompt-btn-image').classList.toggle('active', mode === 'image');

    const textBuilder = document.getElementById('prompt-text-builder');
    const imageBuilder = document.getElementById('prompt-image-builder');

    const textPreviewBox = document.getElementById('prompt-preview-box-text');
    const imagePreviewBox = document.getElementById('prompt-preview-box-image');

    if (mode === 'text') {
        if (textBuilder) textBuilder.style.display = 'block';
        if (imageBuilder) imageBuilder.style.display = 'none';

        if (textPreviewBox) textPreviewBox.style.display = 'block';
        if (imagePreviewBox) imagePreviewBox.style.display = 'none';

        // Trigger updates for text mode
        updatePrompt('role', null);
        updatePrompt('task', null);
        updatePrompt('context', null);
        updatePrompt('format', null);
    } else {
        if (textBuilder) textBuilder.style.display = 'none';
        if (imageBuilder) imageBuilder.style.display = 'block';

        if (textPreviewBox) textPreviewBox.style.display = 'none';
        if (imagePreviewBox) imagePreviewBox.style.display = 'block';

        // Trigger updates for image mode
        updateImagePromptPreview();
    }
}

// Image Prompt Logic
let currentImageStyle = 'Klassisch';

function selectImageStyle(styleName, btnElement) {
    currentImageStyle = styleName;

    const isActive = btnElement.classList.contains('active');
    const activeThumb = btnElement.querySelector('.style-thumbnail');
    const wasThumbVisible = activeThumb && activeThumb.style.display === 'block';

    // Update active class on buttons
    const buttons = btnElement.parentElement.querySelectorAll('.btn-style');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        const thumb = btn.querySelector('.style-thumbnail');
        if (thumb) thumb.style.display = 'none';
    });

    // If clicking the same button that was already active and its thumb was visible, hide it.
    // Otherwise show it.
    btnElement.classList.add('active');

    if (isActive && wasThumbVisible) {
        if (activeThumb) activeThumb.style.display = 'none';
        // Note: we still keep it "active" in terms of selection state for the prompt generation, 
        // just hiding the thumbnail to save space as requested.
    } else {
        if (activeThumb) activeThumb.style.display = 'block';
    }

    updateImagePromptPreview();
}

// Global click listener to hide thumbnails when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-style')) {
        document.querySelectorAll('.style-thumbnail').forEach(thumb => {
            thumb.style.display = 'none';
        });
    }
});

function insertImagePromptExample() {
    const descTextarea = document.getElementById('prompt-image-desc');
    if (descTextarea) {
        descTextarea.value = "Foto eines Menschen in einem bunten Karnevalskostüm als majestätischer Pfau, der selbstbewusst auf einer belebten, festlich geschmückten Straße steht. Das Kostüm hat leuchtend blaue und grüne Federn mit schillernden Augenmustern. Im Hintergrund sind verschwommene tanzende Menschen und bunte Girlanden unter einem klaren blauen Himmel zu sehen. Die Szene ist in einem hellen, freudigen Stil gehalten, mit Fokus auf das detailreiche Pfauenkostüm und das Gesicht der Person.";
        updateImagePromptPreview();
    }
}

function updateImagePromptPreview() {
    const desc = document.getElementById('prompt-image-desc')?.value || '';
    const size = document.getElementById('prompt-image-size')?.value || '';

    let promptParts = [];

    if (desc.trim()) {
        promptParts.push(desc.trim());
    } else {
        promptParts.push("[Bitte beschreiben Sie das Bild]");
    }

    if (currentImageStyle && currentImageStyle !== 'Klassisch') {
        promptParts.push(`Stil: ${currentImageStyle}`);
    }

    if (size) {
        promptParts.push(`Größe/Format: ${size}`);
    }

    // Format for the preview box (reusing existing UI)
    const previewBox = document.getElementById('prompt-preview-box-image');
    if (previewBox) {
        let previewHTML = '';
        if (desc.trim()) {
            previewHTML += `<span class="preview-line"><span class="token-key">**Bildbeschreibung:**</span> <span class="user-input-highlight">${desc.trim()}</span></span>`;
        } else {
            previewHTML += `<span class="preview-line"><span class="token-key">**Bildbeschreibung:**</span> <span class="token-placeholder">[Bitte beschreiben Sie das Bild]</span></span>`;
        }

        if (currentImageStyle && currentImageStyle !== 'Klassisch') {
            previewHTML += `<span class="preview-line"><span class="token-key">**Stil:**</span> <span class="user-input-highlight">${currentImageStyle}</span></span>`;
        }

        if (size) {
            previewHTML += `<span class="preview-line"><span class="token-key">**Format/Größe:**</span> <span class="user-input-highlight">${size}</span></span>`;
        }

        previewBox.innerHTML = previewHTML;
    }

    // Update quality indicator for image (simplified)
    let score = 0;
    if (desc.trim().length > 10) score += 50;
    if (desc.trim().length > 50) score += 30; // 80 total for good desc
    if (currentImageStyle !== 'Klassisch') score += 10;
    if (size) score += 10;

    const bar = document.getElementById('quality-bar');
    const scoreText = document.getElementById('quality-score');
    const feedback = document.getElementById('quality-feedback');

    if (bar && scoreText) {
        bar.style.width = `${score}%`;
        scoreText.textContent = `${score}%`;
        bar.className = 'progress-bar-fill';

        if (score < 40) {
            bar.classList.add('low');
            if (feedback) feedback.textContent = "Beschreibe dein Bild genauer.";
        } else if (score < 80) {
            bar.classList.add('medium');
            if (feedback) feedback.textContent = "Gut! Mit mehr Details wird das Bild exakter.";
        } else {
            bar.classList.add('high');
            if (feedback) feedback.textContent = "Perfekte Bildbeschreibung!";
        }
    }
}

function applyPromptTemplate(templateKey) {
    const templates = currentPromptMode === 'image' ? IMAGE_PROMPT_TEMPLATES : PROMPT_TEMPLATES;
    const template = templates[templateKey];
    if (!template) return;

    // Apply values to inputs
    setFieldValue('prompt-role-select', template.role);
    setFieldValue('prompt-task', template.task);
    setFieldValue('prompt-context', template.context);
    setFieldValue('prompt-format-select', template.format);

    // If role/format not in select options, handle custom logic could be complex. 
    // For now, assume templates map to existing options or switch to custom if implemented logic supports it.
    // Simpler: Just update the fields and trigger updates.

    // Check if role exists in select, else set to custom
    handleSelectOrCustom('prompt-role-select', 'prompt-role-custom', template.role);
    handleSelectOrCustom('prompt-format-select', 'prompt-format-custom', template.format);

    updatePrompt('role', template.role);
    updatePrompt('task', template.task);
    updatePrompt('context', template.context);
    updatePrompt('format', template.format);
}

function handleSelectOrCustom(selectId, customInputId, value) {
    const select = document.getElementById(selectId);
    let options = Array.from(select.options).map(o => o.value);

    // Check if value matches an existing option (except empty string/default)
    const match = options.find(opt => opt === value);

    if (match || value === "") {
        select.value = value;
        document.getElementById(customInputId).style.display = 'none';
    } else {
        select.value = 'custom';
        const customInput = document.getElementById(customInputId);
        customInput.style.display = 'block';
        customInput.value = value;
    }
}

function setFieldValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function updatePrompt(field, value) {
    // 1. Handle Custom Logic and Value Retrieval
    const selectEl = document.getElementById(`prompt-${field}-select`);
    const customInputEl = document.getElementById(`prompt-${field}-custom`);
    const textAreaEl = document.getElementById(`prompt-${field}`);

    let displayValue = value;

    // If it's a select/custom field combo
    if (selectEl && customInputEl) {
        // If called from select onchange
        if (value === null) {
            // If value is null, read from current select state
            if (selectEl.value === 'custom') {
                customInputEl.style.display = 'block';
                displayValue = customInputEl.value;
            } else {
                customInputEl.style.display = 'none';
                displayValue = selectEl.value;
            }
        }
        // If called with a specific value (e.g. from template or typing in custom)
        else {
            // If typing in custom, ensure display is block
            if (selectEl.value === 'custom') {
                customInputEl.style.display = 'block';
            } else {
                customInputEl.style.display = 'none';
            }
        }
    } else if (textAreaEl && value === null) {
        // If textarea and value not provided, read it
        displayValue = textAreaEl.value;
    }

    // 2. Update Preview with Highlighting
    const previewElement = document.getElementById(`preview-${field}`);
    if (previewElement) {
        if (displayValue && displayValue.trim() !== "") {
            // Apply Highlighting Class
            previewElement.innerHTML = `<span class="user-input-highlight">${displayValue}</span>`;
            previewElement.classList.remove('token-placeholder');
        } else {
            previewElement.textContent = getPlaceholderText(field);
            previewElement.classList.add('token-placeholder');
        }
    }

    // 3. Update Check/Quality
    updateQualityIndicator();

    // 4. Show/Hide Tips (Validation Logic)
    const tipEl = document.getElementById(`tip-${field}`);
    if (tipEl) {
        let isValid = true;
        if (field === 'task' || field === 'context') {
            isValid = validateWordCount(displayValue, 3);
        } else {
            isValid = displayValue && displayValue.length >= 2;
        }

        if (!isValid) {
            tipEl.classList.add('visible');
            if (field === 'task' || field === 'context') {
                tipEl.textContent = "Bitte mindestens 3 Wörter eingeben.";
            }
        } else {
            tipEl.classList.remove('visible');
        }
    }
}

function validateWordCount(text, minWords) {
    if (!text) return false;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length >= minWords;
}

function getPlaceholderText(field) {
    switch (field) {
        case 'role': return "[Bitte Rolle wählen]";
        case 'task': return "[Bitte Aufgabe eingeben]";
        case 'context': return "[Optional: Kontext]";
        case 'format': return "[Optional: Format]";
        default: return "[...]";
    }
}

function updateQualityIndicator() {
    const role = getValue('role');
    const task = getValue('task');
    const context = getValue('context');
    const format = getValue('format');

    let score = 0;

    // Role (must be selected or typed)
    if (role && role.length > 2) score += 25;

    // Task (min 3 words)
    if (validateWordCount(task, 3)) score += 35;

    // Context (min 3 words)
    if (validateWordCount(context, 3)) score += 20;

    // Format (must be selected or typed)
    if (format && format.length > 2) score += 20;

    const bar = document.getElementById('quality-bar');
    const scoreText = document.getElementById('quality-score');
    const feedback = document.getElementById('quality-feedback');

    if (bar && scoreText) {
        bar.style.width = `${score}%`;
        scoreText.textContent = `${score}%`;

        // Color & Feedback
        bar.className = 'progress-bar-fill'; // Reset
        let feedbackText = "";

        if (score < 40) {
            bar.classList.add('low');
            feedbackText = "Der Prompt ist noch zu vage.";
            if (!validateWordCount(task, 3)) feedbackText += " Beschreibe die Aufgabe genauer.";
        } else if (score < 80) {
            bar.classList.add('medium');
            feedbackText = "Schon ganz gut!";
            if (!validateWordCount(context, 3)) feedbackText += " Ergänze Kontext (mind. 3 Wörter).";
        } else {
            bar.classList.add('high');
            feedbackText = "Exzellenter Prompt! Du kannst ihn jetzt testen.";
        }

        feedback.textContent = feedbackText;
    }
}

function getValue(field) {
    const select = document.getElementById(`prompt-${field}-select`);
    const custom = document.getElementById(`prompt-${field}-custom`);
    const textArea = document.getElementById(`prompt-${field}`); // For task/context

    if (textArea) return textArea.value;
    if (select) {
        return select.value === 'custom' ? custom.value : select.value;
    }
    return "";
}

// --- Refinement Logic ---

const REFINE_OPTIONS_TEXT = [
    { id: 'step_by_step', label: 'Schritt-für-Schritt', text: 'Denke Schritt für Schritt und erkläre deine Gedankengänge.' },
    { id: 'critical', label: 'Kritische Prüfung', text: 'Hinterfrage deine Antwort kritisch auf Richtigkeit und gib Quellen an, wenn möglich.' },
    { id: 'simple', label: 'Einfache Sprache', text: 'Verwende einfache Sprache und kurze Sätze. Vermeide Fachjargon.' },
    { id: 'examples', label: 'Konkrete Beispiele', text: 'Füge konkrete Beispiele hinzu, um die Erklärung zu verdeutlichen.' }
];

const REFINE_OPTIONS_IMAGE = [
    { id: 'img_realistic', label: 'Fotorealistisch machen', text: 'Das Bild soll absolut fotorealistisch wirken, wie mit einer hochwertigen Kamera aufgenommen.' },
    { id: 'img_dramatic', label: 'Dramatische Beleuchtung', text: 'Nutze dramatische Beleuchtung mit starken Kontrasten und Kino-Beleuchtung (Cinematic Lighting).' },
    { id: 'img_detailed', label: 'Sehr detailreich', text: 'Füge extrem viele Details hinzu, hochauflösend, Meisterwerk.' },
    { id: 'img_cyberpunk', label: 'Cyberpunk-Stil', text: 'Gestalte die Szene im Cyberpunk-Stil mit Neonfarben, Regen und futuristischen Elementen.' }
];

function openRefineModal() {
    const modal = document.getElementById('refine-dialog');
    const container = document.getElementById('refine-options-container');

    if (container) {
        let options = currentPromptMode === 'image' ? REFINE_OPTIONS_IMAGE : REFINE_OPTIONS_TEXT;
        let currentText = "";

        if (currentPromptMode === 'image') {
            const targetEl = document.getElementById('prompt-image-desc');
            if (targetEl) currentText = targetEl.value;
        } else {
            const targetEl = document.getElementById('prompt-context');
            if (targetEl) currentText = targetEl.value;
        }

        container.innerHTML = options.map(opt => {
            const isChecked = currentText.includes(opt.text);
            return `
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--text-main);">
                    <input type="checkbox" value="${opt.id}" ${isChecked ? 'checked' : ''} style="width: auto;">
                    ${opt.label}
                </label>
            `;
        }).join('');
    }

    if (modal) modal.style.display = 'flex';
}

function closeRefineModal() {
    const modal = document.getElementById('refine-dialog');
    if (modal) modal.style.display = 'none';
}

function applyRefinement() {
    const container = document.getElementById('refine-options-container');
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    let options = currentPromptMode === 'image' ? REFINE_OPTIONS_IMAGE : REFINE_OPTIONS_TEXT;

    let targetEl;
    if (currentPromptMode === 'image') {
        targetEl = document.getElementById('prompt-image-desc');
    } else {
        targetEl = document.getElementById('prompt-context');
    }

    if (!targetEl) return;

    let currentText = targetEl.value;

    checkboxes.forEach(cb => {
        const opt = options.find(o => o.id === cb.value);
        if (opt) {
            const isChecked = cb.checked;
            const textPresent = currentText.includes(opt.text);

            if (isChecked && !textPresent) {
                // Add text
                if (currentText.trim() !== "") {
                    // Using space for image, double newline for text
                    const separator = currentPromptMode === 'image' ? " " : "\n\n";
                    currentText += separator + opt.text;
                } else {
                    currentText = opt.text;
                }
            } else if (!isChecked && textPresent) {
                // Remove text
                currentText = currentText.replace(opt.text, "").trim();
                // Clean up possible left-over double newlines etc.
                currentText = currentText.replace(/\n\n\n+/g, '\n\n');
                currentText = currentText.replace(/  +/g, ' ');
            }
        }
    });

    targetEl.value = currentText.trim();

    if (currentPromptMode === 'image') {
        updateImagePromptPreview();
    } else {
        updatePrompt('context', targetEl.value);
    }

    // Visual Feedback
    const btn = document.querySelector("button[onclick='openRefineModal()']");
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = "✨ Optimiert!";
        setTimeout(() => btn.innerHTML = originalText, 1500);
    }

    closeRefineModal();
}


function copyPrompt() {
    let textToCopy = "";

    if (currentPromptMode === 'text') {
        const roleVal = getValue('role');
        const taskVal = getValue('task');
        const contextVal = getValue('context');
        const formatVal = getValue('format');

        textToCopy = `**Rolle:** ${roleVal || "[Rolle]"}\n**Aufgabe:** ${taskVal || "[Aufgabe]"}\n**Kontext:** ${contextVal || "[Kontext]"}\n**Format:** ${formatVal || "[Format]"}`;
    } else {
        const desc = document.getElementById('prompt-image-desc')?.value.trim() || "[Bitte beschreiben Sie das Bild]";
        const size = document.getElementById('prompt-image-size')?.value || "";

        let promptParts = [desc];

        if (currentImageStyle && currentImageStyle !== 'Klassisch') {
            promptParts.push(`Stil: ${currentImageStyle}`);
        }

        if (size) {
            promptParts.push(`Größe/Format: ${size}`);
        }

        textToCopy = promptParts.join("\n\n");
    }

    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
        // Show toast or visual feedback
        const btn = document.querySelector("button[onclick='copyPrompt()']"); // The desktop one
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><polyline points="20 6 9 17 4 12"></polyline></svg> Kopiert!';
            setTimeout(() => {
                btn.innerHTML = originalText;
                // Restore icon if needed, but text is fine for simplified
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.3rem;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Kopieren`;
            }, 2000);
        }

        // Also mobile fab feedback
        const fab = document.getElementById('mobile-copy-fab');
        if (fab) {
            const originalFab = fab.innerHTML;
            fab.innerHTML = "✅ Kopiert!";
            setTimeout(() => {
                fab.innerHTML = originalFab;
            }, 2000);
        }
    });
}
function initTheme() {
    // Default to 'gray' if not set
    let savedTheme = localStorage.getItem('osi_theme');
    if (!savedTheme) {
        savedTheme = 'gray';
        localStorage.setItem('osi_theme', 'gray');
    }

    applyTheme(savedTheme);
}

function toggleTheme() {
    let currentTheme = localStorage.getItem('osi_theme') || 'light';
    let nextTheme = 'light';

    if (currentTheme === 'light') {
        nextTheme = 'dark';
    } else if (currentTheme === 'dark') {
        nextTheme = 'gray';
    } else if (currentTheme === 'gray') {
        nextTheme = 'dark-gray';
    } else {
        nextTheme = 'light';
    }

    applyTheme(nextTheme);
    localStorage.setItem('osi_theme', nextTheme);

    if (typeof currentUser !== 'undefined' && currentUser) {
        // fetchAPI is defined in cloud-sync.js which is loaded before script.js
        if (typeof fetchAPI === 'function') {
            fetchAPI('/api/auth/me', {
                method: 'PUT',
                body: JSON.stringify({ theme: nextTheme })
            }).catch(e => console.error(e));
        }
    }
}

function applyTheme(theme) {
    // Remove old classes
    document.body.classList.remove('light-mode', 'gray-mode', 'dark-gray-mode');
    document.body.removeAttribute('data-theme');

    // Apply new theme
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else if (theme === 'gray') {
        document.body.classList.add('gray-mode');
    } else if (theme === 'dark-gray') {
        document.body.classList.add('dark-gray-mode');
    }

    updateThemeIcons(theme);
}

function updateThemeIcons(theme) {
    const sidebarBtn = document.getElementById('sidebar-theme-btn');
    const sidebarIcon = document.getElementById('sidebar-theme-icon');
    const headerBtn = document.getElementById('header-theme-btn');

    let iconSVG = '';
    let labelText = '';

    if (theme === 'light') {
        // Sun Icon
        iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        labelText = 'Hell';
    } else if (theme === 'dark') {
        // Moon Icon
        iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        labelText = 'Dunkel';
    } else if (theme === 'gray') {
        // Grayscale / Contrast Icon (Circle with half filled or similar)
        iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10V2z"></path></svg>';
        labelText = 'Graustufen';
    } else if (theme === 'dark-gray') {
        // Dark Gray Icon (Maybe same as moon or contrast but distinct?) 
        // Let's use a square with half fill or similar to distinguish
        iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 3v18"></path></svg>';
        labelText = 'Dunkelgrau';
    }

    if (headerBtn) headerBtn.innerHTML = iconSVG;
    if (sidebarIcon) sidebarIcon.innerHTML = iconSVG;
}

function setMode(mode, silent = false) {
    currentMode = mode;

    // Sidebar Active States
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-btn[onclick="setMode('${mode}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        const subtitleEl = document.getElementById('header-subtitle');
        if (subtitleEl) {
            let titleText = activeBtn.textContent.trim();
            // Remove "Alpha" or "Beta" if they appear at the end of the text
            titleText = titleText.replace(/\s+(Alpha|Beta)$/i, '');
            subtitleEl.textContent = titleText;
        }
    }

    // Close any open menus (e.g. Digiboard mobile menu) to prevent overlap on new section screens
    document.querySelectorAll('.burger-dropdown, .digiboard-dropdown').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });

    // Sections
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));

    if (mode === 'launchpad') {
        document.getElementById('launchpad-section').classList.add('active');
    } else if (mode === 'mindmap') {
        mindmapSection.classList.add('active');
    } else if (mode === 'impressum') {
        impressumSection.classList.add('active');
    } else if (mode === 'disclaimer') {
        disclaimerSection.classList.add('active');
    } else if (mode === 'privacy') {
        privacySection.classList.add('active');
    } else if (mode === 'kanban') {
        document.getElementById('kanban-section').classList.add('active');
        initKanban(); // Initialize if needed
    } else if (mode === 'flashcards') {
        document.getElementById('flashcards-section').classList.add('active');
        initFlashcards();
    } else if (mode === 'pomodoro') {
        document.getElementById('pomodoro-section').classList.add('active');
        initPomodoro();
    } else if (mode === 'qrcode') {
        document.getElementById('qrcode-section').classList.add('active');
    } else if (mode === 'prompt') {
        document.getElementById('prompt-section').classList.add('active');
    } else if (mode === 'digiboard') {
        document.getElementById('digiboard-section').classList.add('active');
        if (window.digiboardApp && !window.digiboardApp.initialized) {
            window.digiboardApp.init();
        }
    } else if (mode === 'entschuldigungen') {
        document.getElementById('entschuldigungen-section').classList.add('active');
        initEntschuldigungen();
    } else if (mode === 'changelog') {
        changelogSection.classList.add('active');
    }

    // Mobile: Close Sidebar on selection
    if (window.innerWidth <= 768) {
        document.body.classList.add('sidebar-collapsed');
        sidebar.classList.remove('open');
    }

    if (!silent) saveAppState();
}

function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        sidebar.classList.toggle('open');
    }
}

function toggleToolbar() {
    document.body.classList.toggle('toolbar-hidden');
    const btn = document.getElementById('toolbar-toggle-btn');
    if (document.body.classList.contains('toolbar-hidden')) {
        // Arrow down (to expand)
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    } else {
        // Arrow up (to collapse)
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    }
}

function toggleBurgerMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;

    // Close other open menus first
    document.querySelectorAll('.burger-dropdown').forEach(el => {
        if (el.id !== menuId) el.style.display = 'none';
    });

    // Toggle
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
        return;
    }

    menu.style.display = 'flex';
    adjustBurgerDropdownPosition(menu);
}

function adjustBurgerDropdownPosition(menu) {
    if (!menu) return;

    // Default: align left edge of menu with left edge of button (opens to the right)
    menu.style.left = '0';
    menu.style.right = 'auto';

    const padding = 10;
    const windowWidth = window.innerWidth;
    const parent = menu.offsetParent || menu.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, right: windowWidth };
    let rect = menu.getBoundingClientRect();

    // If opening to the right overflows the window on the right:
    if (rect.right > windowWidth - padding) {
        // Try aligning right edge of menu with right edge of button (opens to the left)
        menu.style.left = 'auto';
        menu.style.right = '0';
        rect = menu.getBoundingClientRect();

        // If aligning right now causes it to overflow on the left:
        if (rect.left < padding) {
            const localLeft = padding - parentRect.left;
            menu.style.left = `${localLeft}px`;
            menu.style.right = 'auto';
        }
    } else if (rect.left < padding) {
        const localLeft = padding - parentRect.left;
        menu.style.left = `${localLeft}px`;
        menu.style.right = 'auto';
    }
}

// Close menus when clicking outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('.burger-menu-container')) {
        document.querySelectorAll('.burger-dropdown').forEach(el => {
            el.style.display = 'none';
        });
    }
});

// Reposition open menus on resize
window.addEventListener('resize', () => {
    document.querySelectorAll('.burger-dropdown').forEach(el => {
        if (el.style.display === 'flex') {
            adjustBurgerDropdownPosition(el);
        }
    });
});


// --- Viewport Logic ---

function centerViewport() {
    // Reset to center
    // Ideally we want 0,0 of viewport to be at top-left of container, but let's shift it so (0,0) coordinate is visible
    // For now, start at 0,0 pan
    viewState.x = 0;
    viewState.y = 0;
    viewState.zoom = 1;
    updateViewport();
}

function updateViewport() {
    viewport.style.transform = `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`;
}


function initViewportControls() {
    let isPanning = false;
    let startPanX, startPanY;
    let lastViewStateX, lastViewStateY;

    // Mouse Panning
    container.addEventListener('mousedown', (e) => {
        // Only pan if clicking on background (svg or container)
        // e.target might be the svg or the viewport div
        if (e.target !== container && e.target !== svgLayer && e.target !== viewport) return;

        isPanning = true;
        startPanX = e.clientX;
        startPanY = e.clientY;
        lastViewStateX = viewState.x;
        lastViewStateY = viewState.y;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - startPanX;
        const dy = e.clientY - startPanY;
        viewState.x = lastViewStateX + dx;
        viewState.y = lastViewStateY + dy;
        updateViewport();
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = '';
        }
    });

    // Zooming (Wheel)
    container.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();

            // Use deltaY directly to handle both Mouse Wheel (large delta) and Trackpad (small frequent deltas) appropriately.
            // Mouse wheel is usually around 100 per tick. Trackpad is much smaller.
            // Original constant step was 0.1 (too fast for trackpad).
            // New dynamic step: 
            const zoomFactor = 0.002; // Adjust this for overall speed

            // e.deltaY is positive for scrolling down (zooming out usually), negative for up (zooming in)
            // corresponding to: existing logic direction = e.deltaY > 0 ? -1 : 1; meaning positive delta -> negative zoom

            let deltaMove = -e.deltaY * zoomFactor;

            let newZoom = viewState.zoom + deltaMove;

            // Constraints
            newZoom = Math.max(0.2, Math.min(newZoom, 5));

            // Simple zoom
            viewState.zoom = newZoom;
            updateViewport();
        } else {
            // Let normal scroll happen if not zoom intent? No, we blocked overflow.
            // Maybe pan on scroll?
            // e.preventDefault();
            // viewState.y -= e.deltaY;
            // viewState.x -= e.deltaX;
            // updateViewport();
        }
    }, { passive: false });


    // --- Touch Panning & Zooming ---
    let initialPinchDistance = null;
    let initialPinchZoom = null;
    let lastTouchX = null;
    let lastTouchY = null;
    let bgPressTimer = null;
    let bgStartX = 0, bgStartY = 0;

    container.addEventListener('touchstart', (e) => {
        if (e.target !== container && e.target !== svgLayer && e.target !== viewport) return;

        if (e.touches.length === 1) {
            // Pan
            isPanning = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;

            // Long Press Setup
            bgStartX = lastTouchX;
            bgStartY = lastTouchY;
            bgPressTimer = setTimeout(() => {
                isPanning = false; // Stop Panning
                showContextMenu(e.touches[0], 'background');
            }, 600);

        } else if (e.touches.length === 2) {
            // Pinch start
            isPanning = false; // Disable pan if pinching
            clearTimeout(bgPressTimer); // Cancel long press
            const dist = getPinchDistance(e);
            initialPinchDistance = dist;
            initialPinchZoom = viewState.zoom;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            // Check for movement to cancel long press
            const moveX = e.touches[0].clientX;
            const moveY = e.touches[0].clientY;
            if (Math.abs(moveX - bgStartX) > 10 || Math.abs(moveY - bgStartY) > 10) {
                clearTimeout(bgPressTimer);
            }

            if (isPanning) {
                // Pan
                const dx = moveX - lastTouchX;
                const dy = moveY - lastTouchY;
                viewState.x += dx;
                viewState.y += dy;
                lastTouchX = moveX;
                lastTouchY = moveY;
                updateViewport();
                e.preventDefault(); // Prevent page scroll
            }
        } else if (e.touches.length === 2) {
            // Pinch Zoom
            clearTimeout(bgPressTimer);
            const dist = getPinchDistance(e);
            if (initialPinchDistance && initialPinchZoom) {
                const ratio = dist / initialPinchDistance;
                // Dampen the zoom sensitivity (e.g., allow only 60% of the raw change)
                let newZoom = initialPinchZoom * (1 + (ratio - 1) * 0.6);
                newZoom = Math.max(0.2, Math.min(newZoom, 5));
                viewState.zoom = newZoom;
                updateViewport();
            }
            e.preventDefault();
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        clearTimeout(bgPressTimer);
        if (e.touches.length < 2) {
            initialPinchDistance = null;
        }
        if (e.touches.length === 0) {
            isPanning = false;
        }
    });

    // Desktop Context Menu for Background (Missing previously)
    container.addEventListener('contextmenu', (e) => {
        // Prevent default browser menu
        e.preventDefault();
        // Only if clicking on background directly (not on a node or line)
        if (e.target === container || e.target === svgLayer || e.target === viewport) {
            showContextMenu(e, 'background');
        }
    });
}

function toggleGrid(active) {
    isGridActive = active;
    const gridOverlay = document.getElementById('mindmap-grid-overlay');
    if (gridOverlay) {
        gridOverlay.style.display = active ? 'block' : 'none';
    }
}

function getPinchDistance(e) {
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}


// --- Mindmap Logic ---

// Get direct children of a node (nodes whose parentId === nodeId)
function getChildNodeIds(nodeId) {
    return nodes.filter(n => n.parentId === nodeId).map(n => n.id);
}

// Recursively get all descendant IDs of a node
function getAllDescendantIds(nodeId) {
    const descendants = [];
    const children = getChildNodeIds(nodeId);
    children.forEach(childId => {
        descendants.push(childId);
        descendants.push(...getAllDescendantIds(childId));
    });
    return descendants;
}

// Get the set of all node IDs that should currently be hidden
function getHiddenNodeIds() {
    const hidden = new Set();
    nodes.forEach(n => {
        if (n.collapsed) {
            const desc = getAllDescendantIds(n.id);
            desc.forEach(id => hidden.add(id));
        }
    });
    return hidden;
}

// Check if a node has children
function nodeHasChildren(nodeId) {
    return nodes.some(n => n.parentId === nodeId);
}

// Toggle collapsed state
function toggleNodeCollapse(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.collapsed = !node.collapsed;
    renderMindmap();
    saveAppState();
}

// Update collapse buttons on all nodes (call after connections/children change)
function updateAllCollapseButtons() {
    nodes.forEach(node => {
        const el = document.getElementById(`node-${node.id}`);
        if (!el) return;
        const collapseBtn = el.querySelector('.node-collapse-btn');
        if (collapseBtn) {
            const hasChildren = nodeHasChildren(node.id);
            collapseBtn.style.display = hasChildren ? 'flex' : 'none';
            collapseBtn.textContent = node.collapsed ? '+' : '\u2212';
            collapseBtn.classList.toggle('is-collapsed', !!node.collapsed);
        }
    });
}

function createNewNodeCenter() {
    const rect = container.getBoundingClientRect();
    // Center of visible container (relative to screen)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Convert to Viewport Coordinates
    // viewX = (screenX - panX) / zoom
    const vpX = (centerX - viewState.x) / viewState.zoom;
    const vpY = (centerY - viewState.y) / viewState.zoom;

    createNode(vpX - 60, vpY - 30); // Center node size
}

function createNode(x, y, text = 'Neuer Knoten', parentId = null) {
    const id = nextNodeId++;
    const node = {
        id,
        x,
        y,
        text,
        color: null, // Custom color
        width: 120,
        height: 60,
        parentId: parentId,
        collapsed: false
    };
    nodes.push(node);

    // If this node has a parent, create a connection
    if (parentId !== null) {
        const exists = connections.some(c =>
            (c.fromId === parentId && c.toId === id) ||
            (c.fromId === id && c.toId === parentId)
        );
        if (!exists) {
            connections.push({
                fromId: parentId,
                toId: id,
                text: '',
                color: null
            });
        }
    }

    renderNode(node);
    renderConnections();
    updateAllCollapseButtons();
    saveAppState();
    return node;
}

// Create a child node from a parent node
function createChildNode(parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    // If parent is collapsed, expand it first
    if (parent.collapsed) {
        parent.collapsed = false;
    }

    // Position the child to the right and slightly below the parent
    const existingChildren = nodes.filter(n => n.parentId === parentId);
    const offsetY = existingChildren.length * 80; // Stack children vertically
    const childX = parent.x + parent.width + 60;
    const childY = parent.y + offsetY;

    createNode(childX, childY, 'Neuer Knoten', parentId);
}

function renderNode(node) {
    // Check if this node should be hidden (collapsed by a parent)
    const hiddenIds = getHiddenNodeIds();
    if (hiddenIds.has(node.id)) {
        const existing = document.getElementById(`node-${node.id}`);
        if (existing) existing.style.display = 'none';
        return;
    }

    let el = document.getElementById(`node-${node.id}`);
    // Confirm el creation
    if (!el) {
        el = document.createElement('div');
        el.className = 'mindmap-node';
        el.id = `node-${node.id}`;
        nodesLayer.appendChild(el);

        el.innerHTML = `
            <div class="node-add-child-btn" onclick="event.stopPropagation(); createChildNode(${node.id})" title="Unterknoten hinzufügen">+</div>
            <div class="node-collapse-btn" onclick="event.stopPropagation(); toggleNodeCollapse(${node.id})" title="Einklappen/Ausklappen"></div>
            <div class="node-content" contenteditable="false" spellcheck="false" onblur="updateNodeText(${node.id}, this)">${node.text}</div>
            <div class="node-port" onclick="handlePortClick(event, ${node.id})"></div>
        `;

        // Dragging Logic - ONLY attach once
        makeDraggable(el, node.id);

        const handles = ['tl', 'tr', 'bl'];
        handles.forEach(pos => {
            const h = document.createElement('div');
            h.className = `resize-handle handle-${pos}`;
            el.appendChild(h);
            makeResizable(h, node.id, pos);
        });

        // Double click to edit (Desktop)
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            handleMenuRename(node.id);
        });

        // Check for double tap on touch
        let lastTap = 0;
        el.addEventListener('touchend', (e) => {
            // Do not handle double tap if we just finished dragging (optional check, but simple double tap usually implies no drag)
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                e.stopPropagation();
                e.preventDefault(); // Prevent zoom/default
                handleMenuRename(node.id);
            }
            lastTap = currentTime;
        });


        // Context Menu (Desktop)
        el.addEventListener('contextmenu', (e) => showContextMenu(e, 'node', node.id));

        // Long Press for Context Menu (Touch)
        let pressTimer;
        let startX, startY;

        el.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                pressTimer = setTimeout(() => {
                    showContextMenu(e.touches[0], 'node', node.id);
                }, 600);
            }
        }, { passive: false });

        el.addEventListener('touchend', () => clearTimeout(pressTimer));

        el.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const moveX = e.touches[0].clientX;
                const moveY = e.touches[0].clientY;
                if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
                    clearTimeout(pressTimer);
                }
            } else {
                clearTimeout(pressTimer);
            }
        }, { passive: false });
    }

    // Make visible (in case it was previously hidden)
    el.style.display = '';

    // Update position and style
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${node.width}px`;
    el.style.height = `${node.height}px`;

    // Color
    if (node.color) {
        el.style.borderColor = node.color;
        // Also color handles
        const handles = el.querySelectorAll('.resize-handle');
        handles.forEach(h => {
            // For corners, we used border-top/left etc. so border-color works if we set it on the element?
            // The CSS uses specific borders. Let's set border-color which cascades to all sides, but only visible ones show.
            h.style.borderColor = node.color;
        });
        // Optional: slight bg tint?
    } else {
        el.style.borderColor = ''; // Reset to CSS default
    }

    // Update collapse button visibility and icon
    const collapseBtn = el.querySelector('.node-collapse-btn');
    if (collapseBtn) {
        const hasChildren = nodeHasChildren(node.id);
        collapseBtn.style.display = hasChildren ? 'flex' : 'none';
        collapseBtn.textContent = node.collapsed ? '+' : '\u2212';
        collapseBtn.classList.toggle('is-collapsed', !!node.collapsed);
    }

    // Listeners were moved inside if(!el) block to prevent duplication
}

function updateNodeText(id, div) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.text = div.innerText;
        saveAppState();
    }
    div.setAttribute('contenteditable', 'false'); // Disable after edit
    div.blur(); // Ensure blur to hide keyboard

    // Re-enable interactions if needed
}

// Drag & Drop for Nodes
function makeDraggable(el, id) {
    let isDragging = false;
    let startX, startY;
    let initialNodeX, initialNodeY;

    const dragStart = (clientX, clientY) => {
        const node = nodes.find(n => n.id === id);
        if (!node) return; // Safety check

        isDragging = true;
        startX = clientX;
        startY = clientY;

        initialNodeX = node.x;
        initialNodeY = node.y;

        el.style.zIndex = 1000;
        el.classList.add('dragging');
    };

    const dragMove = (clientX, clientY) => {
        if (!isDragging) return;

        // Calculate delta in screen pixels
        const dxScreen = clientX - startX;
        const dyScreen = clientY - startY;

        // Convert delta to viewport pixels (divide by zoom)
        const dx = dxScreen / viewState.zoom;
        const dy = dyScreen / viewState.zoom;

        let newX = initialNodeX + dx;
        let newY = initialNodeY + dy;

        // Snapping
        if (isGridActive) {
            newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
            newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }

        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;

        // Update model
        const node = nodes.find(n => n.id === id);
        if (node) {
            node.x = newX;
            node.y = newY;
        }

        renderConnections();
    };

    const dragEnd = () => {
        if (isDragging) {
            isDragging = false;
            el.style.zIndex = '';
            el.classList.remove('dragging');
            saveAppState();
        }
    };


    const header = el; // Drag entire element

    // Mouse Events
    header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('node-port') || e.target.classList.contains('node-collapse-btn') || e.target.classList.contains('node-add-child-btn') || e.target.getAttribute('contenteditable') === 'true') return;
        dragStart(e.clientX, e.clientY);
        e.stopPropagation(); // Prevent viewport panning
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        dragMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', dragEnd);


    // Touch Events
    header.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('node-port') || e.target.classList.contains('node-collapse-btn') || e.target.classList.contains('node-add-child-btn') || e.target.getAttribute('contenteditable') === 'true') return;
        if (e.touches.length === 1) {
            dragStart(e.touches[0].clientX, e.touches[0].clientY);
            e.stopPropagation();
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        dragMove(e.touches[0].clientX, e.touches[0].clientY);
        // Do NOT preventDefault here if you want scrolling? 
        // But we want to prevent viewport scroll if dragging node.
        if (isDragging) {
            dragMove(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault(); // Prevent scrolling while dragging handle
        }
    }, { passive: false });

    window.addEventListener('touchend', dragEnd);
}

function makeResizable(handle, id, pos) {
    let isResizing = false;
    let startX, startY;
    let startW, startH, startNodeX, startNodeY;
    const minW = 60, minH = 30;

    const resizeStart = (clientX, clientY) => {
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        isResizing = true;
        startX = clientX;
        startY = clientY;
        startW = node.width;
        startH = node.height;
        startNodeX = node.x;
        startNodeY = node.y;
    };

    const resizeMove = (clientX, clientY) => {
        if (!isResizing) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        // Calculate delta in screen pixels
        const dxScreen = clientX - startX;
        const dyScreen = clientY - startY;

        // Convert to viewport pixels
        const dx = dxScreen / viewState.zoom;
        const dy = dyScreen / viewState.zoom;

        let newW = startW;
        let newH = startH;
        let newX = startNodeX;
        let newY = startNodeY;

        if (pos.includes('r')) {
            newW = startW + dx;
            if (isGridActive) newW = Math.round(newW / GRID_SIZE) * GRID_SIZE;
        }
        if (pos.includes('l')) {
            newW = startW - dx;
            newX = startNodeX + dx;
            if (isGridActive) {
                newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                newW = startW + (startNodeX - newX);
            }
        }
        if (pos.includes('b')) {
            newH = startH + dy;
            if (isGridActive) newH = Math.round(newH / GRID_SIZE) * GRID_SIZE;
        }
        if (pos.includes('t')) {
            newH = startH - dy;
            newY = startNodeY + dy;
            if (isGridActive) {
                newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                newH = startH + (startNodeY - newY);
            }
        }

        // Constraints
        if (newW < minW) {
            newW = minW;
            if (pos.includes('l')) newX = startNodeX + (startW - minW); // Fix position if hitting min width from left
        }
        if (newH < minH) {
            newH = minH;
            if (pos.includes('t')) newY = startNodeY + (startH - minH);
        }

        // Update Model
        node.width = newW;
        node.height = newH;
        node.x = newX;
        node.y = newY;

        // Update View
        const el = document.getElementById(`node-${id}`);
        if (el) {
            el.style.width = `${newW}px`;
            el.style.height = `${newH}px`;
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
        }

        renderConnections();
    }

    const resizeEnd = () => {
        isResizing = false;
        saveAppState();
    }

    // Mouse
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Prevent drag
        resizeStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
        if (isResizing) resizeMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', resizeEnd);

    // Touch
    handle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        if (e.touches.length === 1) {
            resizeStart(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (isResizing) {
            e.stopPropagation();
            resizeMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    window.addEventListener('touchend', resizeEnd);
}

// Connections
function handlePortClick(e, id) {
    if (e.stopPropagation) e.stopPropagation(); // Stop propagation

    if (linkingNodeId === null) {
        // Start linking
        linkingNodeId = id;
        document.getElementById(`node-${id}`).classList.add('linking');
    } else {
        // Finish linking
        if (linkingNodeId !== id) {
            // Check if connection already exists
            const exists = connections.some(c =>
                (c.fromId === linkingNodeId && c.toId === id) ||
                (c.fromId === id && c.toId === linkingNodeId)
            );

            if (!exists) {
                connections.push({
                    fromId: linkingNodeId,
                    toId: id,
                    text: '',
                    color: null
                });

                // Set parent-child relationship: target becomes child of source
                // (only if target has no parent yet)
                const targetNode = nodes.find(n => n.id === id);
                if (targetNode && (targetNode.parentId === null || targetNode.parentId === undefined)) {
                    targetNode.parentId = linkingNodeId;
                }

                renderConnections();
                updateAllCollapseButtons();
                saveAppState();
            }
        }
        // Stop linking
        linkingNodeId = null;
        document.querySelectorAll('.mindmap-node.linking').forEach(el => el.classList.remove('linking'));
    }
}

function renderConnections() {
    // Clear SVG
    svgLayer.innerHTML = '';

    // Clear Labels (keep nodes)
    const existingLabels = nodesLayer.querySelectorAll('.connection-label');
    existingLabels.forEach(l => l.remove());

    // Get hidden nodes to skip their connections
    const hiddenIds = getHiddenNodeIds();

    connections.forEach((conn, index) => {
        const n1 = nodes.find(n => n.id === conn.fromId);
        const n2 = nodes.find(n => n.id === conn.toId);
        if (!n1 || !n2) return;

        // Skip connections where either node is hidden
        if (hiddenIds.has(conn.fromId) || hiddenIds.has(conn.toId)) return;

        // Simple center-to-center line
        // Use node width/height for center
        const x1 = n1.x + n1.width / 2;
        const y1 = n1.y + n1.height / 2;
        const x2 = n2.x + n2.width / 2;
        const y2 = n2.y + n2.height / 2;

        // Create Group
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'connection-group');
        group.addEventListener('contextmenu', (e) => showContextMenu(e, 'connection', index));

        // Long Press for Context Menu (Touch) - Connection
        let connPressTimer;
        let connStartX, connStartY;

        group.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Should stop propagation to background?
                // If we don't, background might trigger too?
                // But background ignores e.target !== viewport/svg
                // here e.target is the line (child of svg)
                // So background listener ALREADY ignores it.
                // We just need to handle it here.

                // e.stopPropagation(); // prevent panning if pressing line? 
                // Actually panning should probably still work if you drag?
                // But long press requires stationary.

                connStartX = e.touches[0].clientX;
                connStartY = e.touches[0].clientY;
                connPressTimer = setTimeout(() => {
                    showContextMenu(e.touches[0], 'connection', index);
                }, 600);
            }
        }, { passive: false });

        group.addEventListener('touchend', () => clearTimeout(connPressTimer));

        group.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const moveX = e.touches[0].clientX;
                const moveY = e.touches[0].clientY;
                if (Math.abs(moveX - connStartX) > 10 || Math.abs(moveY - connStartY) > 10) {
                    clearTimeout(connPressTimer);
                }
            } else {
                clearTimeout(connPressTimer);
            }
        }, { passive: false });

        // 1. Hit Area (Transparent, Thick)
        const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hitLine.setAttribute('x1', x1);
        hitLine.setAttribute('y1', y1);
        hitLine.setAttribute('x2', x2);
        hitLine.setAttribute('y2', y2);
        hitLine.setAttribute('class', 'hit-area');

        // 2. Visual Line
        const visLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        visLine.setAttribute('x1', x1);
        visLine.setAttribute('y1', y1);
        visLine.setAttribute('x2', x2);
        visLine.setAttribute('y2', y2);
        visLine.setAttribute('class', 'visual-line');
        visLine.setAttribute('stroke', conn.color || 'var(--text-muted)');
        visLine.setAttribute('stroke-width', '2');

        group.appendChild(hitLine);
        group.appendChild(visLine);
        svgLayer.appendChild(group);

        // 3. Label (HTML)
        // Calculate Midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const label = document.createElement('div');
        label.className = 'connection-label';
        if (conn.text || '') label.classList.add('visible');
        label.innerText = conn.text || '';
        label.style.left = `${midX}px`;
        label.style.top = `${midY}px`;
        label.id = `conn-label-${index}`;

        // Context menu for label too
        label.addEventListener('contextmenu', (e) => showContextMenu(e, 'connection', index));
        // Double click to rename
        label.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            handleMenuRename(null, 'connection', index);
        });

        // Save text on blur
        label.addEventListener('blur', function () {
            conn.text = this.innerText;
            this.removeAttribute('contenteditable');
            if (!this.innerText.trim()) this.classList.remove('visible');
            saveAppState();
        });

        nodesLayer.appendChild(label);
    });
}

// Actions
function handleMenuRename(targetId = null, type = null, id = null) {
    // Resolving arguments: can be called from dblclick (args) or menu (uses contextMenuTarget)
    let targetType = type;
    let targetIdx = id;

    if (!targetType && contextMenuTarget) {
        targetType = contextMenuTarget.type;
        targetIdx = contextMenuTarget.id;
    }

    // Override if direct node dblclick passed simple id
    if (targetId) {
        targetType = 'node';
        targetIdx = targetId;
    }

    if (targetType === 'node') {
        const nodeEl = document.getElementById(`node-${targetIdx}`);
        if (nodeEl) {
            const content = nodeEl.querySelector('.node-content');
            // Ensure we don't conflict with dragging
            hideContextMenu();
            makeEditable(content);
        }
    } else if (targetType === 'connection') {
        // Ensure it has text so it's rendered and visible
        if (!connections[targetIdx].text || !connections[targetIdx].text.trim()) {
            connections[targetIdx].text = 'Beschriftung';
            renderConnections();
            saveAppState();
        }

        const label = document.getElementById(`conn-label-${targetIdx}`);
        if (label) {
            label.classList.add('visible');
            makeEditable(label);
        }
    }
    hideContextMenu();
}

function makeEditable(element) {
    if (!element) return;

    element.setAttribute('contenteditable', 'true');
    element.focus();

    // Select all text
    // Doing this synchronously is better for mobile keyboard
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function handleMenuColor() {
    if (contextMenuTarget) {
        // Pre-fill
        let currentColor = '#0086cb'; // default
        if (contextMenuTarget.type === 'node') {
            const node = nodes.find(n => n.id === contextMenuTarget.id);
            if (node && node.color) currentColor = node.color;
        } else if (contextMenuTarget.type === 'connection') {
            const conn = connections[contextMenuTarget.id];
            if (conn && conn.color) currentColor = conn.color;
        }
        dialogColorInput.value = currentColor;

        colorDialog.style.display = 'flex';
    }
    hideContextMenu();
}

function confirmColor() {
    const color = dialogColorInput.value;
    if (contextMenuTarget) {
        if (contextMenuTarget.type === 'node') {
            const node = nodes.find(n => n.id === contextMenuTarget.id);
            if (node) {
                node.color = color;
                renderNode(node);
                saveAppState();
            }
        } else if (contextMenuTarget.type === 'connection') {
            const conn = connections[contextMenuTarget.id];
            if (conn) {
                conn.color = color;
                renderConnections();
                saveAppState();
            }
        }
    }
    colorDialog.style.display = 'none';
}

function cancelColor() {
    colorDialog.style.display = 'none';
}

function handleMenuDelete() {
    if (contextMenuTarget) {
        if (contextMenuTarget.type === 'node') {
            const nodeId = contextMenuTarget.id;
            const hasChildren = nodeHasChildren(nodeId);

            if (hasChildren) {
                // Show delete mode dialog
                showDeleteDialog(nodeId);
            } else {
                if (confirm('Möchtest du diesen Knoten löschen?')) {
                    deleteNodeOnly(nodeId);
                }
            }
        } else if (contextMenuTarget.type === 'connection') {
            if (confirm('Verbindung löschen?')) {
                connections.splice(contextMenuTarget.id, 1);
                renderConnections();
                updateAllCollapseButtons();
                saveAppState();
            }
        }
    }
    hideContextMenu();
}

// Delete Dialog for nodes with children
function showDeleteDialog(nodeId) {
    // Remove existing dialog if present
    const existing = document.getElementById('delete-mode-dialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'delete-mode-dialog';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3 style="color: var(--primary); margin-bottom: 1rem;">Knoten löschen</h3>
            <p style="margin-bottom: 1.5rem; color: var(--text-main);">Dieser Knoten hat Unterknoten. Was möchtest du tun?</p>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <button class="btn-primary" id="delete-only-btn" style="width: 100%; justify-content: center;">Nur diesen Knoten löschen</button>
                <button class="btn-primary" id="delete-all-btn" style="width: 100%; justify-content: center; background: #ef4444;">Knoten mit allen Unterknoten löschen</button>
                <button class="btn-secondary" id="delete-cancel-btn" style="width: 100%; justify-content: center;">Abbrechen</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('delete-only-btn').addEventListener('click', () => {
        overlay.remove();
        deleteNodeOnly(nodeId);
    });

    document.getElementById('delete-all-btn').addEventListener('click', () => {
        overlay.remove();
        deleteNodeWithDescendants(nodeId);
    });

    document.getElementById('delete-cancel-btn').addEventListener('click', () => {
        overlay.remove();
    });
}

// Delete only this node, orphan its children
function deleteNodeOnly(id) {
    // Orphan children (make them root nodes)
    nodes.forEach(n => {
        if (n.parentId === id) n.parentId = null;
    });
    nodes = nodes.filter(n => n.id !== id);
    connections = connections.filter(c => c.fromId !== id && c.toId !== id);

    const el = document.getElementById(`node-${id}`);
    if (el) el.remove();

    renderMindmap();
    saveAppState();
}

// Delete node and all its descendants
function deleteNodeWithDescendants(id) {
    const descendantIds = getAllDescendantIds(id);
    const idsToDelete = new Set([id, ...descendantIds]);

    // Remove all nodes and their DOM elements
    idsToDelete.forEach(nid => {
        const el = document.getElementById(`node-${nid}`);
        if (el) el.remove();
    });

    nodes = nodes.filter(n => !idsToDelete.has(n.id));
    connections = connections.filter(c => !idsToDelete.has(c.fromId) && !idsToDelete.has(c.toId));

    renderMindmap();
    saveAppState();
}

// Close context menu on click elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        hideContextMenu();
    }
});


function handleMenuNewNode() {
    if (contextMenuTarget && contextMenuTarget.type === 'background') {
        // Convert screen coordinates to diagram coordinates
        // use contextMenuTarget.x/y (screen) and account for viewState
        const x = (contextMenuTarget.x - viewState.x) / viewState.zoom;
        const y = (contextMenuTarget.y - viewState.y) / viewState.zoom;

        createNode(x, y);
    }
    hideContextMenu();
}

// Resets mindmap state without any confirmation dialog.
// Use this for programmatic clearing (e.g. cloud sync, imports).
function resetMindmapState() {
    nodes = [];
    connections = [];
    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';
    nextNodeId = 1;
    saveAppState();
}

// User-initiated clear: shows confirmation first.
function clearMindmap() {
    if (confirm('Wirklich alles löschen?')) {
        resetMindmapState();
    }
}

// Export / Import
function serializeMindmapToXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<mindmap>\n';

    xml += '  <nodes>\n';
    nodes.forEach(n => {
        xml += `    <node id="${n.id}" x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" color="${n.color || ''}" parentId="${n.parentId !== null && n.parentId !== undefined ? n.parentId : ''}">${n.text}</node>\n`;
    });
    xml += '  </nodes>\n';

    xml += '  <connections>\n';
    connections.forEach(c => {
        xml += `    <connection from="${c.fromId}" to="${c.toId}" text="${c.text || ''}" color="${c.color || ''}"/>\n`;
    });
    xml += '  </connections>\n';

    xml += '</mindmap>';
    return xml;
}

function exportXML() {
    const xml = serializeMindmapToXML();
    downloadFile('mindmap.xml', xml);
}

function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/xml;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function importXML(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        parseXML(text);
    };
    reader.readAsText(file);
    input.value = ''; // Reset input
}

function parseXML(text) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        // Clear current
        nodes = [];
        connections = [];
        nodesLayer.innerHTML = '';
        svgLayer.innerHTML = '';

        // Nodes
        const nodeEls = xmlDoc.getElementsByTagName("node");
        let maxId = 0;
        for (let i = 0; i < nodeEls.length; i++) {
            const el = nodeEls[i];
            const id = parseInt(el.getAttribute("id"));
            const x = parseFloat(el.getAttribute("x"));
            const y = parseFloat(el.getAttribute("y"));
            const color = el.getAttribute("color") || null;
            const content = el.textContent;

            const parentIdAttr = el.getAttribute("parentId");
            const parentId = parentIdAttr && parentIdAttr !== '' ? parseInt(parentIdAttr) : null;

            nodes.push({ id, x, y, text: content, width: 120, height: 60, color, parentId, collapsed: false });
            if (id > maxId) maxId = id;
        }
        nextNodeId = maxId + 1;

        // Connections
        const connEls = xmlDoc.getElementsByTagName("connection");
        for (let i = 0; i < connEls.length; i++) {
            const el = connEls[i];
            const from = parseInt(el.getAttribute("from"));
            const to = parseInt(el.getAttribute("to"));
            const text = el.getAttribute("text") || '';
            const color = el.getAttribute("color") || null;
            connections.push({ fromId: from, toId: to, text, color });
        }

        // Re-render
        nodes.forEach(n => renderNode(n));
        renderConnections();
        saveAppState();

    } catch (err) {
        alert('Fehler beim Importieren der XML Datei: ' + err.message);
    }
}

async function exportPDF() {
    // 1. Check for libraries
    if (!window.jspdf || !window.html2canvas) {
        alert('PDF Bibliotheken werden noch geladen. Bitte versuche es in einem Moment erneut.');
        return;
    }

    // 2. Calculate Bounding Box
    if (nodes.length === 0) {
        alert('Die Mindmap ist leer.');
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
        // Node bounds
        // n.x, n.y is top-left
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + n.width > maxX) maxX = n.x + n.width;
        if (n.y + n.height > maxY) maxY = n.y + n.height;
    });

    // Add padding (approx 50px)
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // 3. Create Temporary Container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '0'; // '0' to ensure it renders? -9999px sometimes causes issues
    tempContainer.style.left = '-9999px';
    // Use fixed width/height to match content to ensure html2canvas captures it all
    tempContainer.style.width = `${width}px`;
    tempContainer.style.height = `${height}px`;
    tempContainer.style.backgroundColor = '#ffffff'; // White background for PDF
    // Ensure styles match the app
    tempContainer.className = 'mindmap-export-container'; // We might need to copy font styles

    // Copy text font styles effectively
    tempContainer.style.fontFamily = getComputedStyle(document.body).fontFamily;

    // 4. Re-create Nodes and Connections in Temp Container
    // This avoids messing with the live DOM and deals with viewport transforms easily (we just position relative to 0,0)

    // A. SVG Layer for lines
    const svgNS = "http://www.w3.org/2000/svg";
    const tempSvg = document.createElementNS(svgNS, 'svg');
    tempSvg.setAttribute('width', width);
    tempSvg.setAttribute('height', height);
    tempSvg.style.position = 'absolute';
    tempSvg.style.top = '0';
    tempSvg.style.left = '0';
    tempSvg.style.width = '100%';
    tempSvg.style.height = '100%';

    connections.forEach(conn => {
        const n1 = nodes.find(n => n.id === conn.fromId);
        const n2 = nodes.find(n => n.id === conn.toId);
        if (!n1 || !n2) return;

        const x1 = (n1.x + n1.width / 2) - minX;
        const y1 = (n1.y + n1.height / 2) - minY;
        const x2 = (n2.x + n2.width / 2) - minX;
        const y2 = (n2.y + n2.height / 2) - minY;

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', conn.color || '#64748b'); // Use default color hash if needed
        line.setAttribute('stroke-width', '2');
        tempSvg.appendChild(line);

        // Labels
        if (conn.text) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const label = document.createElement('div');
            label.innerText = conn.text;
            label.style.position = 'absolute';
            label.style.left = `${midX}px`;
            label.style.top = `${midY}px`;
            label.style.transform = 'translate(-50%, -50%)';
            label.style.background = '#fff';
            label.style.padding = '2px 4px';
            label.style.fontSize = '0.8rem';
            label.style.color = '#64748b';
            label.style.zIndex = 10;
            tempContainer.appendChild(label);
        }
    });

    tempContainer.appendChild(tempSvg);

    // B. Nodes
    nodes.forEach(node => {
        const el = document.createElement('div');
        // Replicate style of .mindmap-node
        el.style.position = 'absolute';
        el.style.left = `${node.x - minX}px`;
        el.style.top = `${node.y - minY}px`;
        el.style.width = `${node.width}px`;
        el.style.height = `${node.height}px`;
        el.style.border = `2px solid ${node.color || '#e2e8f0'}`; // default border color
        el.style.borderRadius = '8px';
        el.style.background = '#fff';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.padding = '10px';
        el.style.boxSizing = 'border-box';
        el.style.textAlign = 'center';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        el.innerText = node.text;

        // Font style
        el.style.fontSize = '0.9rem';
        el.style.color = '#1e293b';

        tempContainer.appendChild(el);
    });

    document.body.appendChild(tempContainer);

    // 5. Generate PDF
    try {
        const canvas = await html2canvas(tempContainer, {
            backgroundColor: '#ffffff',
            scale: 2 // Higher scale for better resolution
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        // A4 Landscape: 297mm x 210mm
        const pdf = new jsPDF('l', 'mm', 'a4');

        const pdfWidth = 297;
        const pdfHeight = 210;

        // Image Dimensions
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;

        // Calculate scaling to fit
        // Maintain aspect ratio
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;

        // Center image
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        pdf.save('mindmap.pdf');

    } catch (err) {
        console.error(err);
        alert('Fehler beim Exportieren: ' + err.message);
        if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
        }
    }
}

// Start
// --- Kanban Logic ---

let kanbanState = {
    columns: [
        { id: 'col1', title: 'Aufgaben', cardIds: [] },
        { id: 'col2', title: 'In Bearbeitung', cardIds: [] },
        { id: 'col3', title: 'Erledigt', cardIds: [] }
    ],
    cards: {},
    nextCardId: 1
};

let kanbanInitialized = false;

function initKanban() {
    if (kanbanInitialized) return;
    kanbanInitialized = true;
    renderKanban();

    // Hide formatting menu on click elsewhere
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#text-format-menu')) {
            document.getElementById('text-format-menu').style.display = 'none';
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function renderKanban() {
    const container = document.getElementById('kanban-board-container');
    container.innerHTML = '';

    kanbanState.columns.forEach(col => {
        const colDiv = document.createElement('div');
        colDiv.className = 'kanban-column';
        colDiv.id = col.id;

        colDiv.innerHTML = `
            <div class="column-header">
                <span class="column-title" contenteditable="true" onblur="updateColumnTitle('${col.id}', this)">${col.title}</span>
                <span class="column-count">${col.cardIds.length}</span>
            </div>
            <div class="column-content" id="${col.id}-content">
            </div>
        `;

        const contentDiv = colDiv.querySelector('.column-content');

        col.cardIds.forEach(cardId => {
            const card = kanbanState.cards[cardId];
            if (card) {
                contentDiv.appendChild(createCardElement(card));
            }
        });

        container.appendChild(colDiv);
    });
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'kanban-card';
    el.id = `card-${card.id}`;
    if (card.color) el.style.borderColor = card.color;
    if (card.width) el.style.width = card.width + 'px';
    if (card.height) el.style.minHeight = card.height + 'px';

    el.innerHTML = `
        <div class="kn-card-content" contenteditable="true" onblur="updateCardText(${card.id}, this)">${card.text}</div>
        <div class="card-controls">
            <button class="card-menu-btn" onclick="showKanbanContextMenu(event, ${card.id})" style="display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
        </div>
        <div class="kanban-resize-handle"></div>
    `;

    // --- Context Menu & Long Press (Fixed & Unified) ---
    const handleContextLogic = (clientX, clientY, target, originalEvent) => {
        const selection = window.getSelection();
        const targetElement = target.nodeType === 3 ? target.parentElement : target;
        const isInsideText = targetElement.closest('.kn-card-content');

        if (isInsideText) {
            if (selection.toString().trim().length > 0) {
                if (cancelCurrentKanbanDrag) cancelCurrentKanbanDrag();
                showTextFormatMenu(clientX, clientY);
            }
        } else if (targetElement.closest('.card-menu-btn')) {
            // Card menu only triggers on the 3-dots button if right-clicked or long-pressed
            if (cancelCurrentKanbanDrag) cancelCurrentKanbanDrag();
            showKanbanContextMenu(originalEvent, card.id);
        }
    };

    // 1. Right Click (Mouse)
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleContextLogic(e.clientX, e.clientY, e.target, e);
    });

    // 2. Long Press (Touch)
    let contextTimer;
    let touchStartX, touchStartY;

    el.addEventListener('touchstart', (e) => {
        if (e.target.closest('.card-controls') || e.target.classList.contains('kanban-resize-handle')) return;
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        contextTimer = setTimeout(() => {
            handleContextLogic(touch.clientX, touch.clientY, touch.target, { touches: [touch] });
        }, 500);
    }, { passive: false });

    el.addEventListener('touchend', () => clearTimeout(contextTimer));
    el.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - touchStartX) > 10 || Math.abs(touch.clientY - touchStartY) > 10) {
            clearTimeout(contextTimer);
        }
    });

    // Resize Logic

    // Resize Logic
    const handle = el.querySelector('.kanban-resize-handle');
    makeKanbanResizable(handle, card.id);

    // Custom Drag Logic
    makeKanbanDraggable(el, card.id);

    return el;
}

// Global flags for coordination
let isDraggingGlobal = false;
let cancelCurrentKanbanDrag = null;


function addKanbanCard() {
    const id = kanbanState.nextCardId++;
    const newCard = {
        id: id,
        text: 'Neue Aufgabe',
        color: null,
        columnId: 'col1' // Default first column
    };
    kanbanState.cards[id] = newCard;
    // ensure col1 exists or use first
    if (kanbanState.columns.length > 0) {
        kanbanState.columns[0].cardIds.unshift(id);
        renderKanban();
        saveAppState();
    }
}

function updateColumnTitle(colId, el) {
    const col = kanbanState.columns.find(c => c.id === colId);
    if (col) {
        col.title = el.innerText;
        saveAppState();
    }
}

function updateCardText(cardId, el) {
    const card = kanbanState.cards[cardId];
    if (card) {
        card.text = el.innerHTML;
        saveAppState();
    }
}

// --- Text Formatting ---
let savedSelectionRange = null;

function showTextFormatMenu(x, y) {
    const menu = document.getElementById('text-format-menu');
    if (!menu) return;
    const maxX = window.innerWidth - menu.offsetWidth;
    const maxY = window.innerHeight - menu.offsetHeight;

    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;
    menu.style.display = 'flex';
}

function formatText(command, value = null) {
    // Restore selection first if needed
    if (savedSelectionRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange);

        // Ensure focus is on the editable element
        let node = savedSelectionRange.commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode; // Text node -> Element
        if (node.closest('.kn-card-content')) {
            node.closest('.kn-card-content').focus();
        }
    }

    document.execCommand(command, false, value);

    // Update range if changed? Usually execCommand preserves or updates selection.
}

// Helper for Color Dialog Callback logic
// Removed text color logic per user request


// Overriding confirmColor and handleMenuDelete/Color to support hooks
// Overriding confirmColor and handleMenuDelete/Color to support hooks
const _originalConfirmColor = confirmColor;
confirmColor = function () {
    // Check if we are in Kanban context by checking target type
    if (contextMenuTarget && contextMenuTarget.type === 'kanban-card') {
        const color = document.getElementById('dialog-color-input').value;
        const card = kanbanState.cards[contextMenuTarget.id];
        if (card) {
            card.color = color;
            // update style immediately
            const el = document.getElementById(`card-${card.id}`);
            if (el) el.style.borderColor = color;
            saveAppState();
        }
        document.getElementById('color-dialog').style.display = 'none';
    } else {
        _originalConfirmColor();
    }
};

const _originalCancelColor = cancelColor;
cancelColor = function () {
    _originalCancelColor();
    // No callback to clear
};

/* ... makeKanbanDraggable below ... */

// --- Kanban Drag & Drop ---
function makeKanbanDraggable(el, id) {
    let isDragging = false;
    let startX, startY;
    let originalRect;
    let placeholder;
    let originalColumnId;
    let dragTimer; // Timer for Hold-to-Drag

    const dragStart = (clientX, clientY) => {
        isDragging = true;
        isDraggingGlobal = true;
        cancelCurrentKanbanDrag = dragEnd; // Register cancel hook

        // Haptic feedback if available (optional)
        if (navigator.vibrate) navigator.vibrate(50);

        initialRect = el.getBoundingClientRect();
        shiftX = clientX - initialRect.left;
        shiftY = clientY - initialRect.top;

        const card = kanbanState.cards[id];
        originalColumnId = card.columnId;

        // Create Placeholder
        placeholder = document.createElement('div');
        placeholder.className = 'kanban-card-placeholder';
        placeholder.style.height = `${initialRect.height}px`;

        // Insert placeholder before moving element
        el.parentNode.insertBefore(placeholder, el);

        // Styling for drag
        el.classList.add('dragging');
        el.style.width = `${initialRect.width}px`;
        el.style.height = `${initialRect.height}px`;
        el.style.left = `${clientX - shiftX}px`;
        el.style.top = `${clientY - shiftY}px`;
        document.body.appendChild(el);
    };

    /* ... getDragAfterElement and dragMove logic remains same, except touchmove handling ... */

    // Helper: Find closest card
    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const dragMove = (clientX, clientY) => {
        if (!isDragging) return;

        el.style.left = `${clientX - shiftX}px`;
        el.style.top = `${clientY - shiftY}px`;
        el.style.pointerEvents = 'none';
        const elementBelow = document.elementFromPoint(clientX, clientY);
        if (!elementBelow) return;
        const colContent = elementBelow.closest('.column-content');
        if (colContent) {
            const afterElement = getDragAfterElement(colContent, clientY);
            if (afterElement == null) {
                colContent.appendChild(placeholder);
            } else {
                colContent.insertBefore(placeholder, afterElement);
            }
        }
    };

    const dragEnd = () => {
        clearTimeout(dragTimer); // Clear timer if ending
        if (!isDragging) return;

        isDragging = false;
        cancelCurrentKanbanDrag = null; // Unregister hook
        setTimeout(() => { isDraggingGlobal = false; }, 50);

        // Restore pointer events
        el.style.pointerEvents = '';

        const newColContent = placeholder.parentNode;
        const newColId = newColContent.closest('.kanban-column').id;

        el.classList.remove('dragging');
        el.style.position = '';
        el.style.width = kanbanState.cards[id].width ? `${kanbanState.cards[id].width}px` : '';
        if (kanbanState.cards[id].height) {
            el.style.minHeight = `${kanbanState.cards[id].height}px`;
            el.style.height = 'auto';
        } else {
            el.style.height = '';
            el.style.minHeight = '';
        }
        el.style.left = '';
        el.style.top = '';
        el.style.zIndex = '';

        newColContent.insertBefore(el, placeholder);
        placeholder.remove();

        // Update State
        const card = kanbanState.cards[id];
        const oldCol = kanbanState.columns.find(c => c.id === originalColumnId);
        oldCol.cardIds = oldCol.cardIds.filter(cid => cid !== id);
        const newCol = kanbanState.columns.find(c => c.id === newColId);
        const index = Array.from(newColContent.children).indexOf(el);
        newCol.cardIds.splice(index, 0, id);
        card.columnId = newColId;

        renderKanban();
        saveAppState();
    };

    el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('.kn-card-content') || e.target.closest('.card-controls') || e.target.classList.contains('kanban-resize-handle')) return;
        dragStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => { if (isDragging) dragMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', dragEnd);

    // --- Hold-to-Drag Logic (Touch) ---
    el.addEventListener('touchstart', (e) => {
        // Prevent drag on controls
        if (e.target.closest('.card-controls') || e.target.classList.contains('kanban-resize-handle')) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;

            // Start Timer: If held for 200ms without moving, start drag
            dragTimer = setTimeout(() => {
                dragStart(touch.clientX, touch.clientY);
            }, 200);
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];

        if (isDragging) {
            // If already dragging (timer fired), move card and BLOCK scroll
            dragMove(touch.clientX, touch.clientY);
            e.preventDefault();
        } else {
            // If NOT yet dragging (timer pending), checks for movement
            if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
                // User moved finger BEFORE 200ms -> It's a scroll!
                clearTimeout(dragTimer);
                // Do not preventDefault, let browser scroll
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', dragEnd);
}

function makeKanbanResizable(handle, cardId) {
    let isResizing = false;
    let startY, startH;

    const start = (cx, cy) => {
        const el = document.getElementById(`card-${cardId}`);
        if (!el) return;

        isResizing = true;
        startY = cy;
        startH = el.offsetHeight;
    };

    const move = (cx, cy) => {
        if (!isResizing) return;
        const dy = cy - startY;

        const el = document.getElementById(`card-${cardId}`);
        const newH = Math.max(60, startH + dy);

        el.style.minHeight = `${newH}px`;
        el.style.height = 'auto'; // ensure height not fixed
    };

    const end = () => {
        if (isResizing) {
            isResizing = false;
            const el = document.getElementById(`card-${cardId}`);
            const card = kanbanState.cards[cardId];
            card.height = el.offsetHeight;
            saveAppState();
        }
    };

    handle.addEventListener('mousedown', (e) => { e.stopPropagation(); start(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);

    handle.addEventListener('touchstart', (e) => { e.stopPropagation(); start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    window.addEventListener('touchmove', (e) => { if (isResizing) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: false });
    window.addEventListener('touchend', end);
}

// --- Kanban Context Menu (Card Options) ---

function showKanbanContextMenu(e, cardId) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    // If context menu triggered on text selection or content editable, 
    // we generally might want to allow default if it's right click? 
    // But user said "Text formatting context menu... works". 
    // And "Context menu for card... only on free space... should be anywhere".
    // So if I right click on text, should it show "Card Menu" or "Browser Menu" or "Text Format Menu"?
    // Usually Text Format is for *selection*. Right click is for operations.
    // So right-click anywhere on card -> Card Menu (Color, Delete).
    // Selection -> Text Format Menu (Bold, Italic, Color).
    // This seems to meet requirements.

    contextMenuTarget = { type: 'kanban-card', id: cardId };

    const menuNewNode = document.getElementById('menu-new-node');
    const menuCenter = document.getElementById('menu-center');
    const menuMove = document.getElementById('menu-move');
    const menuRename = document.getElementById('menu-rename');
    const menuColor = document.getElementById('menu-color');
    const menuDelete = document.getElementById('menu-delete');

    if (menuNewNode) menuNewNode.style.display = 'none';
    if (menuCenter) menuCenter.style.display = 'none'; // Ensure Center is hidden
    if (menuMove) menuMove.style.display = 'block'; // Show Move
    if (menuRename) menuRename.style.display = 'none';
    if (menuColor) menuColor.style.display = 'block';
    if (menuDelete) menuDelete.style.display = 'block';

    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;

    showMenuAt(clientX, clientY);
}

// Override Handle Delete
const _originalHandleDelete = handleMenuDelete;
handleMenuDelete = function () {
    if (contextMenuTarget && contextMenuTarget.type === 'kanban-card') {
        if (confirm('Karte löschen?')) { // Add confirmation for safety
            deleteKanbanCard(contextMenuTarget.id);
        }
        hideContextMenu();
    } else {
        _originalHandleDelete();
    }
};

// Override Handle Color
const _originalHandleColor = handleMenuColor;
handleMenuColor = function () {
    if (contextMenuTarget && contextMenuTarget.type === 'kanban-card') {
        // Pre-fill
        const card = kanbanState.cards[contextMenuTarget.id];
        document.getElementById('dialog-color-input').value = card.color || '#0086cb';

        document.getElementById('color-dialog').style.display = 'flex';
        hideContextMenu();
    } else {
        _originalHandleColor();
    }
};

function deleteKanbanCard(id) {
    const card = kanbanState.cards[id];
    if (card) {
        const col = kanbanState.columns.find(c => c.id === card.columnId);
        col.cardIds = col.cardIds.filter(cid => cid !== id);
        delete kanbanState.cards[id];
        renderKanban();
        saveAppState();
    }
}

function clearKanbanBoard() {
    if (confirm('Wirklich alles löschen?')) {
        kanbanState.columns.forEach(c => c.cardIds = []);
        kanbanState.cards = {};
        renderKanban();
        saveAppState();
    }
}

function generateKanbanXML() {
    let xml = '<kanban>\n';

    xml += '  <columns>\n';
    kanbanState.columns.forEach(col => {
        xml += `    <column id="${col.id}" title="${escapeXML(col.title)}">\n`;
        col.cardIds.forEach(cid => {
            xml += `      <card-ref id="${cid}" />\n`;
        });
        xml += `    </column>\n`;
    });
    xml += '  </columns>\n';

    xml += '  <cards>\n';
    Object.values(kanbanState.cards).forEach(card => {
        xml += `    <card id="${card.id}" color="${card.color || ''}" width="${card.width || ''}" height="${card.height || ''}">\n`;
        xml += `      <text><![CDATA[${card.text}]]></text>\n`;
        xml += `    </card>\n`;
    });
    xml += '  </cards>\n';

    xml += '</kanban>';
    return xml;
}

function exportKanbanXML() {
    const xml = generateKanbanXML();
    downloadFile('kanban_board.xml', xml);
}

function parseKanbanXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    kanbanState.cards = {};
    kanbanState.nextCardId = 1;

    const cardNodes = xmlDoc.getElementsByTagName('card');
    Array.from(cardNodes).forEach(node => {
        const id = parseInt(node.getAttribute('id'));
        kanbanState.nextCardId = Math.max(kanbanState.nextCardId, id + 1);

        const textNode = node.getElementsByTagName('text')[0];
        const text = textNode.textContent;

        kanbanState.cards[id] = {
            id: id,
            text: text,
            color: node.getAttribute('color') || null,
            width: parseFloat(node.getAttribute('width')) || null,
            height: parseFloat(node.getAttribute('height')) || null,
            columnId: null
        };
    });

    kanbanState.columns = [];
    const columnNodes = xmlDoc.getElementsByTagName('column');
    Array.from(columnNodes).forEach(node => {
        const colId = node.getAttribute('id');
        const colTitle = node.getAttribute('title');

        const refNodes = node.getElementsByTagName('card-ref');
        const cardIds = Array.from(refNodes).map(ref => {
            const cid = parseInt(ref.getAttribute('id'));
            if (kanbanState.cards[cid]) kanbanState.cards[cid].columnId = colId;
            return cid;
        });

        kanbanState.columns.push({
            id: colId,
            title: colTitle,
            cardIds: cardIds
        });
    });

    if (kanbanState.columns.length === 0) {
        kanbanState.columns = [
            { id: 'col1', title: 'Aufgaben', cardIds: [] },
            { id: 'col2', title: 'In Bearbeitung', cardIds: [] },
            { id: 'col3', title: 'Erledigt', cardIds: [] }
        ];
    }
}

function importKanbanXML(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        parseKanbanXML(e.target.result);
        renderKanban();
        saveAppState();
        input.value = '';
    };
    reader.readAsText(file);
}

function escapeXML(str) {
    return str.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// (init() moved to end of file to avoid Temporal Dead Zone errors)

// --- Help Modal Logic ---
function openHelpModal(type) {
    const modal = document.getElementById(type + '-help-modal');
    if (modal) modal.style.display = 'flex';
}

function closeHelpModal(type) {
    const modal = document.getElementById(type + '-help-modal');
    if (modal) modal.style.display = 'none';
}

// Global click outside to close modals
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});

function handleMenuNewNode() {
    hideContextMenu();

    // Default to center if no target (fallback)
    if (!contextMenuTarget || contextMenuTarget.x === undefined) {
        createNewNodeCenter();
        return;
    }

    const clientX = contextMenuTarget.x;
    const clientY = contextMenuTarget.y;

    const rect = container.getBoundingClientRect();

    // Calculate Viewport Coordinates
    // vpX = (screenX - rect.left - viewState.x) / viewState.zoom
    const vpX = (clientX - rect.left - viewState.x) / viewState.zoom;
    const vpY = (clientY - rect.top - viewState.y) / viewState.zoom;

    createNode(vpX, vpY);
}

function handleMenuCenter() {
    hideContextMenu();
    fitToScreen();
}

function handleMenuClearAll() {
    hideContextMenu();
    clearMindmap();
}

function fitToScreen() {
    if (nodes.length === 0) {
        centerViewport();
        return;
    }

    // Calculate Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.x + node.width > maxX) maxX = node.x + node.width;
        if (node.y + node.height > maxY) maxY = node.y + node.height;
    });

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;

    // Viewport Dimensions
    const containerRect = container.getBoundingClientRect();
    const vpW = containerRect.width;
    const vpH = containerRect.height;

    // Calculate Scale
    const scaleX = vpW / width;
    const scaleY = vpH / height;
    let newScale = Math.min(scaleX, scaleY);

    // Clamp Scale
    newScale = Math.min(Math.max(newScale, 0.2), 2); // Cap max fit scale at 2 (don't zoom in SUPER close for 1 node)

    // Calculate Pan (so that center of bounding box is at center of viewport)
    // Viewport center in screen pixels: vpW/2, vpH/2
    // BBox center in viewport pixels: centerX, centerY
    // Formula: viewState.x + centerX * newScale = vpW/2
    // viewState.x = vpW/2 - centerX * newScale

    viewState.zoom = newScale;
    viewState.x = vpW / 2 - centerX * newScale;
    viewState.y = vpH / 2 - centerY * newScale;

    updateViewport();
}

// --- Card Sorting & Moving ---

function shouldShowUpArrow(cardId) {
    const card = kanbanState.cards[cardId];
    if (!card) return false;
    const col = kanbanState.columns.find(c => c.id === card.columnId);
    if (!col) return false;
    // Check if it's the first card
    return col.cardIds.indexOf(cardId) > 0;
}

function shouldShowDownArrow(cardId) {
    const card = kanbanState.cards[cardId];
    if (!card) return false;
    const col = kanbanState.columns.find(c => c.id === card.columnId);
    if (!col) return false;
    // Check if it's the last card
    return col.cardIds.indexOf(cardId) < col.cardIds.length - 1;
}

function moveCard(cardId, direction) {
    const card = kanbanState.cards[cardId];
    if (!card) return;
    const col = kanbanState.columns.find(c => c.id === card.columnId);
    if (!col) return;

    const index = col.cardIds.indexOf(cardId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        // Swap with previous
        const temp = col.cardIds[index];
        col.cardIds[index] = col.cardIds[index - 1];
        col.cardIds[index - 1] = temp;
    } else if (direction === 'down' && index < col.cardIds.length - 1) {
        // Swap with next
        const temp = col.cardIds[index];
        col.cardIds[index] = col.cardIds[index + 1];
        col.cardIds[index + 1] = temp;
    }

    renderKanban();
    saveAppState();
}

// Global variable for move dialog target
let textMenuTargetId = null;

function handleMenuMove() {
    if (contextMenuTarget && contextMenuTarget.type === 'kanban-card') {
        textMenuTargetId = contextMenuTarget.id;
        hideContextMenu();
        showMoveDialog(textMenuTargetId);
    }
}

function showMoveDialog(cardId) {
    const card = kanbanState.cards[cardId];
    if (!card) return;

    // Generate Options (all columns except current)
    const optionsContainer = document.getElementById('move-options');
    optionsContainer.innerHTML = '';

    kanbanState.columns.forEach(col => {
        if (col.id !== card.columnId) {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.style.textAlign = 'left';
            btn.innerText = col.title;
            btn.onclick = () => {
                moveCardToColumn(cardId, col.id);
                closeMoveDialog();
            };
            optionsContainer.appendChild(btn);
        }
    });

    document.getElementById('move-dialog').style.display = 'flex';
}

function closeMoveDialog() {
    document.getElementById('move-dialog').style.display = 'none';
}

function moveCardToColumn(cardId, targetColId) {
    const card = kanbanState.cards[cardId];
    if (!card) return;

    const oldCol = kanbanState.columns.find(c => c.id === card.columnId);
    const newCol = kanbanState.columns.find(c => c.id === targetColId);

    if (oldCol && newCol) {
        // Remove from old
        oldCol.cardIds = oldCol.cardIds.filter(id => id !== cardId);
        // Add to new (at the end?)
        newCol.cardIds.push(cardId);
        // Update card
        card.columnId = targetColId;

        renderKanban();
        saveAppState();
    }
}

// --- Flashcard Logic (Leitner System) ---

let flashcards = []; // Array of { id, term, definition, box: 1-5, status: 'unseen'|'learned' }
let fcState = {
    mode: 'study', // 'study' or 'edit'
    currentBox: 1, // 1-5
    queue: [], // Array of IDs in current box to study
    currentIndex: 0,
    isFlipped: false
};

const fcStudyContainer = document.getElementById('fc-study-container');
const fcEditContainer = document.getElementById('fc-edit-container');
const fcActiveBoxLabel = document.getElementById('fc-active-box-label');
const fcProgressBar = document.getElementById('fc-progress-bar');
const fcProgressText = document.getElementById('fc-progress-text');
const flashcardEl = document.getElementById('flashcard');
const fcTermEl = document.getElementById('fc-term');
const fcDefEl = document.getElementById('fc-definition');
const fcListEl = document.getElementById('fc-list');
const fcLeitnerRow = document.getElementById('fc-leitner-row');

function initFlashcards() {
    // No LocalStorage loading as per user request (Session only)

    // Default example cards
    // Check if flashcards are already loaded (e.g. via import in same session?) 
    // Actually, if we just reload the page, flashcards = [] initially.
    // Let's provide defaults if empty.
    if (flashcards.length === 0) {
        flashcards = [
            { id: 1, term: 'CPU', definition: 'Central Processing Unit - Das Gehirn des Computers.', box: 1 },
            { id: 2, term: 'RAM', definition: 'Random Access Memory - Flüchtiger Arbeitsspeicher.', box: 1 },
            { id: 3, term: 'SSD', definition: 'Solid State Drive - Schneller Massenspeicher ohne bewegliche Teile.', box: 1 }
        ];
    }

    // Initial Render
    toggleFlashcardMode('study'); // Default to study
    renderFlashcardList();
}

function toggleFlashcardMode(mode) {
    fcState.mode = mode;

    // Toggle Buttons
    document.getElementById('fc-btn-study').classList.toggle('active', mode === 'study');
    document.getElementById('fc-btn-edit').classList.toggle('active', mode === 'edit');

    // Toggle Containers
    if (mode === 'study') {
        fcStudyContainer.style.display = 'block';
        fcEditContainer.style.display = 'none';
        initLeitnerSession(1); // Default to Box 1
    } else {
        fcStudyContainer.style.display = 'none';
        fcEditContainer.style.display = 'flex';
        fcEditContainer.style.flexDirection = 'column';
        renderFlashcardList();
    }
}

// --- Study Mode (Leitner) ---

function initLeitnerSession(boxNum) {
    fcState.currentBox = boxNum;
    fcActiveBoxLabel.textContent = `Fach ${boxNum}`;

    // Filter cards for this box
    fcState.queue = flashcards.filter(c => c.box === boxNum).map(c => c.id);

    // Shuffle queue for randomness? (Optional)
    // fcState.queue.sort(() => Math.random() - 0.5);

    fcState.currentIndex = 0;
    fcState.isFlipped = false;

    renderLeitnerRow();
    showCard(fcState.currentIndex);
}

function renderLeitnerRow() {
    fcLeitnerRow.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const count = flashcards.filter(c => c.box === i).length;
        const isActive = i === fcState.currentBox;

        const boxEl = document.createElement('div');
        boxEl.className = `leitner-box ${isActive ? 'active' : 'inactive'} ${count > 0 ? 'has-cards' : ''}`;
        boxEl.onclick = () => initLeitnerSession(i);

        boxEl.innerHTML = `
            <div class="box-count">${count}</div>
            <div class="box-visual"></div>
            <div class="box-label">Fach ${i}</div>
        `;

        fcLeitnerRow.appendChild(boxEl);
    }
}

function showCard(index) {
    // If empty queue
    if (fcState.queue.length === 0) {
        renderEndScreen("Dieses Fach ist leer.");
        // Hide card?
        flashcardEl.style.visibility = 'hidden';
        return;
    } else {
        flashcardEl.style.visibility = 'visible';
    }

    // If finished queue
    if (index >= fcState.queue.length) {
        renderEndScreen("Fach durchgearbeitet!");
        flashcardEl.style.visibility = 'hidden'; // Or show summary
        return;
    }

    const cardId = fcState.queue[index];
    const card = flashcards.find(c => c.id === cardId);

    if (!card) return;

    // Reset Flip
    flashcardEl.classList.remove('flipped');
    fcState.isFlipped = false;

    // Set Content
    fcTermEl.textContent = card.term;
    fcDefEl.textContent = card.definition;

    // Update Progress
    updateProgress();
}

function flipCard() {
    fcState.isFlipped = !fcState.isFlipped;
    if (fcState.isFlipped) {
        flashcardEl.classList.add('flipped');
    } else {
        flashcardEl.classList.remove('flipped');
    }
}

function rateCard(known) {
    // If no card visible (end screen), restart or do nothing
    if (fcState.queue.length === 0 || fcState.currentIndex >= fcState.queue.length) {
        return;
    }

    const cardId = fcState.queue[fcState.currentIndex];
    const card = flashcards.find(c => c.id === cardId);

    if (card) {
        if (known) {
            // Correct: Move to next box unless max
            if (card.box < 5) {
                card.box++;
            }
            // If already 5, it stays 5
        } else {
            // Incorrect: Back to box 1
            card.box = 1;
        }
        saveFlashcards();
    }

    // Auto-remove processed card from current view?
    // User Requirement: "Die Karten automatisch in das nächste Fach geräumt werden"
    // Since we are viewing a specific Box, if the card moves OUT of this box, it should disappear from the current queue?
    // Current Logic: We iterate through queue. If we modify 'box' property, it effectively leaves the logical box.
    // However, for user experience, it's better to finish the queue.
    // BUT, if we want to visualize it moving, we should update the counts.

    renderLeitnerRow(); // Update counts immediately

    // Next Card
    fcState.currentIndex++;
    showCard(fcState.currentIndex);
}

function updateProgress() {
    const total = fcState.queue.length;
    const current = fcState.currentIndex + 1;
    fcProgressText.textContent = `Karte ${Math.min(current, total)} von ${total}`;

    const percent = total > 0 ? (fcState.currentIndex / total) * 100 : 0;
    fcProgressBar.style.width = `${percent}%`;
}

function renderEndScreen(msg) {
    fcTermEl.textContent = "Fertig!";
    fcDefEl.innerHTML = `
        <p>${msg}</p>
        <button class="btn-primary" onclick="initLeitnerSession(${fcState.currentBox})" style="margin-top:1rem;">Fach neu laden</button>
    `;
    fcProgressText.textContent = "";
    fcProgressBar.style.width = "100%";

    flashcardEl.style.visibility = 'visible'; // Show the "card" container for the message
    flashcardEl.classList.remove('flipped');
}

// --- Edit Mode ---

function renderFlashcardList() {
    fcListEl.innerHTML = '';

    flashcards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'fc-list-item';
        item.innerHTML = `
            <div class="fc-content">
                <div class="fc-term">${escapeHtml(card.term)}</div>
                <div class="fc-def">${escapeHtml(card.definition)}</div>
            </div>
            <div class="fc-actions">
                <button class="btn-secondary" onclick="deleteFlashcard(${card.id})" title="Löschen" style="padding: 4px;">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button class="btn-secondary" onclick="editFlashcardPrompt(${card.id})" title="Bearbeiten" style="padding: 4px;">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
            </div>
        `;
        fcListEl.appendChild(item);
    });
}

function addFlashcard() {
    const termInput = document.getElementById('fc-input-term');
    const defInput = document.getElementById('fc-input-def');

    const term = termInput.value.trim();
    const def = defInput.value.trim();

    if (!term || !def) {
        alert("Bitte Begriff und Definition eingeben.");
        return;
    }

    const newId = Date.now(); // Simple ID
    flashcards.push({
        id: newId,
        term: term,
        definition: def,
        status: 'unseen',
        box: 1
    });

    saveFlashcards();
    renderFlashcardList();

    termInput.value = '';
    defInput.value = '';
    termInput.focus();
}

function deleteFlashcard(id) {
    if (confirm("Karte wirklich löschen?")) {
        flashcards = flashcards.filter(c => c.id !== id);
        saveFlashcards();
        renderFlashcardList();
    }
}

function editFlashcardPrompt(id) {
    const card = flashcards.find(c => c.id === id);
    if (!card) return;

    const newTerm = prompt("Begriff bearbeiten:", card.term);
    if (newTerm === null) return;

    const newDef = prompt("Definition bearbeiten:", card.definition);
    if (newDef === null) return;

    if (newTerm && newDef) {
        card.term = newTerm;
        card.definition = newDef;
        saveFlashcards();
        renderFlashcardList();
    }
}

function saveFlashcards() {
    // Persistent saving if auto-save is active
    saveAppState();
    console.log("Flashcards state updated");
}

// --- Import / Export ---

function generateFlashcardsXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<flashcards>\n';
    flashcards.forEach(card => {
        xml += `  <card>\n`;
        xml += `    <term>${escapeXml(card.term)}</term>\n`;
        xml += `    <definition>${escapeXml(card.definition)}</definition>\n`;
        // Deck export should be neutral: Status unseen, Box 1
        xml += `    <status>unseen</status>\n`;
        xml += `    <box>1</box>\n`;
        xml += `  </card>\n`;
    });
    xml += '</flashcards>';
    return xml;
}

function exportFlashcardsXML() {
    const xml = generateFlashcardsXML();
    downloadFile('flashcards.xml', xml);
}

function parseFlashcardsXML(xmlString, append = false) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, "text/xml");
        const parserError = doc.getElementsByTagName("parsererror");
        if (parserError.length > 0) {
            throw new Error("Ungültiges XML Format.");
        }
        const cards = doc.getElementsByTagName('card');

        const newCards = [];
        for (let i = 0; i < cards.length; i++) {
            const term = cards[i].getElementsByTagName('term')[0]?.textContent || "";
            const def = cards[i].getElementsByTagName('definition')[0]?.textContent || "";
            const status = cards[i].getElementsByTagName('status')[0]?.textContent || "unseen";
            const box = parseInt(cards[i].getElementsByTagName('box')[0]?.textContent || "1");

            if (term && def) {
                newCards.push({
                    id: Date.now() + i,
                    term: term,
                    definition: def,
                    status: status,
                    box: box
                });
            }
        }

        if (newCards.length > 0) {
            if (!append) {
                flashcards = newCards;
            } else {
                flashcards = [...flashcards, ...newCards];
            }
            saveFlashcards();
            saveAppState();
            if (fcState.mode === 'edit') renderFlashcardList();
            else initLeitnerSession(1); // Restart session (Box 1)
        } else {
            console.warn('Keine gültigen Karten im XML gefunden.');
        }
    } catch (err) {
        console.error(err);
        alert('Fehler beim Importieren der XML: ' + err.message);
    }
}

function importFlashcardsXML(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const willAppend = !confirm(`Möchtest du den aktuellen Kartenstapel ersetzen? (Abbrechen = Hinzufügen)`);
        parseFlashcardsXML(text, willAppend);
        input.value = ''; // Reset
    };
    reader.readAsText(file);
}

        // Export Progress (Status only?) 
        // Actually XML export already includes status.
        // But user asked for "Export/Import Status: Speichere den aktuellen Lernfortschritt"
        // Let's create a specific function for that if needed, or just rely on the main XML.
        // "Speichere den aktuellen Lernfortschritt (welche Karten als 'gewusst' markiert sind) ebenfalls als XML oder JSON Datei."
        // I will implement a separate JSON export for progress to satisfy the requirement explicitly.

        function exportFlashcardsProgress() {
            const progress = flashcards.map(c => ({ id: c.id, term: c.term, status: c.status, box: c.box }));
            const json = JSON.stringify(progress, null, 2);
            downloadFile('flashcards_progress.json', json);
        }

        function importFlashcardsProgress(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const progress = JSON.parse(e.target.result);
                    let updatedCount = 0;

                    progress.forEach(p => {
                        // Try to match by Term if ID doesn't match (IDs might change on import)
                        // Or just Term? Using Term is safer across devices if IDs are timestamp based.
                        const card = flashcards.find(c => c.term === p.term);
                        if (card) {
                            card.status = p.status;
                            if (p.box) card.box = p.box;
                            updatedCount++;
                        }
                    });

                    saveFlashcards();
                    alert(`${updatedCount} Karten-Status aktualisiert.`);
                    if (fcState.mode === 'study') initLeitnerSession(1); // Refresh (Box 1)

                } catch (err) {
                    console.error(err);
                    alert('Fehler beim Importieren des Fortschritts.');
                }
                input.value = '';
            }
            reader.readAsText(file);
        }


        function resetFlashcardProgress() {
            if (confirm("Möchtest du den Lernfortschritt wirklich zurücksetzen? Alle Karten wandern zurück in Fach 1.")) {
                flashcards.forEach(c => {
                    c.box = 1;
                    c.status = 'unseen';
                });
                saveFlashcards();

                // Refresh UI
                if (fcState.mode === 'study') {
                    initLeitnerSession(1); // Go back to Box 1
                } else {
                    renderFlashcardList(); // Update list if visible
                }
                alert("Fortschritt wurde zurückgesetzt.");
            }
        }


        // Helper
        function deleteAllFlashcards() {
            if (confirm("WARNUNG: Möchtest du wirklich ALLE Karten löschen? Dies kann nicht rückgängig gemacht werden (außer du hast einen Export).")) {
                flashcards = [];
                saveFlashcards();
                renderFlashcardList();
                alert("Alle Karten wurden gelöscht.");
            }
        }

        function escapeHtml(text) {
            if (!text) return text;
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function escapeXml(unsafe) {
            return unsafe.replace(/[<>&'"]/g, function (c) {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                }
            });
        }

        // --- Pomodoro Timer Logic ---
        let pomoState = {
            timer: null,
            timeLeft: 25 * 60,
            isRunning: false,
            phase: 'work', // 'work', 'shortBreak', 'longBreak'
            round: 1,
            settings: {
                work: 25,
                shortBreak: 5,
                longBreak: 15,
                rounds: 4,
                autoStart: false,
                visualAlarm: false
            },
            wakeLock: null
        };

        function initPomodoro() {
            loadPomodoroSettings();
            updateTimerDisplay();
            renderTomatoes();
        }

        function loadPomodoroSettings() {
            const saved = localStorage.getItem('osi_pomo_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure new keys exist
                pomoState.settings = { ...pomoState.settings, ...parsed };
            }
            // Update inputs
            const elWork = document.getElementById('pomo-work-time');
            const elShort = document.getElementById('pomo-short-break');
            const elLong = document.getElementById('pomo-long-break');
            const elRounds = document.getElementById('pomo-rounds');
            const elAuto = document.getElementById('pomo-auto-start');

            if (elWork) elWork.value = pomoState.settings.work;
            if (elShort) elShort.value = pomoState.settings.shortBreak;
            if (elLong) elLong.value = pomoState.settings.longBreak;
            if (elRounds) elRounds.value = pomoState.settings.rounds;
            if (elRounds) elRounds.value = pomoState.settings.rounds;
            if (elAuto) elAuto.checked = pomoState.settings.autoStart;
            const elVisual = document.getElementById('pomo-visual-alarm');
            if (elVisual) elVisual.checked = pomoState.settings.visualAlarm;
        }

        function savePomodoroSettings() {
            pomoState.settings.work = parseInt(document.getElementById('pomo-work-time').value);
            pomoState.settings.shortBreak = parseInt(document.getElementById('pomo-short-break').value);
            pomoState.settings.longBreak = parseInt(document.getElementById('pomo-long-break').value);
            pomoState.settings.rounds = parseInt(document.getElementById('pomo-rounds').value);
            pomoState.settings.autoStart = document.getElementById('pomo-auto-start').checked;
            pomoState.settings.visualAlarm = document.getElementById('pomo-visual-alarm').checked;

            localStorage.setItem('osi_pomo_settings', JSON.stringify(pomoState.settings));
            closePomodoroSettings();

            // Reset timer if not running, to apply new settings
            if (!pomoState.isRunning) {
                resetPomodoro();
            }
        }

        function openPomodoroSettings() {
            document.getElementById('pomodoro-settings-modal').style.display = 'flex';
        }

        function closePomodoroSettings() {
            document.getElementById('pomodoro-settings-modal').style.display = 'none';
        }

        // Global Audio Context
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    audioCtx = new AudioContext();
                }
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        // Wake Lock API
        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator) {
                    pomoState.wakeLock = await navigator.wakeLock.request('screen');
                    pomoState.wakeLock.addEventListener('release', () => {
                        console.log('Wake Lock released');
                        pomoState.wakeLock = null;
                    });
                    console.log('Wake Lock active');
                }
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }

        function releaseWakeLock() {
            if (pomoState.wakeLock) {
                pomoState.wakeLock.release();
                pomoState.wakeLock = null;
            }
        }

        // Re-request wake lock on visibility change
        document.addEventListener('visibilitychange', async () => {
            if (pomoState.wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        });

        function togglePomodoro() {
            const btn = document.getElementById('pomo-start-btn');
            if (pomoState.isRunning) {
                clearInterval(pomoState.timer);
                pomoState.isRunning = false;
                releaseWakeLock();
                // Set Play Icon
                if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            } else {
                startTimer();
            }
        }

        function startTimer() {
            if (pomoState.isRunning) return;

            // Initialize Audio on user interaction
            initAudio();

            // Request Wake Lock
            requestWakeLock();

            pomoState.timer = setInterval(pomoTick, 1000);
            pomoState.isRunning = true;

            // Set Pause Icon
            const btn = document.getElementById('pomo-start-btn');
            if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        }

        function resetPomodoro() {
            clearInterval(pomoState.timer);
            pomoState.isRunning = false;
            releaseWakeLock();
            pomoState.phase = 'work';
            pomoState.round = 1;
            pomoState.timeLeft = pomoState.settings.work * 60;

            pomoState.timeLeft = pomoState.settings.work * 60;

            // Reset Icon
            const btn = document.getElementById('pomo-start-btn');
            if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

            updateTimerDisplay();
            renderTomatoes(); // Used to initialize single tomato
            updateTimerDisplay();
            renderTomatoes(); // Used to initialize single tomato
            updateIndicatorVisuals(); // Reset visuals
        }

        function pomoTick() {
            if (pomoState.timeLeft > 0) {
                pomoState.timeLeft--;
                updateTimerDisplay();
                updateTimerDisplay();
                updateIndicatorVisuals();
            } else {
                // Phase Complete
                completePomoPhase();
            }
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(pomoState.timeLeft / 60);
            const seconds = pomoState.timeLeft % 60;
            const timerDisplay = document.getElementById('pomo-timer');
            if (timerDisplay) {
                timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }

            let phaseText = '';
            if (pomoState.phase === 'work') phaseText = 'Arbeitsphase';
            else if (pomoState.phase === 'shortBreak') phaseText = 'Kurze Pause';
            else phaseText = 'Lange Pause';

            const phaseLabel = document.getElementById('pomo-phase-label');
            if (phaseLabel) phaseLabel.innerText = phaseText;

            const roundDisplay = document.getElementById('pomo-round-display');
            if (roundDisplay) roundDisplay.innerText = `Runde ${pomoState.round} von ${pomoState.settings.rounds}`;

            // Update Ring Progress
            const circle = document.querySelector('.progress-ring__circle');
            if (circle) {
                const radius = circle.r.baseVal.value;
                const circumference = radius * 2 * Math.PI;

                // Initialize if not set
                if (!circle.style.strokeDasharray) {
                    circle.style.strokeDasharray = `${circumference} ${circumference}`;
                }

                let totalTime;
                if (pomoState.phase === 'work') totalTime = pomoState.settings.work * 60;
                else if (pomoState.phase === 'shortBreak') totalTime = pomoState.settings.shortBreak * 60;
                else totalTime = pomoState.settings.longBreak * 60;

                // CCW Emptying Logic (Revised):
                // 1. We removed scaleX(-1) in CSS.
                // 2. SVG Circle `rotate(-90deg)` starts at 12 o'clock and draws Clockwise (12->1->2).
                // 3. We want the "Solid" part to shrink as time passes. 
                //    Solid part represents Remaining Time? 
                //    If Time=Full, Line=Full (0 to 360).
                //    If Time=75%, Line=75% (0 to 270 CW). 
                //    Gap runs from 270 to 360 (9 o'clock to 12 o'clock).
                //    Tomato should be at 270 (9 o'clock).
                //    Movement: 12->9->6->3. This is CCW.
                //    Visual: Timer empties by "eating" the tail CCW?
                //    Actually, if line is 0->270 CW. The "End" is at 270.
                //    As time reduces (75% -> 50%), Line becomes 0->180 CW.
                //    End moves 270 -> 180. That is CCW movement (9 -> 6).
                //    This matches "Tomate läuft gegen den Uhrzeigersinn".

                const fraction = pomoState.timeLeft / totalTime;
                const visibleLength = circumference * fraction;

                circle.style.strokeDasharray = `${visibleLength} ${circumference}`;
                circle.style.strokeDashoffset = 0; // Start drawing from 12 straight away

                // Rotate Indicator Wrapper
                const wrapper = document.getElementById('pomo-indicator-wrapper');
                if (wrapper) {
                    // Tomato Position:
                    // It should be at the END of the visible line.
                    // Visible line ends at `fraction * 360` degrees CW from 12.
                    const angle = fraction * 360;

                    // Standard CSS rotation is CW.
                    // We want to rotate to `angle`.
                    wrapper.style.transform = `rotate(${angle}deg)`;
                }
            }
        }

        function completePomoPhase() {
            clearInterval(pomoState.timer);
            pomoState.isRunning = false;
            releaseWakeLock(); // Release lock when finished (or keep it if auto-start? Let's release and re-request)

            playAlarm(); // Audio
            if (pomoState.settings.visualAlarm) {
                triggerVisualAlarm();
            }

            if (pomoState.phase === 'work') {
                // Work finished
                if (pomoState.round >= pomoState.settings.rounds) {
                    pomoState.phase = 'longBreak';
                    pomoState.timeLeft = pomoState.settings.longBreak * 60;
                } else {
                    pomoState.phase = 'shortBreak';
                    pomoState.timeLeft = pomoState.settings.shortBreak * 60;
                }
            } else {
                // Break finished
                if (pomoState.phase === 'longBreak') {
                    // Full cycle done, reset to round 1
                    pomoState.round = 1;
                } else {
                    pomoState.round++;
                }
                pomoState.phase = 'work';
                pomoState.timeLeft = pomoState.settings.work * 60;
            }

            document.getElementById('pomo-start-btn').innerText = '▶ Start';
            updateTimerDisplay();
            renderTomatoes(); // Re-render for new state (growth/fresh tomatoes)

            // Auto Start Check
            if (pomoState.settings.autoStart) {
                startTimer();
            }
        }

        function playAlarm() {
            // Use global audio context
            if (!audioCtx) initAudio();

            if (audioCtx) {
                try {
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);

                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
                    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);

                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.5);
                } catch (e) {
                    console.error("Audio playback error:", e);
                }
            }
        }

        function triggerVisualAlarm() {
            document.body.classList.add('visual-alarm');
            // Remove class after animation finishes (3s assumed from CSS)
            setTimeout(() => {
                document.body.classList.remove('visual-alarm');
            }, 3000);
        }

        // --- Visual Tomato Logic ---

        const SVG_TOMATO = `
<svg viewBox="0 0 100 100" class="tomato-svg">
    <g class="layer-plant" style="display:none; transform-origin: center bottom;">
        <!-- Plant Stem/Leaves growing -->
        <path d="M50 90 Q 50 50 30 30 M 50 90 Q 50 50 70 30" stroke="#4ade80" stroke-width="5" fill="none" />
        <circle cx="30" cy="30" r="5" fill="#4ade80" />
        <circle cx="70" cy="30" r="5" fill="#4ade80" />
    </g>
    <g class="layer-tomato" style="transform-origin: center bottom;">
        <path d="M50 10 C 20 10 5 30 5 55 C 5 85 25 95 50 95 C 75 95 95 85 95 55 C 95 30 80 10 50 10" fill="#ef4444" />
        <!-- Brown Spots (Hidden initially) -->
        <g class="brown-spots" style="opacity: 0;">
             <circle cx="30" cy="40" r="5" fill="#5D4037" opacity="0.6" filter="blur(1px)"/>
             <circle cx="70" cy="60" r="7" fill="#5D4037" opacity="0.7" filter="blur(2px)"/>
             <ellipse cx="50" cy="80" rx="10" ry="5" fill="#3E2723" opacity="0.8" filter="blur(2px)"/>
        </g>
        <path d="M50 10 L 50 5 M 40 10 L 40 0 M 60 10 L 60 0" stroke="#166534" stroke-width="3" />
        <path d="M50 10 Q 30 5 25 15 M 50 10 Q 70 5 75 15" fill="none" stroke="#166534" stroke-width="3" />
    </g>
    <g class="layer-seeds" style="display:none;">
        <circle cx="40" cy="50" r="3" fill="#fbbf24" />
        <circle cx="60" cy="50" r="3" fill="#fbbf24" />
        <circle cx="50" cy="65" r="3" fill="#fbbf24" />
        <circle cx="50" cy="40" r="3" fill="#fbbf24" />
        <path d="M30 80 Q 50 90 70 80" stroke="#78350f" stroke-width="2" fill="none" opacity="0.5"/>
    </g>
</svg>
`;

        function renderTomatoes() {
            const div = document.getElementById('pomo-indicator-tomato');
            if (!div) return;
            div.innerHTML = SVG_TOMATO;

            // Initial State - Fresh
            const tomatoLayer = div.querySelector('.layer-tomato');
            if (tomatoLayer) {
                tomatoLayer.style.display = 'block';
                tomatoLayer.style.transform = 'scale(1)';
                tomatoLayer.style.opacity = '1';
                tomatoLayer.style.filter = 'none';
                const spots = tomatoLayer.querySelector('.brown-spots');
                if (spots) spots.style.opacity = '0';
            }

            // Hide others
            const seedLayer = div.querySelector('.layer-seeds');
            if (seedLayer) seedLayer.style.display = 'none';
            const plantLayer = div.querySelector('.layer-plant');
            if (plantLayer) plantLayer.style.display = 'none';
        }

        function updateIndicatorVisuals() {
            // Only animate in Work Phase? Or always? User said "Die Status-Position im Kreis soll eine kleine Tomate sein".
            // Let's animate for work, and maybe reset or show something else for break?
            // User didn't specify break. Let's assume fresh tomato for break or maybe coffee cup? 
            // Stick to tomato logic for now.

            const div = document.getElementById('pomo-indicator-tomato');
            if (!div) return;

            let totalTime;
            if (pomoState.phase === 'work') totalTime = pomoState.settings.work * 60;
            else if (pomoState.phase === 'shortBreak') totalTime = pomoState.settings.shortBreak * 60;
            else totalTime = pomoState.settings.longBreak * 60;

            const elapsed = totalTime - pomoState.timeLeft;
            const progress = elapsed / totalTime; // 0 to 1

            const tomatoLayer = div.querySelector('.layer-tomato');
            if (!tomatoLayer) return;

            if (pomoState.phase === 'work') {
                // Rotting Logic

                // 1. Color: Pale & Sepia
                let saturate = 1;
                let brightness = 1;
                let sepia = 0;

                if (progress > 0) {
                    saturate = 1 - (progress * 0.5);
                    brightness = 1 - (progress * 0.2);
                    sepia = progress * 0.4;
                }
                tomatoLayer.style.filter = `saturate(${saturate}) brightness(${brightness}) sepia(${sepia})`;

                // 2. Brown Spots
                const spots = tomatoLayer.querySelector('.brown-spots');
                if (spots) {
                    let spotOp = 0;
                    if (progress > 0.2) {
                        spotOp = (progress - 0.2) / 0.6;
                        if (spotOp > 1) spotOp = 1;
                    }
                    spots.style.opacity = spotOp;
                }

                // 3. Shrivel / Shrink
                // Start shriveling after 30%
                if (progress > 0.3) {
                    const shrivel = (progress - 0.3) * 0.5; // 0 -> 0.35
                    const scale = 1 - shrivel; // 1 -> 0.65
                    tomatoLayer.style.transform = `scale(${scale})`; // Just shrink, don't squash/translate
                }
            } else {
                // Break Phase - Revive / Restore Logic
                // Progress 0 (Start of Break) -> Should look Rotten (End of Work)
                // Progress 1 (End of Break) -> Should look Fresh (Start of Work)

                // Invert progress for "Rot" calculation to get "Healing"
                const revProgress = 1 - progress; // Starts at 1 (Rotten), goes to 0 (Fresh)

                // Reuse Rot Logic with reversed progress

                // 1. Color
                let saturate = 1;
                let brightness = 1;
                let sepia = 0;

                if (revProgress > 0) {
                    saturate = 1 - (revProgress * 0.5);
                    brightness = 1 - (revProgress * 0.2);
                    sepia = revProgress * 0.4;
                }
                tomatoLayer.style.filter = `saturate(${saturate}) brightness(${brightness}) sepia(${sepia})`;

                // 2. Brown Spots
                const spots = tomatoLayer.querySelector('.brown-spots');
                if (spots) {
                    let spotOp = 0;
                    if (revProgress > 0.2) {
                        spotOp = (revProgress - 0.2) / 0.6;
                        if (spotOp > 1) spotOp = 1;
                    }
                    spots.style.opacity = spotOp;
                }

                // 3. Shrivel / Shrink
                if (revProgress > 0.3) {
                    const shrivel = (revProgress - 0.3) * 0.5;
                    const scale = 1 - shrivel;
                    tomatoLayer.style.transform = `scale(${scale})`;
                } else {
                    tomatoLayer.style.transform = `scale(1)`;
                }
            }
        }
        // function updateTomatoVisuals removed - replaced by updateIndicatorVisuals
        function updateTomatoVisuals() {
            // Deprecated
        }



        // --- Entschuldigungen Logic ---
        let signaturePad = null;
        let signatureCtx = null;
        let isDrawing = false;
        let excuseAttachments = [];
        let excuseAttachmentIdCounter = 0;

        function initEntschuldigungen() {
            const now = new Date();
            const todayStr = toGermanDate(now);

            // Set placeholders and initial values and sync listeners
            const fields = [
                { text: 'excuse-missed-from', picker: 'excuse-missed-from-picker', val: null },
                { text: 'excuse-missed-to', picker: 'excuse-missed-to-picker', val: null },
                { text: 'excuse-today', picker: 'excuse-today-picker', val: todayStr },
                { text: 'excuse-dob', picker: 'excuse-dob-picker', val: null },
                { text: 'excuse-attest-date', picker: 'excuse-attest-date-picker', val: null }
            ];

            fields.forEach(f => {
                const textInp = document.getElementById(f.text);
                if (textInp) {
                    // Always set today's date for 'excuse-today' as requested
                    if (f.text === 'excuse-today') {
                        textInp.value = f.val;
                        // Sync picker if exists
                        const picker = document.getElementById(f.picker);
                        if (picker) picker.value = toISODate(f.val);
                    } else if (f.val && !textInp.value) {
                        textInp.value = f.val;
                    }

                    // Manual typing only as requested
                    if (!textInp.dataset.inputListener) {
                        textInp.addEventListener('input', () => {
                            checkAbsenceDuration();
                            // Don't auto-save for from/to/today as requested
                            const noSaveFields = ['excuse-missed-from', 'excuse-missed-to', 'excuse-today'];
                            if (!noSaveFields.includes(f.text)) {
                                saveAppState();
                            }
                        });
                        textInp.dataset.inputListener = 'true';
                    }
                }
            });

            // Master Data Auto-Save Listeners
            ['excuse-name', 'excuse-class', 'excuse-teacher'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.dataset.autosaveListener) {
                    el.addEventListener('input', saveAppState);
                    el.dataset.autosaveListener = 'true';
                }
            });

            ['excuse-adult', 'excuse-attest'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.dataset.autosaveListener) {
                    el.addEventListener('change', saveAppState);
                    el.dataset.autosaveListener = 'true';
                }
            });

            checkAbsenceDuration();

            // Init Signature Pad
            const canvas = document.getElementById('excuse-signature');
            if (canvas) {
                signatureCtx = canvas.getContext('2d');
                signatureCtx.strokeStyle = '#00255e'; // FLB Blue
                signatureCtx.lineWidth = 2;
                signatureCtx.lineJoin = 'round';
                signatureCtx.lineCap = 'round';

                const startDrawing = (e) => {
                    isDrawing = true;
                    draw(e);
                };
                const stopDrawing = () => {
                    isDrawing = false;
                    signatureCtx.beginPath();
                };
                const draw = (e) => {
                    if (!isDrawing) return;
                    const rect = canvas.getBoundingClientRect();
                    let x, y;
                    if (e.touches && e.touches.length > 0) {
                        x = e.touches[0].clientX - rect.left;
                        y = e.touches[0].clientY - rect.top;
                    } else {
                        x = e.clientX - rect.left;
                        y = e.clientY - rect.top;
                    }
                    signatureCtx.lineTo(x, y);
                    signatureCtx.stroke();
                    signatureCtx.beginPath();
                    signatureCtx.moveTo(x, y);
                };

                canvas.addEventListener('mousedown', startDrawing);
                canvas.addEventListener('mousemove', draw);
                window.addEventListener('mouseup', stopDrawing);

                canvas.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    startDrawing(e);
                });
                canvas.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    draw(e);
                });
                canvas.addEventListener('touchend', stopDrawing);
            }
        }

        function clearSignature() {
            const canvas = document.getElementById('excuse-signature');
            if (canvas && signatureCtx) {
                signatureCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        function toggleAttestDate() {
            const isAttest = document.getElementById('excuse-attest').checked;
            document.getElementById('attest-date-container').style.display = isAttest ? 'block' : 'none';
        }

        function handleExcuseImport(input) {
            if (input.files && input.files.length > 0) {
                handleExcuseFiles(input.files);
            }
        }

        function handleExcuseFiles(files) {
            if (!files || files.length === 0) return;

            Array.from(files).forEach(file => {
                if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
                    const attachment = {
                        id: excuseAttachmentIdCounter++,
                        file: file,
                        name: file.name,
                        type: file.type,
                        included: true
                    };
                    excuseAttachments.push(attachment);
                } else {
                    alert(`Dateityp von ${file.name} wird nicht unterstützt. Bitte nur PDFs oder Bilder (JPEG/PNG) hochladen.`);
                }
            });

            const fileInput = document.getElementById('excuse-file-input');
            if (fileInput) fileInput.value = '';
            const cameraInput = document.getElementById('excuse-camera-input');
            if (cameraInput) cameraInput.value = '';

            renderExcuseAttachments();
        }

        function removeExcuseAttachment(id) {
            excuseAttachments = excuseAttachments.filter(a => a.id !== id);
            renderExcuseAttachments();
        }

        function toggleExcuseAttachment(id) {
            const attachment = excuseAttachments.find(a => a.id === id);
            if (attachment) {
                attachment.included = !attachment.included;
                renderExcuseAttachments();
            }
        }

        function renameExcuseAttachment(id) {
            const attachment = excuseAttachments.find(a => a.id === id);
            if (!attachment) return;
            const newName = prompt("Neuer Name für den Anhang:", attachment.name);
            if (newName && newName.trim() !== '') {
                attachment.name = newName.trim();
                renderExcuseAttachments();
            }
        }

        function renderExcuseAttachments() {
            const list = document.getElementById('excuse-attachments-list');
            if (!list) return;

            list.innerHTML = '';

            if (excuseAttachments.length === 0) {
                list.style.display = 'none';
                return;
            }

            list.style.display = 'flex';

            excuseAttachments.forEach(att => {
                const item = document.createElement('div');
                item.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.5rem; background: rgba(0,0,0,0.05); border-radius: 0.5rem;
            border: 1px solid var(--card-border); gap: 0.5rem;
            opacity: ${att.included ? '1' : '0.5'};
            transition: opacity 0.2s;
        `;

                const isPdf = att.type === 'application/pdf';
                const iconSvg = isPdf ?
                    `<svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--primary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>` :
                    `<svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--primary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;

                const nameContainer = document.createElement('div');
                nameContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex: 1; overflow: hidden;';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = att.name;
                nameSpan.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem; font-weight: 500; cursor: pointer;';
                nameSpan.title = "Klicken zum Umbenennen";
                nameSpan.onclick = () => renameExcuseAttachment(att.id);

                nameContainer.innerHTML = iconSvg;
                nameContainer.appendChild(nameSpan);

                const actionsContainer = document.createElement('div');
                actionsContainer.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'btn-secondary btn-icon';
                toggleBtn.style.cssText = 'padding: 0.3rem; height: auto; border: none; background: transparent; color: var(--text-main);';
                toggleBtn.title = att.included ? "Nicht in PDF aufnehmen" : "In PDF aufnehmen";
                toggleBtn.innerHTML = att.included ?
                    `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>` :
                    `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`;
                toggleBtn.onclick = () => toggleExcuseAttachment(att.id);

                const rmBtn = document.createElement('button');
                rmBtn.className = 'btn-secondary btn-icon';
                rmBtn.style.cssText = 'padding: 0.3rem; height: auto; border: none; background: transparent; color: #ef4444;';
                rmBtn.title = "Löschen";
                rmBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                rmBtn.onclick = () => removeExcuseAttachment(att.id);

                actionsContainer.appendChild(toggleBtn);
                actionsContainer.appendChild(rmBtn);

                item.appendChild(nameContainer);
                item.appendChild(actionsContainer);
                list.appendChild(item);
            });
        }

        function toggleExcuseTimeUnit(isMinutes) {
            const hoursGroup = document.getElementById('excuse-hours-group');
            const minutesGroup = document.getElementById('excuse-minutes-group');
            const hoursInput = document.getElementById('excuse-hours');
            const minutesInput = document.getElementById('excuse-minutes');

            if (isMinutes) {
                if (hoursGroup) hoursGroup.style.display = 'none';
                if (minutesGroup) minutesGroup.style.display = 'block';
                if (hoursInput) hoursInput.value = '';
            } else {
                if (hoursGroup) hoursGroup.style.display = 'block';
                if (minutesGroup) minutesGroup.style.display = 'none';
                if (minutesInput) minutesInput.value = '';
            }
        }

        function checkAbsenceDuration() {
            const fromInput = document.getElementById('excuse-missed-from');
            const toInput = document.getElementById('excuse-missed-to');
            const warning = document.getElementById('attest-warning');
            const rangeError = document.getElementById('date-range-error');
            const shareBtn = document.getElementById('excuse-share-btn');
            const downloadBtn = document.getElementById('excuse-download-btn');

            let isRangeInvalid = false;
            let isBothDatesEntered = false;

            if (!fromInput || !toInput) return;

            const fromVal = fromInput.value;
            const toVal = toInput.value;

            const fromDate = parseGermanDate(fromVal);
            const toDate = parseGermanDate(toVal);

            if (fromDate && toDate) {
                isBothDatesEntered = true;
                if (toDate < fromDate) {
                    isRangeInvalid = true;
                }

                const diffTime = Math.abs(toDate - fromDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const timeUnitToggle = document.getElementById('excuse-time-unit-toggle');
                if (timeUnitToggle) toggleExcuseTimeUnit(timeUnitToggle.checked);

                if (diffDays >= 3 && !isRangeInvalid) {
                    warning.style.display = 'block';
                } else {
                    warning.style.display = 'none';
                }
            } else {
                warning.style.display = 'none';
            }

            // Immediate visual feedback
            if (rangeError) rangeError.style.display = isRangeInvalid ? 'block' : 'none';

            // Disable if invalid OR if not both dates are entered
            const shouldDisable = isRangeInvalid || !isBothDatesEntered;

            if (shareBtn) shareBtn.disabled = shouldDisable;
            if (downloadBtn) downloadBtn.disabled = shouldDisable;

            // Highlight inputs in red if invalid range (not if just partial)
            [fromInput, toInput].forEach(inp => {
                if (isRangeInvalid) inp.classList.add('invalid-range');
                else inp.classList.remove('invalid-range');
            });

            // Dim buttons
            [shareBtn, downloadBtn].forEach(btn => {
                if (btn) {
                    btn.style.opacity = shouldDisable ? '0.5' : '1';
                    btn.style.pointerEvents = shouldDisable ? 'none' : 'auto';
                }
            });
        }


        async function downloadExcuse() {
            const data = getExcuseData();
            if (!data.name) {
                alert("Bitte geben Sie einen Namen ein.");
                return;
            }
            if (!data.missedFrom || !data.missedTo) {
                alert("Bitte geben Sie den Zeitraum der Abwesenheit an.");
                return;
            }

            const filename = `Entschuldigung ${data.name}_${formatDate(data.missedFrom)} - ${formatDate(data.missedTo)}`;

            try {
                const pdfBlob = await generateExcusePDF(data);
                const link = document.createElement("a");
                link.href = URL.createObjectURL(pdfBlob);
                link.download = `${filename}.pdf`;
                link.click();
            } catch (error) {
                console.error("Fehler beim Herunterladen:", error);
                alert("Fehler beim Erstellen der Entschuldigung.");
            }
        }

        async function shareExcuse() {
            const data = getExcuseData();
            if (!data.name) {
                alert("Bitte geben Sie einen Namen ein.");
                return;
            }
            if (!data.missedFrom || !data.missedTo) {
                alert("Bitte geben Sie den Zeitraum der Abwesenheit an.");
                return;
            }

            const filename = `Entschuldigung ${data.name}_${formatDate(data.missedFrom)} - ${formatDate(data.missedTo)}`;

            try {
                const pdfBlob = await generateExcusePDF(data);
                const file = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Entschuldigung',
                        text: `Entschuldigung für ${data.name}`
                    });
                } else {
                    // Fallback: Download the PDF directly
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(pdfBlob);
                    link.download = `${filename}.pdf`;
                    link.click();
                }
            } catch (error) {
                console.error("Fehler beim Teilen:", error);
                alert("Teilen wird von diesem Browser eventuell nicht unterstützt.");
            }
        }

        function getExcuseData() {
            const from = document.getElementById('excuse-missed-from').value;
            const to = document.getElementById('excuse-missed-to').value;
            const fromDate = parseGermanDate(from);
            const toDate = parseGermanDate(to);

            let duration = 0;
            if (fromDate && toDate) {
                const diffTime = Math.abs(toDate - fromDate);
                duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            return {
                name: document.getElementById('excuse-name').value,
                dob: document.getElementById('excuse-dob').value,
                adult: document.getElementById('excuse-adult').checked,
                class: document.getElementById('excuse-class').value,
                teacher: document.getElementById('excuse-teacher').value,
                attest: document.getElementById('excuse-attest').checked,
                attestDate: document.getElementById('excuse-attest-date').value,
                missedFrom: from,
                missedTo: to,
                duration: duration,
                hours: document.getElementById('excuse-hours').value,
                minutes: document.getElementById('excuse-minutes').value,
                reason: document.getElementById('excuse-reason').value,
                today: document.getElementById('excuse-today').value,
                signature: document.getElementById('excuse-signature').toDataURL()
            };
        }

        function toGermanDate(date) {
            if (!date) return "";
            let d;
            if (typeof date === 'string') {
                if (date.includes('-')) {
                    const parts = date.split('-');
                    if (parts.length === 3) {
                        // Manually parse to avoid timezone shifts
                        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    } else {
                        d = new Date(date);
                    }
                } else if (date.includes('.')) {
                    return date; // Already German
                } else {
                    d = new Date(date);
                }
            } else {
                d = new Date(date);
            }

            if (!d || isNaN(d.getTime())) return "";
            const dayStr = String(d.getDate()).padStart(2, '0');
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const yearStr = d.getFullYear();
            return `${dayStr}.${monthStr}.${yearStr}`;
        }

        function toISODate(germanDate) {
            if (!germanDate || typeof germanDate !== 'string') return "";
            const parts = germanDate.split('.');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return "";
        }

        function parseISODate(isoStr) {
            if (!isoStr || typeof isoStr !== 'string') return null;
            const parts = isoStr.split('-');
            if (parts.length === 3) {
                // Manually parse to avoid timezone shifts (new Date(S) vs new Date(y,m,d))
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            return null;
        }

        function parseGermanDate(str) {
            if (!str || typeof str !== 'string') return null;
            const parts = str.split('.');
            if (parts.length !== 3) return null;
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (year < 1000 || year > 2100) return null; // Basic sanity check
            const date = new Date(year, month, day);
            return isNaN(date.getTime()) ? null : date;
        }

        function formatDate(date) {
            return toGermanDate(date);
        }

        function generateExcuseXML(data) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<entschuldigung>
    <schueler>
        <name>${data.name}</name>
        <geburtsdatum>${data.dob}</geburtsdatum>
        <volljaehrig>${data.adult ? 'ja' : 'nein'}</volljaehrig>
        <klasse>${data.class}</klasse>
    </schueler>
    <details>
        <klassenlehrkraft>${data.teacher}</klassenlehrkraft>
        <attestpflicht>${data.attest ? 'ja' : 'nein'}</attestpflicht>
        ${data.attest ? `<attestpflicht_seit>${data.attestDate}</attestpflicht_seit>` : ''}
        <abwesenheit_von>${data.missedFrom}</abwesenheit_von>
        <abwesenheit_bis>${data.missedTo}</abwesenheit_bis>
        <anzahl_tage>${data.duration}</anzahl_tage>
        <anzahl_stunden>${data.hours}</anzahl_stunden>
        <anzahl_minuten>${data.minutes}</anzahl_minuten>
        <begruendung>${data.reason}</begruendung>
    </details>
    <meta>
        <ausstellungsdatum>${data.today}</ausstellungsdatum>
    </meta>
</entschuldigung>`;
        }

        async function generateExcusePDF(data) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Font setting
            doc.setFont("helvetica", "normal");

            // Header
            doc.setFontSize(22);
            doc.setTextColor(0, 134, 203); // FLB Cyan
            doc.text("Entschuldigung", 20, 20);

            doc.setFontSize(12);
            doc.setTextColor(0, 37, 94); // FLB Blue
            doc.text(`Datum: ${formatDate(data.today)}`, 150, 20);

            // Period below title
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text(`Abwesenheit vom ${formatDate(data.missedFrom)} bis zum ${formatDate(data.missedTo)}`, 20, 30);

            doc.line(20, 33, 190, 33);

            // Warning in PDF if duration >= 3
            if (data.duration >= 3) {
                doc.setFontSize(10);
                doc.setTextColor(200, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.text("HINWEIS: Bitte denken Sie daran, Ihrer Klassenlehrkraft ein ärztliches Attest zu geben.", 20, 38);
                doc.setFont("helvetica", "normal");
            }

            // Content
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);

            let y = 50;
            const lineSpacing = 10;

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Persönliche Daten", 20, y);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            y += lineSpacing;

            doc.text(`Name: ${data.name}`, 20, y);
            doc.text(`Klasse: ${data.class}`, 120, y);
            y += lineSpacing;
            doc.text(`Geburtsdatum: ${formatDate(data.dob)}`, 20, y);
            doc.text(`Volljährig: ${data.adult ? 'Ja' : 'Nein'}`, 120, y);
            y += lineSpacing;
            doc.text(`Klassenlehrkraft: ${data.teacher}`, 20, y);
            y += lineSpacing * 1.5;

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Abwesenheit", 20, y);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            y += lineSpacing;

            doc.text(`Zeitraum des Fehlens: ${formatDate(data.missedFrom)} - ${formatDate(data.missedTo)}`, 20, y);
            y += lineSpacing;
            doc.text(`Dauer: ${data.duration} Tag(e)`, 20, y);

            let timeParts = [];
            if (data.hours) timeParts.push(`${data.hours} Std.`);
            if (data.minutes) timeParts.push(`${data.minutes} Min.`);

            if (timeParts.length > 0) {
                doc.text(`Versäumte Zeit: ${timeParts.join(' / ')}`, 120, y);
            }
            y += lineSpacing;

            if (data.attest) {
                doc.text(`Attestpflicht seit: ${formatDate(data.attestDate)}`, 20, y);
                y += lineSpacing;
            }

            y += lineSpacing;
            doc.setFont("helvetica", "bold");
            doc.text("Begründung:", 20, y);
            doc.setFont("helvetica", "normal");
            y += lineSpacing;

            // Multi-line reason
            const splitReason = doc.splitTextToSize(data.reason, 170);
            doc.text(splitReason, 20, y);
            y += (splitReason.length * 7) + 15;

            // Signature
            doc.text("Unterschrift:", 20, y);
            if (data.signature && data.signature !== "data:,") {
                doc.addImage(data.signature, 'PNG', 20, y + 5, 60, 30);
            }

            y += 40;
            doc.line(20, y, 80, y);
            doc.setFontSize(8);
            doc.text("Unterschrift der Eltern / des vollj. Schülers", 20, y + 5);

            const includedAttachments = excuseAttachments.filter(a => a.included);
            const pdfAttachments = includedAttachments.filter(a => a.type === 'application/pdf');
            const imageAttachments = includedAttachments.filter(a => a.type.startsWith('image/'));

            if (includedAttachments.length > 0) {
                y += 15;
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("Anhänge:", 20, y);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                y += 7;
                includedAttachments.forEach(att => {
                    doc.text(`- ${att.name}`, 25, y);
                    y += 7;
                });
            }

            const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            for (const att of imageAttachments) {
                try {
                    const dataUrl = await readFileAsDataURL(att.file);
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);

                            const jpegUrl = canvas.toDataURL('image/jpeg', 0.8);

                            doc.addPage();
                            const pdfWidth = doc.internal.pageSize.getWidth();
                            const pdfHeight = doc.internal.pageSize.getHeight();

                            const ratio = Math.min((pdfWidth - 40) / img.width, (pdfHeight - 40) / img.height);
                            const newWidth = img.width * ratio;
                            const newHeight = img.height * ratio;

                            doc.addImage(jpegUrl, 'JPEG', 20, 20, newWidth, newHeight);
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = dataUrl;
                    });
                } catch (e) {
                    console.error(`Fehler beim Bilder-Anhang ${att.name}:`, e);
                }
            }

            const basePdfBytes = doc.output('arraybuffer');

            if (pdfAttachments.length === 0) {
                return new Blob([basePdfBytes], { type: 'application/pdf' });
            }

            const { PDFDocument } = window.PDFLib;
            const mergedPdf = await PDFDocument.load(basePdfBytes);

            for (const att of pdfAttachments) {
                try {
                    const attBuffer = await att.file.arrayBuffer();
                    const attDoc = await PDFDocument.load(attBuffer);
                    const copiedPages = await mergedPdf.copyPages(attDoc, attDoc.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                } catch (e) {
                    console.error(`Fehler beim Hinzufügen des Anhangs ${att.name}:`, e);
                }
            }

            const finalPdfBytes = await mergedPdf.save();
            return new Blob([finalPdfBytes], { type: 'application/pdf' });
        }

        // --- Application Start ---
        // init() MUST be called after ALL variable declarations (flashcards, kanbanState, etc.)
        // to avoid JavaScript Temporal Dead Zone (TDZ) errors with 'let' variables.

        function toggleLaunchpadList(listId) {
            const list = document.getElementById(listId);
            const icon = document.getElementById('icon-' + listId);
            const button = icon ? icon.closest('.launchpad-button') : null;
            if (list && list.style.display === 'none') {
                list.style.display = 'block';
                if (button) button.classList.add('open');
            } else if (list) {
                list.style.display = 'none';
                if (button) button.classList.remove('open');
            }
        }

        document.addEventListener('DOMContentLoaded', init);
