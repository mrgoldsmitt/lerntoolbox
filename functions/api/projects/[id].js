import { getSession } from '../utils.js';

export async function onRequestGet({ request, env, params }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
        
        const { id } = params;
        
        const { results } = await env.DB.prepare('SELECT tool_name, project_name, data_json, updated_at FROM projects WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .all();
            
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: 'Projekt nicht gefunden' }), { status: 404 });
        }
        
        return new Response(JSON.stringify({ project: results[0] }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env, params }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
        
        const { id } = params;
        const { data_json, project_name } = await request.json();
        
        let query = 'UPDATE projects SET updated_at = ?';
        let queryParams = [new Date().toISOString()];
        
        if (data_json) {
            query += ', data_json = ?';
            queryParams.push(data_json);
        }
        if (project_name) {
            query += ', project_name = ?';
            queryParams.push(project_name);
        }
        
        query += ' WHERE id = ? AND user_id = ?';
        queryParams.push(id, userId);
        
        const info = await env.DB.prepare(query).bind(...queryParams).run();
        
        if (info.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Projekt nicht gefunden oder keine Berechtigung' }), { status: 404 });
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete({ request, env, params }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
        
        const { id } = params;
        
        const info = await env.DB.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .run();
            
        if (info.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Projekt nicht gefunden oder keine Berechtigung' }), { status: 404 });
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
