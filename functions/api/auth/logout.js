export async function onRequestPost({ request, env }) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => c.trim().split('='))
        );
        const sessionId = cookies['lerntoolbox_session'];
        if (sessionId) {
            await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
        }
    }
    
    const headers = new Headers();
    headers.append('Set-Cookie', 'lerntoolbox_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    
    return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers 
    });
}
