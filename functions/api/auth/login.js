import { hashPassword, generateId } from '../utils.js';

export async function onRequestPost({ request, env }) {
    try {
        const { email, password } = await request.json();
        
        const hash = await hashPassword(password);
        const { results } = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND password_hash = ?')
            .bind(email, hash)
            .all();
            
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: 'Falsche E-Mail oder Passwort' }), { status: 401 });
        }
        
        const userId = results[0].id;
        const sessionId = generateId();
        
        // Expiration in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, userId, expiresAt.toISOString())
            .run();
            
        const headers = new Headers();
        headers.append('Set-Cookie', `lerntoolbox_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}`);
        
        return new Response(JSON.stringify({ success: true, user: { email } }), { 
            status: 200,
            headers 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
