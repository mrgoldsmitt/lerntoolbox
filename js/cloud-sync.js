// js/cloud-sync.js

let currentUser = null;

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (e) {
        return { ok: false, data: { error: 'Verbindungsfehler zur Cloud.' } };
    }
}

// Auth Logik
async function checkAuthStatus() {
    const { ok, data } = await fetchAPI('/api/auth/me');
    if (ok && data.user) {
        currentUser = data.user;
        if (currentUser.theme && typeof applyTheme === 'function') {
            applyTheme(currentUser.theme);
            localStorage.setItem('osi_theme', currentUser.theme);
        }
        updateAuthUI(true);
    } else {
        currentUser = null;
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-badge-container');
    const sidebarContainer = document.getElementById('sidebar-auth-container');

    if (isLoggedIn) {
        const headerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 0.8rem; color: var(--text-main);">${currentUser.email}</span>
                <div class="burger-menu-container" style="position: relative;">
                    <button class="btn-secondary" onclick="toggleBurgerMenu('account-dropdown-menu')" style="font-size: 0.75rem; padding: 0.3rem 0.5rem;" title="Account">
                        Account ▾
                    </button>
                    <div id="account-dropdown-menu" class="burger-dropdown" style="display: none;">
                        <button class="menu-item" onclick="openAccountModal()" style="font-size: 0.8rem;">Account verwalten</button>
                        <div style="height: 1px; background: var(--card-border); margin: 0.25rem 0;"></div>
                        <button class="menu-item" onclick="logout()" style="font-size: 0.8rem;">Abmelden</button>
                    </div>
                </div>
            </div>
        `;
        if (container) container.innerHTML = headerHTML;

        // Sidebar auth for mobile
        if (sidebarContainer) {
            sidebarContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.4rem; padding: 0.5rem 0.6rem; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 0.5rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${currentUser.email}</span>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn-secondary" onclick="openAccountModal()" style="font-size: 0.7rem; padding: 0.25rem 0.5rem; flex: 1;">Account</button>
                        <button class="btn-secondary" onclick="logout()" style="font-size: 0.7rem; padding: 0.25rem 0.5rem; flex: 1;">Abmelden</button>
                    </div>
                </div>
            `;
            sidebarContainer.style.display = 'block';
        }

        document.querySelectorAll('.cloud-auth-required').forEach(el => el.style.display = 'flex');
    } else {
        if (container) {
            container.innerHTML = `
                <button class="btn-secondary" onclick="openLoginModal()" style="font-size: 0.8rem; padding: 0.3rem 0.6rem; margin-right: 0.5rem;">Anmelden</button>
            `;
        }

        // Sidebar auth for mobile
        if (sidebarContainer) {
            sidebarContainer.innerHTML = `
                <button class="btn-secondary" onclick="openLoginModal()" style="font-size: 0.75rem; padding: 0.3rem 0.5rem; width: 100%;">Anmelden</button>
            `;
            sidebarContainer.style.display = 'block';
        }

        document.querySelectorAll('.cloud-auth-required').forEach(el => el.style.display = 'none');
    }
}

// Modals
function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none';
}
function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}
function openRegisterModal() {
    closeLoginModal();
    document.getElementById('register-modal').style.display = 'flex';
    document.getElementById('register-error').style.display = 'none';
}
function closeRegisterModal() {
    document.getElementById('register-modal').style.display = 'none';
}
function openCloudLoadModal() {
    document.getElementById('cloud-load-modal').style.display = 'flex';
}
function closeCloudLoadModal() {
    document.getElementById('cloud-load-modal').style.display = 'none';
}

function openResetPasswordModal() {
    closeLoginModal();
    closeAccountModal();
    document.getElementById('reset-password-modal').style.display = 'flex';
    document.getElementById('reset-password-error').style.display = 'none';
    document.getElementById('reset-password-success').style.display = 'none';
}
function closeResetPasswordModal() {
    document.getElementById('reset-password-modal').style.display = 'none';
}

function openAccountModal() {
    document.getElementById('account-modal').style.display = 'flex';
    document.getElementById('account-error').style.display = 'none';
    document.getElementById('account-success').style.display = 'none';
    document.getElementById('account-email').value = currentUser ? currentUser.email : '';
    // close burger menu
    document.getElementById('account-dropdown-menu').style.display = 'none';
}
function closeAccountModal() {
    document.getElementById('account-modal').style.display = 'none';
}

// Submit forms
async function submitLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    
    errEl.style.display = 'none';
    const { ok, data } = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    if (ok) {
        closeLoginModal();
        await checkAuthStatus();
    } else {
        errEl.innerText = data.error || 'Fehler beim Anmelden.';
        errEl.style.display = 'block';
    }
}

async function submitRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const birth_date = document.getElementById('register-dob').value;
    const errEl = document.getElementById('register-error');
    
    errEl.style.display = 'none';
    const { ok, data } = await fetchAPI('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, birth_date })
    });
    
    if (ok) {
        closeRegisterModal();
        alert('Erfolgreich registriert. Du kannst dich jetzt anmelden.');
        openLoginModal();
    } else {
        errEl.innerText = data.error || 'Fehler bei der Registrierung.';
        errEl.style.display = 'block';
    }
}

async function logout() {
    await fetchAPI('/api/auth/logout', { method: 'POST' });
    await checkAuthStatus();
}

async function submitResetPassword() {
    const email = document.getElementById('reset-email').value;
    const birth_date = document.getElementById('reset-dob').value;
    const new_password = document.getElementById('reset-new-password').value;
    const errEl = document.getElementById('reset-password-error');
    const succEl = document.getElementById('reset-password-success');
    
    errEl.style.display = 'none';
    succEl.style.display = 'none';
    
    const { ok, data } = await fetchAPI('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, birth_date, new_password })
    });
    
    if (ok) {
        succEl.innerText = 'Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich nun anmelden.';
        succEl.style.display = 'block';
        setTimeout(() => {
            closeResetPasswordModal();
            openLoginModal();
        }, 2000);
    } else {
        errEl.innerText = data.error || 'Fehler beim Zurücksetzen.';
        errEl.style.display = 'block';
    }
}

async function submitChangeEmail() {
    const email = document.getElementById('account-email').value;
    const errEl = document.getElementById('account-error');
    const succEl = document.getElementById('account-success');
    
    errEl.style.display = 'none';
    succEl.style.display = 'none';
    
    const { ok, data } = await fetchAPI('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ email })
    });
    
    if (ok) {
        succEl.innerText = 'E-Mail erfolgreich geändert.';
        succEl.style.display = 'block';
        if (currentUser) currentUser.email = email;
        updateAuthUI(true);
    } else {
        errEl.innerText = data.error || 'Fehler beim Ändern der E-Mail.';
        errEl.style.display = 'block';
    }
}

// Cloud Sync logic
let currentProjects = {};

function clearToolState(toolName) {
    if (toolName === 'mindmap' && typeof resetMindmapState === 'function') {
        resetMindmapState();
        if (typeof centerViewport === 'function') centerViewport();
    } else if (toolName === 'kanban' && typeof kanbanState !== 'undefined') {
        kanbanState.columns = [
            { id: 'col1', title: 'Aufgaben', cardIds: [] },
            { id: 'col2', title: 'In Bearbeitung', cardIds: [] },
            { id: 'col3', title: 'Erledigt', cardIds: [] }
        ];
        kanbanState.cards = {};
        if (typeof renderKanban === 'function') renderKanban();
        if (typeof saveAppState === 'function') saveAppState();
    } else if (toolName === 'flashcards' && typeof flashcards !== 'undefined') {
        flashcards.length = 0;
        if (typeof renderFlashcardList === 'function') renderFlashcardList();
        if (typeof saveAppState === 'function') saveAppState();
    } else if (toolName === 'entschuldigungen') {
        document.querySelectorAll('#entschuldigung-generator input, #entschuldigung-generator textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        if (typeof checkAbsenceDuration === 'function') checkAbsenceDuration();
    }
}

async function fetchAllCloudProjects() {
    const { ok, data } = await fetchAPI('/api/projects');
    if (!ok) return;

    const projects = data.projects || [];
    currentProjects = {};
    
    // Group by tool
    ['mindmap', 'kanban', 'flashcards', 'entschuldigungen'].forEach(tool => {
        const toolProjects = projects.filter(p => p.tool_name === tool);
        currentProjects[tool] = toolProjects;
        
        const selectEl = document.getElementById(`cloud-dropdown-${tool}`);
        if (!selectEl) return;
        
        // Keep first option
        selectEl.innerHTML = `<option value="">-- Cloud-Projekte --</option>`;
        
        toolProjects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            const dateStr = new Date(p.updated_at).toLocaleString('de-DE');
            opt.innerText = `${p.project_name} (${dateStr})`;
            selectEl.appendChild(opt);
        });

        // Restore last selected project from localStorage
        const lastProjectId = localStorage.getItem(`cloud_last_project_${tool}`);
        if (lastProjectId && toolProjects.some(p => p.id === lastProjectId)) {
            selectEl.value = lastProjectId;
            // Load the data from the cloud to overwrite any stale local state
            loadProjectData(lastProjectId, tool);
        } else {
            selectEl.value = "";
            clearToolState(tool);
        }
    });
}

// Automatically fetch projects when auth updates
const originalUpdateAuthUI = updateAuthUI;
updateAuthUI = function(isLoggedIn) {
    originalUpdateAuthUI(isLoggedIn);
    if (isLoggedIn) {
        fetchAllCloudProjects();
    }
};

async function handleCloudProjectSelect(toolName, projectId) {
    if (!projectId) {
        localStorage.removeItem(`cloud_last_project_${toolName}`);
        clearToolState(toolName);
        return;
    }
    localStorage.setItem(`cloud_last_project_${toolName}`, projectId);
    await loadProjectData(projectId, toolName);
}

async function saveToCloud(toolName, forceNew = false) {
    if (!currentUser) return;
    
    const selectEl = document.getElementById(`cloud-dropdown-${toolName}`);
    const selectedProjectId = selectEl ? selectEl.value : '';
    
    let isNew = forceNew || !selectedProjectId;
    let projectName = null;
    
    if (isNew) {
        projectName = prompt(`Wie soll das neue ${toolName}-Projekt heißen?`);
        if (!projectName) return;
    }
    
    let dataJson = "";
    if (toolName === 'mindmap') {
        const xml = serializeMindmapToXML();
        dataJson = JSON.stringify({ xml });
    } else if (toolName === 'kanban') {
        const xml = generateKanbanXML();
        dataJson = JSON.stringify({ xml });
    } else if (toolName === 'flashcards') {
        const xml = generateFlashcardsXML();
        dataJson = JSON.stringify({ xml });
    } else if (toolName === 'entschuldigungen') {
        const data = getExcuseData();
        data.signature = null;
        dataJson = JSON.stringify(data);
    }
    
    let url = '/api/projects';
    let method = 'POST';
    let bodyObj = { tool_name: toolName, data_json: dataJson };
    
    if (!isNew) {
        url = `/api/projects/${selectedProjectId}`;
        method = 'PUT';
    } else {
        bodyObj.project_name = projectName;
    }
    
    const { ok, data } = await fetchAPI(url, {
        method: method,
        body: JSON.stringify(bodyObj)
    });
    
    if (ok) {
        alert('Erfolgreich in der Cloud gespeichert!');
        const oldId = selectedProjectId;
        await fetchAllCloudProjects();
        let activeId = null;
        if (selectEl) {
            if (isNew && data.id) {
                selectEl.value = data.id;
                activeId = data.id;
            } else if (oldId) {
                selectEl.value = oldId;
                activeId = oldId;
            }
        }
        if (activeId) {
            localStorage.setItem(`cloud_last_project_${toolName}`, activeId);
        }
    } else {
        alert('Fehler beim Speichern: ' + (data.error || 'Unbekannt'));
    }
}

async function renameCloudProject(toolName) {
    if (!currentUser) {
        alert('Bitte melde dich an, um Projekte umzubenennen.');
        return;
    }
    const projectSelect = document.getElementById(`cloud-dropdown-${toolName}`);
    const projectId = projectSelect.value;
    if (!projectId) {
        alert('Bitte wähle zuerst ein Projekt aus, das du umbenennen möchtest.');
        return;
    }
    
    const newName = prompt('Wie soll das Projekt heißen?', projectSelect.options[projectSelect.selectedIndex].text);
    if (!newName || newName.trim() === '') return;
    
    try {
        const { data, ok } = await fetchAPI(`/api/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify({ project_name: newName.trim() })
        });
        
        if (!ok) {
            alert('Fehler beim Umbenennen: ' + (data.error || 'Unbekannter Fehler'));
            return;
        }
        
        await fetchAllCloudProjects();
    } catch (e) {
        console.error(e);
        alert('Ein Fehler ist aufgetreten.');
    }
}

async function deleteCloudProject(toolName) {
    if (!currentUser) {
        alert('Bitte melde dich an, um Projekte zu löschen.');
        return;
    }
    const projectSelect = document.getElementById(`cloud-dropdown-${toolName}`);
    const projectId = projectSelect.value;
    if (!projectId) {
        alert('Bitte wähle zuerst ein Projekt aus, das du löschen möchtest.');
        return;
    }
    
    if (!confirm(`Bist du sicher, dass du "${projectSelect.options[projectSelect.selectedIndex].text}" unwiderruflich löschen möchtest?`)) {
        return;
    }
    
    try {
        const { data, ok } = await fetchAPI(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        if (!ok) {
            alert('Fehler beim Löschen: ' + (data.error || 'Unbekannter Fehler'));
            return;
        }
        
        clearToolState(toolName);
        
        await fetchAllCloudProjects();
    } catch (e) {
        console.error(e);
        alert('Ein Fehler ist aufgetreten.');
    }
}

async function loadProjectData(projectId, toolName) {
    const { ok, data } = await fetchAPI(`/api/projects/${projectId}`);
    if (!ok) {
        alert('Fehler beim Laden des Projekts.');
        return;
    }
    
    const parsedData = JSON.parse(data.project.data_json);
    
    if (toolName === 'mindmap') {
        resetMindmapState();
        parseXML(parsedData.xml);
        fitToScreen();
    } else if (toolName === 'kanban') {
        parseKanbanXML(parsedData.xml);
        renderKanban();
        saveAppState();
    } else if (toolName === 'flashcards') {
        parseFlashcardsXML(parsedData.xml);
        renderFlashcardList();
        saveAppState();
    } else if (toolName === 'entschuldigungen') {
        loadExcuseDataToUI(parsedData);
    }
}

function loadExcuseDataToUI(data) {
    if(data.name) document.getElementById('excuse-name').value = data.name;
    if(data.dob) document.getElementById('excuse-dob').value = data.dob;
    if(data.class) document.getElementById('excuse-class').value = data.class;
    if(data.teacher) document.getElementById('excuse-teacher').value = data.teacher;
    if(data.adult !== undefined) document.getElementById('excuse-adult').checked = data.adult;
    if(data.attest !== undefined) document.getElementById('excuse-attest').checked = data.attest;
    if(data.attestDate) document.getElementById('excuse-attest-date').value = data.attestDate;
    if(data.missedFrom) document.getElementById('excuse-missed-from').value = data.missedFrom;
    if(data.missedTo) document.getElementById('excuse-missed-to').value = data.missedTo;
    if(data.hours) document.getElementById('excuse-hours').value = data.hours;
    if(data.minutes) document.getElementById('excuse-minutes').value = data.minutes;
    if(data.reason) document.getElementById('excuse-reason').value = data.reason;
    if(data.today) document.getElementById('excuse-today').value = data.today;
    
    toggleAttestDate();
    checkAbsenceDuration();
    clearSignature();
}

// Start auth check when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});
