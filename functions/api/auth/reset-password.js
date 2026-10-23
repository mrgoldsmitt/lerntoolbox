import { hashPassword } from '../utils.js';

export async function onRequestPost({ request, env }) {
    try {
        const { email, birth_date, new_password } = await request.json();
        
        if (!email || !birth_date || !new_password || new_password.length < 6) {
            return new Response(JSON.stringify({ error: 'Ungültige Eingaben. Bitte E-Mail, Geburtsdatum und neues Passwort (min. 6 Zeichen) angeben.' }), { status: 400 });
        }
        
        // Find user by email and birth_date
        const { results } = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND birth_date = ?')
            .bind(email, birth_date)
            .all();
            
        if (results.length === 0) {
            // Do not reveal whether email or birth date is wrong for security
            return new Response(JSON.stringify({ error: 'Die Kombination aus E-Mail und Geburtsdatum ist ungültig.' }), { status: 400 });
        }
        
        const userId = results[0].id;
        const hash = await hashPassword(new_password);
        
        // Update password
        await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            .bind(hash, userId)
            .run();
            
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
