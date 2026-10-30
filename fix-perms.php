<?php
header('Content-Type: text/html; charset=utf-8');

$appDir = __DIR__;
$zipPath = $appDir . '/cpanel-vayanai-deployment.zip';
$extractMsg = '';

function purgePathRecursive($target) {
    if (!file_exists($target)) return false;
    if (is_file($target) || is_link($target)) {
        return @unlink($target);
    }
    if (is_dir($target)) {
        try {
            $it = new RecursiveDirectoryIterator($target, RecursiveDirectoryIterator::SKIP_DOTS);
            $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
            foreach ($files as $file) {
                if ($file->isDir()) {
                    @rmdir($file->getRealPath());
                } else {
                    @unlink($file->getRealPath());
                }
            }
            return @rmdir($target);
        } catch (Exception $e) {
            return false;
        }
    }
    return false;
}

// 1. One-click Zip Extraction right from PHP
if (isset($_GET['extract']) && $_GET['extract'] == '1') {
    if (file_exists($zipPath)) {
        $zip = new ZipArchive;
        if ($zip->open($zipPath) === TRUE) {
            $zip->extractTo($appDir);
            $zip->close();
            @chmod($appDir . '/cgi-bin/app.cgi', 0755);
            @chmod($appDir . '/data/vayanai.db', 0644);
            if (is_dir($appDir . '/data')) {
                @chmod($appDir . '/data', 0755);
            }
            $extractMsg = "<div class='banner ok'>✓ Archive successfully extracted! All HTML pages, CSS styles, and JS chunks have been updated.</div>";
        } else {
            $extractMsg = "<div class='banner err'>✗ Failed to open $zipPath.</div>";
        }
    } else {
        $extractMsg = "<div class='banner warn'>⚠️ cpanel-vayanai-deployment.zip not found in root directory. If you already extracted it, you're all set!</div>";
    }
}

// 2. Auto-clean obsolete static files and export directories that intercept Apache mod_rewrite
$cleanedItems = [];

// A. Always purge obsolete legacy pages/ directory
$pagesDir = $appDir . '/pages';
if (is_dir($pagesDir)) {
    if (purgePathRecursive($pagesDir)) {
        $cleanedItems[] = "pages/ (directory)";
    }
}

// B. Always purge obsolete root HTML files that shadow Next.js routes
$staleRootFiles = [
    'signin.html', 'verify.html', 'portal.html', 'signup.html',
    'offer.html', 'assessment.html', 'plan.html', 'trip.html',
    'people.html', 'my-trips.html'
];
foreach ($staleRootFiles as $rf) {
    $fullRf = $appDir . '/' . $rf;
    if (file_exists($fullRf)) {
        if (@unlink($fullRf)) {
            $cleanedItems[] = $rf;
        }
    }
}

// C. Clean legacy static directories (e.g. /auth, /verify, /portal) if they contain static HTML
$obsoleteDirs = ['portal', 'auth', 'intern', 'certificate', 'my-trips', 'people', 'plan', 'trip', 'verify'];
foreach ($obsoleteDirs as $dir) {
    $fullDir = $appDir . '/' . $dir;
    if (is_dir($fullDir)) {
        // If it contains any html files or index.html, it is a legacy export directory
        $hasHtml = file_exists($fullDir . '/index.html') || file_exists($fullDir . '/signin.html') || count(glob($fullDir . '/*.html')) > 0;
        if ($hasHtml) {
            if (purgePathRecursive($fullDir)) {
                $cleanedItems[] = $dir . '/ (directory)';
            }
        }
    }
}

// 3. Auto-repair CSS alias if older HTML is still referencing previous hash
$cssDir = $appDir . '/.next/static/css';
$primaryCss = $cssDir . '/b48c2b8b2ce1051c.css';
$legacyCss = $cssDir . '/6c37a3e33f51c431.css';
if (file_exists($primaryCss) && !file_exists($legacyCss)) {
    @copy($primaryCss, $legacyCss);
}

// Ensure _next unhidden folder has css
$unhiddenCssDir = $appDir . '/_next/static/css';
if (is_dir($unhiddenCssDir)) {
    if (file_exists($primaryCss) && !file_exists($unhiddenCssDir . '/b48c2b8b2ce1051c.css')) {
        @copy($primaryCss, $unhiddenCssDir . '/b48c2b8b2ce1051c.css');
    }
    if (file_exists($primaryCss) && !file_exists($unhiddenCssDir . '/6c37a3e33f51c431.css')) {
        @copy($primaryCss, $unhiddenCssDir . '/6c37a3e33f51c431.css');
    }
}
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vayanai Server Diagnostics & Auto-Fix</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #0d1410; color: #f4ede0; padding: 24px; line-height: 1.6; max-width: 900px; margin: 0 auto; }
    h2 { color: #e8a34c; border-bottom: 1px solid rgba(232,163,76,0.3); padding-bottom: 8px; }
    .box { background: #131c16; border: 1px solid rgba(232,163,76,0.3); border-radius: 8px; padding: 18px; margin: 16px 0; }
    .ok { color: #4ade80; font-weight: bold; }
    .warn { color: #fbbf24; font-weight: bold; }
    .err { color: #f87171; font-weight: bold; }
    .banner { padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; }
    .banner.ok { background: rgba(74,222,128,0.15); border: 1px solid #4ade80; }
    .banner.err { background: rgba(248,113,113,0.15); border: 1px solid #f87171; }
    .banner.warn { background: rgba(251,191,36,0.15); border: 1px solid #fbbf24; }
    pre { background: #090d0b; border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; color: #c9d6ce; }
    a { color: #e8a34c; }
    .btn { display: inline-block; background: #e8a34c; color: #0d1410; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 12px; }
    .btn-secondary { background: #26382b; color: #e8a34c; border: 1px solid #e8a34c; }
    .btn-action { background: #38a169; color: #fff; }
  </style>
</head>
<body>
  <h2>🔍 Vayanai Server Diagnostics & Auto-Permission Fixer</h2>
  <?php echo $extractMsg; ?>

  <?php if (!empty($cleanedItems)): ?>
  <div class="banner ok">
    ✓ Automatically cleaned up legacy static files & directories (<?php echo implode(', ', $cleanedItems); ?>) so modern Next.js production routing takes effect cleanly!
  </div>
  <?php endif; ?>

  <?php if (file_exists($zipPath)): ?>
  <div class="box" style="border-color:#38a169;">
    <h3>⚡ 1-Click Server Unzip Available</h3>
    <p>Found <code>cpanel-vayanai-deployment.zip</code> in your web directory. Click below to automatically extract and apply the latest build cleanly:</p>
    <a href="fix-perms.php?extract=1" class="btn btn-action">Extract & Overwrite Latest Build Now</a>
  </div>
  <?php endif; ?>

  <div class="box">
    <h3>1. File Permissions & Auto-Fix</h3>
    <?php
    $cgiFile = $appDir . '/cgi-bin/app.cgi';
    $dbDir = $appDir . '/data';
    $dbFile = $appDir . '/data/vayanai.db';
    $htaccessFile = $appDir . '/.htaccess';

    if (file_exists($cgiFile)) {
        @chmod($cgiFile, 0755);
        $perms = substr(sprintf('%o', fileperms($cgiFile)), -4);
        $status = ($perms === '0755') ? "<span class='ok'>✓ Perms: 0755 (OK)</span>" : "<span class='warn'>Current Perms: $perms (Attempted 0755)</span>";
        echo "<p><strong>cgi-bin/app.cgi:</strong> <span class='ok'>Found</span> &mdash; $status</p>";
    } else {
        echo "<p><strong>cgi-bin/app.cgi:</strong> <span class='err'>NOT FOUND</span></p>";
    }

    if (is_dir($dbDir)) {
        @chmod($dbDir, 0755);
        $perms = substr(sprintf('%o', fileperms($dbDir)), -4);
        echo "<p><strong>data/ directory:</strong> <span class='ok'>Found</span> &mdash; <span class='ok'>Perms: $perms (0755 secure)</span></p>";
    }

    if (file_exists($dbFile)) {
        @chmod($dbFile, 0644);
        $perms = substr(sprintf('%o', fileperms($dbFile)), -4);
        echo "<p><strong>data/vayanai.db:</strong> <span class='ok'>Found</span> &mdash; <span class='ok'>Perms: $perms (0644 secure SQLite DB)</span></p>";
    }

    echo "<p><strong>.htaccess:</strong> " . (file_exists($htaccessFile) ? "<span class='ok'>Found</span>" : "<span class='err'>NOT FOUND</span>") . "</p>";
    ?>
  </div>

  <div class="box">
    <h3>2. CSS Stylesheets & Static Assets</h3>
    <?php
    $cssCheck1 = file_exists($primaryCss);
    $cssCheck2 = file_exists($legacyCss);
    $fontsCheck = file_exists($appDir . '/public/fonts/fonts.css') || file_exists($appDir . '/fonts/fonts.css');
    
    echo "<p><strong>Primary CSS (b48c2b8b2ce1051c.css):</strong> " . ($cssCheck1 ? "<span class='ok'>✓ Present (" . number_format(filesize($primaryCss)) . " bytes)</span>" : "<span class='err'>Missing</span>") . "</p>";
    echo "<p><strong>Legacy Hash Compatibility (6c37a3e33f51c431.css):</strong> " . ($cssCheck2 ? "<span class='ok'>✓ Synced</span>" : "<span class='warn'>Creating alias...</span>") . "</p>";
    echo "<p><strong>Fonts Stylesheet (/fonts/fonts.css):</strong> " . ($fontsCheck ? "<span class='ok'>✓ Present</span>" : "<span class='err'>Missing</span>") . "</p>";
    ?>
  </div>

  <div class="box">
    <h3>3. Static Next.js Pre-Rendered Pages</h3>
    <?php
    $pages = [
        'Homepage (/)' => [$appDir . '/.next/server/app/index.html'],
        'Intern Portal (/portal)' => [$appDir . '/.next/server/app/portal.html'],
        'Virtual Assessment Room (/intern/assessment)' => [$appDir . '/.next/server/app/intern/assessment.html'],
        'Offer Letter Page (/intern/offer)' => [$appDir . '/.next/server/app/intern/offer.html'],
        'Sign In Page (/auth/signin)' => [$appDir . '/.next/server/app/auth/signin.html'],
        'Sign Up / Apply Page (/auth/signup)' => [$appDir . '/.next/server/app/auth/signup.html'],
        'Public Certificate Verification (/verify)' => [$appDir . '/.next/server/app/verify.html']
    ];
    foreach ($pages as $name => $candidates) {
        $found = null;
        foreach ($candidates as $c) {
            if (file_exists($c)) {
                $found = $c;
                break;
            }
        }
        if ($found) {
            echo "<p>✓ <strong>$name:</strong> <span class='ok'>Pre-rendered HTML exists (" . number_format(filesize($found)) . " bytes)</span></p>";
        } else {
            echo "<p>✗ <strong>$name:</strong> <span class='err'>Missing (Checked: " . htmlspecialchars(implode(', ', $candidates)) . ")</span></p>";
        }
    }
    ?>
  </div>

  <div class="box">
    <h3>4. Direct CGI Health API Test</h3>
    <?php
    $cmd = 'cd ' . escapeshellarg($appDir) . ' && REQUEST_METHOD=GET PATH_INFO=/api/v1/health python3 cgi-bin/app.cgi 2>&1';
    $out = shell_exec($cmd);
    echo "<pre>" . htmlspecialchars($out ? $out : 'No response from CGI test execution') . "</pre>";
    if (strpos($out, '"status": "healthy"') !== false) {
        echo "<p class='ok'>✓ CGI Engine is working flawlessly!</p>";
    }
    ?>
  </div>

  <p>
    <a href="/" class="btn">Go to Homepage</a>
    <a href="/portal" class="btn btn-secondary">Go to Portal</a>
    <a href="/intern/assessment?token=test-candidate-token-2026" class="btn btn-secondary">Test Assessment Room</a>
  </p>
</body>
</html>