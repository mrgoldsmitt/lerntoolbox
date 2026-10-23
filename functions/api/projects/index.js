import { getSession, generateId } from '../utils.js';

export async function onRequestGet({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
        
        const url = new URL(request.url);
        const toolName = url.searchParams.get('tool');
        
        let query = 'SELECT id, tool_name, project_name, updated_at FROM projects WHERE user_id = ?';
        let params = [userId];
        
        if (toolName) {
            query += ' AND tool_name = ?';
            params.push(toolName);
        }
        
        query += ' ORDER BY updated_at DESC';
        
        const { results } = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify({ projects: results }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
        
        const { tool_name, project_name, data_json } = await request.json();
        
        if (!tool_name || !project_name || !data_json) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten' }), { status: 400 });
        }
        
        const projectId = generateId();
        const now = new Date().toISOString();
        
        await env.DB.prepare('INSERT INTO projects (id, user_id, tool_name, project_name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(projectId, userId, tool_name, project_name, data_json, now, now)
            .run();
            
        return new Response(JSON.stringify({ success: true, id: projectId }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
