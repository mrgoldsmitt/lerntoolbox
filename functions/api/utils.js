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

export function generateSecureToken() {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    return `ltb_sec_${hex}`;
}

export async function getSession(request, env) {
    // 1. Check Authorization Bearer header (for MCP & API access)
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
            const tokenHash = await hashPassword(token);
            const { results } = await env.DB.prepare(
                'SELECT id, user_id, expires_at FROM api_tokens WHERE token_hash = ?'
            ).bind(tokenHash).all();

            if (results && results.length > 0) {
                const apiToken = results[0];
                if (!apiToken.expires_at || new Date(apiToken.expires_at) > new Date()) {
                    // Update last_used_at (non-blocking)
                    try {
                        await env.DB.prepare('UPDATE api_tokens SET last_used_at = ? WHERE id = ?')
                            .bind(new Date().toISOString(), apiToken.id).run();
                    } catch (_) {}
                    return apiToken.user_id;
                }
            }
        }
        return null;
    }

    // 2. Check Cookie (for Web Application sessions)
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
