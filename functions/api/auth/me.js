import { getSession } from '../utils.js';

export async function onRequestGet({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) {
            return new Response(JSON.stringify({ user: null }), { status: 200 });
        }
        
        const { results } = await env.DB.prepare('SELECT email, theme FROM users WHERE id = ?')
            .bind(userId)
            .all();
            
        if (results.length === 0) {
            return new Response(JSON.stringify({ user: null }), { status: 200 });
        }
        
        return new Response(JSON.stringify({ user: { email: results[0].email, theme: results[0].theme } }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
        }
        
        const body = await request.json();
        
        if (body.theme !== undefined) {
            await env.DB.prepare('UPDATE users SET theme = ? WHERE id = ?')
                .bind(body.theme, userId)
                .run();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        
        const { email } = body;
        
        if (!email) {
            return new Response(JSON.stringify({ error: 'E-Mail darf nicht leer sein' }), { status: 400 });
        }
        
        // Check if new email is already taken by another user
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
            .bind(email, userId)
            .all();
            
        if (existing.results.length > 0) {
            return new Response(JSON.stringify({ error: 'Diese E-Mail wird bereits verwendet' }), { status: 400 });
        }
        
        await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?')
            .bind(email, userId)
            .run();
            
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
