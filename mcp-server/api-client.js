// mcp-server/api-client.js

export class LerntoolboxClient {
    constructor({ baseUrl, token }) {
        this.baseUrl = (baseUrl || 'https://lerntoolbox.mrgoldsmitt.work').replace(/\/+$/, '');
        this.token = token;

        if (!this.token) {
            throw new Error('LERNDTOOLBOX_API_TOKEN ist nicht gesetzt. Bitte erstelle ein Token und setze die Umgebungsvariable.');
        }
    }

    async _request(path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const res = await fetch(url, {
            ...options,
            headers
        });

        if (!res.ok) {
            let errorMsg = `HTTP ${res.status} ${res.statusText}`;
            try {
                const data = await res.json();
                if (data.error) errorMsg += `: ${data.error}`;
            } catch (_) {}
            throw new Error(`API Fehler bei ${path}: ${errorMsg}`);
        }

        return res.json();
    }

    async listKanbanProjects() {
        const data = await this._request('/api/projects?tool=kanban');
        return data.projects || [];
    }

    async getProject(projectId) {
        const data = await this._request(`/api/projects/${encodeURIComponent(projectId)}`);
        return data.project;
    }

    async createProject(name, dataJson) {
        return this._request('/api/projects', {
            method: 'POST',
            body: JSON.stringify({
                tool_name: 'kanban',
                project_name: name,
                data_json: dataJson
            })
        });
    }

    async updateProject(projectId, { project_name, data_json }) {
        const body = {};
        if (project_name !== undefined) body.project_name = project_name;
        if (data_json !== undefined) body.data_json = data_json;

        return this._request(`/api/projects/${encodeURIComponent(projectId)}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    async deleteProject(projectId) {
        return this._request(`/api/projects/${encodeURIComponent(projectId)}`, {
            method: 'DELETE'
        });
    }

    async resolveKanbanProject(boardIdentifier) {
        if (!boardIdentifier) {
            throw new Error('Kein Board-Name oder keine Board-ID angegeben.');
        }

        const query = String(boardIdentifier).trim();
        const projects = await this.listKanbanProjects();

        // 1. Direct ID match
        let project = projects.find(p => p.id === query);
        if (project) return project;

        // 2. Exact name match (case-insensitive)
        project = projects.find(p => p.project_name.toLowerCase() === query.toLowerCase());
        if (project) return project;

        // 3. Substring name match
        const matches = projects.filter(p => p.project_name.toLowerCase().includes(query.toLowerCase()));
        if (matches.length === 1) {
            return matches[0];
        } else if (matches.length > 1) {
            const names = matches.map(m => `"${m.project_name}"`).join(', ');
            throw new Error(`Board-Name "${query}" ist mehrdeutig. Gefundene Boards: ${names}. Bitte genauer angeben.`);
        }

        const available = projects.map(p => `"${p.project_name}"`).join(', ');
        throw new Error(`Board "${query}" nicht gefunden. Verfügbare Boards: ${available || 'Keine'}`);
    }
}
