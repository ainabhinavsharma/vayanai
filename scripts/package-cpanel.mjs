import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  console.log('================================================================');
  console.log('     VAYANAI CPANEL CGI-BIN PRODUCTION PACKAGER (NO NODE APP)   ');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const zipPath = path.join(rootDir, 'cpanel-vayanai-deployment.zip');
  const deployDir = path.join(rootDir, 'cpanel_deploy');

  // 1. Build Production Next.js Bundle
  console.log('[1/5] Compiling production Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Checkpoint SQLite Database WAL before copying
  console.log('\n[2/5] Checkpointing SQLite WAL into main database...');
  try {
    execSync(`node -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync('data/vayanai.db'); db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); db.close();"`);
    console.log('  -> SQLite vayanai.db WAL cleanly truncated.');
  } catch (e) {
    console.warn('  -> Note on SQLite checkpoint:', e.message);
  }

  // 3. Prepare Clean Deployment Folder
  console.log('\n[3/5] Preparing clean deployment folder (cpanel_deploy)...');
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }
  fs.mkdirSync(deployDir, { recursive: true });

  // Helper to copy directory recursively
  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        copyRecursive(path.join(src, item), path.join(dest, item));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  // 4. Copy Production Artifacts to cpanel_deploy
  console.log('\n[4/5] Copying CGI and server artifacts into cpanel_deploy...');
  
  // cgi-bin
  console.log('  -> Copying cgi-bin runner (app.cgi)...');
  copyRecursive(path.join(rootDir, 'cgi-bin'), path.join(deployDir, 'cgi-bin'));

  // Ensure app.cgi has Unix LF line endings
  const appCgiPath = path.join(deployDir, 'cgi-bin', 'app.cgi');
  if (fs.existsSync(appCgiPath)) {
    let cgiContent = fs.readFileSync(appCgiPath, 'utf-8');
    cgiContent = cgiContent.replace(/\r\n/g, '\n');
    fs.writeFileSync(appCgiPath, cgiContent, { encoding: 'utf-8', mode: 0o755 });
  }

  // Apache .htaccess
  console.log('  -> Copying Apache .htaccess for CGI routing...');
  fs.copyFileSync(path.join(rootDir, '.htaccess'), path.join(deployDir, '.htaccess'));

  // .next bundle
  console.log('  -> Copying .next production bundle...');
  copyRecursive(path.join(rootDir, '.next'), path.join(deployDir, '.next'));

  // public assets
  console.log('  -> Copying public assets...');
  copyRecursive(path.join(rootDir, 'public'), path.join(deployDir, 'public'));

  // SQLite data store (only clean .db and csv files, exclude temporary shm/wal)
  console.log('  -> Copying SQLite data store...');
  fs.mkdirSync(path.join(deployDir, 'data'), { recursive: true });
  fs.copyFileSync(path.join(rootDir, 'data', 'vayanai.db'), path.join(deployDir, 'data', 'vayanai.db'));
  if (fs.existsSync(path.join(rootDir, 'data', 'interns_batch_oct2026.csv'))) {
    fs.copyFileSync(path.join(rootDir, 'data', 'interns_batch_oct2026.csv'), path.join(deployDir, 'data', 'interns_batch_oct2026.csv'));
  }
  if (fs.existsSync(path.join(rootDir, 'data', 'sample_past_interns.csv'))) {
    fs.copyFileSync(path.join(rootDir, 'data', 'sample_past_interns.csv'), path.join(deployDir, 'data', 'sample_past_interns.csv'));
  }

  // Startup script & configuration files
  console.log('  -> Copying startup scripts & configs...');
  fs.copyFileSync(path.join(rootDir, 'server.cjs'), path.join(deployDir, 'server.cjs'));
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(deployDir, 'package.json'));
  if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
    fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(deployDir, 'package-lock.json'));
  }
  if (fs.existsSync(path.join(rootDir, '.env.production.sample'))) {
    fs.copyFileSync(path.join(rootDir, '.env.production.sample'), path.join(deployDir, '.env.production.sample'));
    // Also provide a ready .env inside cpanel_deploy
    fs.copyFileSync(path.join(rootDir, '.env.production.sample'), path.join(deployDir, '.env'));
  }
  if (fs.existsSync(path.join(rootDir, 'CPANEL_DEPLOYMENT_GUIDE.md'))) {
    fs.copyFileSync(path.join(rootDir, 'CPANEL_DEPLOYMENT_GUIDE.md'), path.join(deployDir, 'CPANEL_DEPLOYMENT_GUIDE.md'));
  }
  if (fs.existsSync(path.join(rootDir, 'DEPLOYMENT_CHECKLIST.md'))) {
    fs.copyFileSync(path.join(rootDir, 'DEPLOYMENT_CHECKLIST.md'), path.join(deployDir, 'DEPLOYMENT_CHECKLIST.md'));
  }
  if (fs.existsSync(path.join(rootDir, 'qrcode.jpeg'))) {
    console.log('  -> Copying root payment QR code (qrcode.jpeg)...');
    fs.copyFileSync(path.join(rootDir, 'qrcode.jpeg'), path.join(deployDir, 'qrcode.jpeg'));
  }
  if (fs.existsSync(path.join(rootDir, 'fix-perms.php'))) {
    console.log('  -> Copying cPanel permissions utility (fix-perms.php)...');
    fs.copyFileSync(path.join(rootDir, 'fix-perms.php'), path.join(deployDir, 'fix-perms.php'));
  }

  // Add explicit FileZilla CGI Instructions text file inside the folder
  const filezillaReadme = `================================================================
VAYANAI CPANEL CGI-BIN DEPLOYMENT FOLDER (NO "NODE.JS APP" REQUIRED)
================================================================

This package is designed to run on standard cPanel shared hosting using
traditional cgi-bin and Apache .htaccess without needing CloudLinux "Setup Node.js App".

FOLDER CONTENTS TO UPLOAD TO "public_html/":
- cgi-bin/app.cgi        -> CGI Application Runner (chmod 755)
- .htaccess              -> Apache router directing requests to cgi-bin/app.cgi
- .next/                 -> Compiled Next.js production server & static assets
- public/                -> Brand logos, certificates, images & fonts
- data/vayanai.db        -> SQLite database pre-seeded with admin & candidate models
- server.cjs             -> Next.js Production Engine
- package.json           -> Production package definitions
- package-lock.json      -> Exact dependency lockfile
- .env                   -> Production environment variables (SMTP, DB path, URL)

HOW TO UPLOAD USING FILEZILLA:

METHOD A (RECOMMENDED - 1-CLICK ZIP UPLOAD):
1. In FileZilla, connect to your cPanel host.
2. In the right pane (remote server), go to "/public_html".
3. Upload "cpanel-vayanai-deployment.zip" (located in this folder).
4. In cPanel -> File Manager, right-click "cpanel-vayanai-deployment.zip" and click "Extract".
5. In File Manager, right-click "cgi-bin/app.cgi" -> "Change Permissions" -> set to 755.
6. Done! Your site is live at https://yourdomain.com!

METHOD B (DIRECT DRAG & DROP IN FILEZILLA):
1. In FileZilla top menu, click "Server" -> check "Force showing hidden files".
   (CRITICAL: Otherwise FileZilla skips ".next" and ".htaccess"!).
2. In FileZilla left pane, open this "cpanel_deploy" folder.
3. Select ALL files and folders inside it.
4. Drag and drop them directly into "/public_html" on the right.
5. In cPanel File Manager, make sure "cgi-bin/app.cgi" has permissions 755.

HOW IT WORKS:
Apache reads .htaccess and sends all dynamic web traffic to cgi-bin/app.cgi.
app.cgi automatically runs server.cjs using the server's Node binary and proxies
traffic instantly, giving you the full React UI, virtual interview, and 5-stage emails!
================================================================
`;
  fs.writeFileSync(path.join(deployDir, 'FILEZILLA_INSTRUCTIONS.txt'), filezillaReadme, 'utf-8');

  // 5. Zip generation is skipped by default (per user request to upload directly from cpanel_deploy/)
  const shouldCreateZip = process.argv.includes('--zip');
  if (shouldCreateZip) {
    console.log('\n[5/5] Compressing into cpanel-vayanai-deployment.zip (--zip flag detected)...');
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    execSync(
      `powershell -Command "Compress-Archive -Path '${deployDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    );
    fs.copyFileSync(zipPath, path.join(deployDir, 'cpanel-vayanai-deployment.zip'));
    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  -> Zip generated: ${sizeMB} MB`);
  } else {
    console.log('\n[5/5] Skipping zip creation (direct folder upload mode enabled).');
    // Remove internal zip from deployDir if it was left over from a previous build
    const internalZip = path.join(deployDir, 'cpanel-vayanai-deployment.zip');
    if (fs.existsSync(internalZip)) {
      fs.unlinkSync(internalZip);
    }
  }

  console.log('\n================================================================');
  console.log(`✓ CPANEL DEPLOYMENT FOLDER UPDATED & READY!`);
  console.log(`  Folder: ${deployDir}`);
  console.log(`  Target: Upload all contents of cpanel_deploy/ directly to public_html/ in FileZilla`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
