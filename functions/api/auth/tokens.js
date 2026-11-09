// functions/api/auth/tokens.js
import { getSession, generateId, generateSecureToken, hashPassword } from '../utils.js';

export async function onRequestGet({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });

        const { results } = await env.DB.prepare(
            'SELECT id, name, scopes, created_at, expires_at, last_used_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all();

        return new Response(JSON.stringify({ tokens: results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });

        const body = await request.json().catch(() => ({}));
        const name = (body.name || 'API Token').trim().slice(0, 100);
        const scopes = body.scopes || 'kanban:read,kanban:write';
        const expiresInDays = parseInt(body.expires_in_days, 10);

        const tokenId = generateId();
        const rawToken = generateSecureToken();
        const tokenHash = await hashPassword(rawToken);
        const now = new Date().toISOString();

        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + expiresInDays);
            expiresAt = expDate.toISOString();
        }

        await env.DB.prepare(
            'INSERT INTO api_tokens (id, user_id, name, token_hash, scopes, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(tokenId, userId, name, tokenHash, scopes, now, expiresAt).run();

        return new Response(JSON.stringify({
            success: true,
            token: rawToken,
            token_id: tokenId,
            name: name,
            scopes: scopes,
            created_at: now,
            expires_at: expiresAt
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const userId = await getSession(request, env);
        if (!userId) return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });

        const url = new URL(request.url);
        let tokenId = url.searchParams.get('id');

        if (!tokenId) {
            const body = await request.json().catch(() => ({}));
            tokenId = body.id;
        }

        if (!tokenId) {
            return new Response(JSON.stringify({ error: 'Token-ID erforderlich' }), { status: 400 });
        }

        const info = await env.DB.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?')
            .bind(tokenId, userId)
            .run();

        if (info.meta && info.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Token nicht gefunden' }), { status: 404 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
