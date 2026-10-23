import { hashPassword, generateId } from '../utils.js';

export async function onRequestPost({ request, env }) {
    try {
        const { email, password, birth_date } = await request.json();
        
        if (!email || !password || password.length < 6 || !birth_date) {
            return new Response(JSON.stringify({ error: 'Ungültige Eingaben. Bitte E-Mail, Passwort (min. 6 Zeichen) und Geburtsdatum angeben.' }), { status: 400 });
        }
        
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).all();
        if (existing.results.length > 0) {
            return new Response(JSON.stringify({ error: 'Benutzer existiert bereits' }), { status: 400 });
        }
        
        const userId = generateId();
        const hash = await hashPassword(password);
        
        await env.DB.prepare('INSERT INTO users (id, email, password_hash, birth_date) VALUES (?, ?, ?, ?)')
            .bind(userId, email, hash, birth_date)
            .run();
            
        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
