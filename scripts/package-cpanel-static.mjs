import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  console.log('=== VAYANAI CPANEL STATIC PACKAGER ===\n');

  // 1. Export fresh static certificates JSON
  console.log('1. Exporting static certificates database...');
  execSync('node scripts/export-static-data.mjs', { stdio: 'inherit' });

  // 2. Ensure Next.js build runs with output: export
  console.log('\n2. Building static HTML export (Next.js 15)...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_STATIC: 'true' }
  });

  const outDir = path.resolve(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) {
    console.error('Error: "out" directory was not generated!');
    process.exit(1);
  }

  // 3. Create .htaccess for cPanel Apache
  console.log('\n3. Creating Apache .htaccess configuration for cPanel...');
  const htaccessContent = `# ====================================================================
# Apache Configuration for Vayanai Static Export on cPanel
# ====================================================================

Options -MultiViews
RewriteEngine On
RewriteBase /

# 1. Custom 404 Error page
ErrorDocument 404 /404.html

# 2. Cache headers for static Next.js assets (_next/static)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType application/json "access plus 1 hour"
</IfModule>

# 3. Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# 4. If requested directory or file exists, serve it
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# 5. Clean URLs: if /route is requested, check if /route/index.html or /route.html exists
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{DOCUMENT_ROOT}/$1/index.html -f
RewriteRule ^(.*)/?$ $1/index.html [L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^(.*)/?$ $1.html [L]
`;

  fs.writeFileSync(path.join(outDir, '.htaccess'), htaccessContent, 'utf-8');
  console.log('✓ Created out/.htaccess');

  // 4. Compress out/ into cpanel-public_html.zip
  console.log('\n4. Compressing static build into cpanel-public_html.zip for FileZilla...');
  const zipPath = path.resolve(process.cwd(), 'cpanel-public_html.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Use powershell Compress-Archive for zero external dependency on Windows
  execSync(`powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });

  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`✓ SUCCESS: ${zipPath} created! (${sizeMB} MB)`);
  console.log(`======================================================`);
  console.log(`Next Step:`);
  console.log(`1. Open FileZilla and connect to your cPanel hosting.`);
  console.log(`2. Navigate to "public_html" on the remote side.`);
  console.log(`3. Upload "cpanel-public_html.zip".`);
  console.log(`4. In cPanel File Manager, right-click and click "Extract".`);
  console.log(`5. Your website is immediately LIVE at your domain!`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
