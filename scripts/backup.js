// scripts/backup.js
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const version = '0.11.0';
const backupDir = 'L:\\SynologyDrive\\Office\\Arbeit\\01 Schule\\01 Unterrichtsmaterial\\Lerntoolbox\\1 Mit Backend';
const targetZip = path.join(backupDir, `lerntoolbox_backup v.${version}.zip`);

console.log(`Creating Synology backup for version v${version}...`);
console.log(`Target: ${targetZip}`);

if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup destination folder does not exist: ${backupDir}`);
    process.exit(1);
}

// Parent folder is C:\Projekte\Lerntoolbox
const parentDir = 'C:\\Projekte\\Lerntoolbox';
const cmd = `tar -a -c -f "${targetZip}" --exclude="lerntoolbox/.git" --exclude="lerntoolbox/.wrangler" --exclude="lerntoolbox/.vscode" lerntoolbox`;

console.log('Running archive command...');
execSync(cmd, { cwd: parentDir, stdio: 'inherit' });

if (fs.existsSync(targetZip)) {
    const stats = fs.statSync(targetZip);
    console.log(`✅ Backup successfully created! Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.error('❌ Failed to find created backup zip.');
    process.exit(1);
}
