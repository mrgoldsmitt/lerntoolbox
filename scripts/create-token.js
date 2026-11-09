// scripts/create-token.js
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const email = process.argv[2] || 's_schmidt@outlook.de';
const tokenName = process.argv[3] || 'Antigravity MCP Server';

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSecureToken() {
    const hex = crypto.randomBytes(24).toString('hex');
    return `ltb_sec_${hex}`;
}

async function main() {
    console.log(`Generating API Token for user: ${email}...`);

    // 1. Fetch user ID from remote D1
    const userQuery = `SELECT id FROM users WHERE email='${email}';`;
    const userResultRaw = execSync(
        `npx.cmd wrangler d1 execute lerntoolbox-db --command "${userQuery}" --remote --json`,
        { encoding: 'utf-8' }
    );
    const userParsed = JSON.parse(userResultRaw);
    const users = userParsed[0]?.results || [];

    if (users.length === 0) {
        console.error(`❌ User with email "${email}" not found in D1!`);
        process.exit(1);
    }

    const userId = users[0].id;
    console.log(`Found user_id: ${userId}`);

    const tokenId = crypto.randomUUID();
    const rawToken = generateSecureToken();
    const tokenHash = hashPassword(rawToken);
    const now = new Date().toISOString();

    const insertSql = `INSERT INTO api_tokens (id, user_id, name, token_hash, scopes, created_at) VALUES ('${tokenId}', '${userId}', '${tokenName}', '${tokenHash}', 'kanban:read,kanban:write', '${now}');`;

    console.log('Inserting token hash into remote D1...');
    execSync(
        `npx.cmd wrangler d1 execute lerntoolbox-db --command "${insertSql}" --remote`,
        { encoding: 'utf-8' }
    );

    console.log('\n======================================================');
    console.log('✅ API Token successfully generated and registered!');
    console.log('======================================================');
    console.log(`Token Name: ${tokenName}`);
    console.log(`User:       ${email}`);
    console.log(`Token ID:   ${tokenId}`);
    console.log(`\n🔑 Raw Token (Keep safe!):`);
    console.log(`\n${rawToken}\n`);
    console.log('======================================================');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
