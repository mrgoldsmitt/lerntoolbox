// functions/api/utils.js

export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateId() {
    return crypto.randomUUID();
}

export async function getSession(request, env) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;
    
    const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => c.trim().split('='))
    );
    const sessionId = cookies['lerntoolbox_session'];
    if (!sessionId) return null;

    const { results } = await env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?')
        .bind(sessionId)
        .all();
        
    if (results.length === 0) return null;
    
    const session = results[0];
    if (new Date(session.expires_at) < new Date()) {
        await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
        return null;
    }
    
    return session.user_id;
}
