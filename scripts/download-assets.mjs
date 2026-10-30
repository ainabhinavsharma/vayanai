import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const fontsDir = path.resolve('public/fonts');
const destImagesDir = path.resolve('public/images/destinations');
const catImagesDir = path.resolve('public/images/categories');

fs.mkdirSync(fontsDir, { recursive: true });
fs.mkdirSync(destImagesDir, { recursive: true });
fs.mkdirSync(catImagesDir, { recursive: true });

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
    console.log(`Already exists: ${path.basename(destPath)}`);
    return;
  }
  console.log(`Downloading ${url} -> ${path.basename(destPath)}...`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const fileStream = fs.createWriteStream(destPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  console.log(`Saved: ${destPath} (${fs.statSync(destPath).size} bytes)`);
}

// 1. Fonts to download
const fontFiles = [
  {
    name: 'dm-sans-400.woff2',
    url: 'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  },
  {
    name: 'dm-sans-500.woff2',
    url: 'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  },
  {
    name: 'dm-sans-600.woff2',
    url: 'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  },
  {
    name: 'dm-sans-700.woff2',
    url: 'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  },
  {
    name: 'playfair-display-500.woff2',
    url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2',
  },
  {
    name: 'playfair-display-600.woff2',
    url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2',
  },
  {
    name: 'playfair-display-500-italic.woff2',
    url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFkD-vYSZviVYUb_rj3ij__anPXDTnogkk7.woff2',
  },
  {
    name: 'playfair-display-600-italic.woff2',
    url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFkD-vYSZviVYUb_rj3ij__anPXDTnogkk7.woff2',
  }
];

// 2. Images to download
const images = [
  // Destinations & hero
  {
    name: 'hero-ladakh.jpg',
    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=82',
    dir: destImagesDir
  },
  {
    name: 'meghalaya.jpg',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=82',
    dir: destImagesDir
  },
  {
    name: 'kerala.jpg',
    url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1920&q=82',
    dir: destImagesDir
  },
  {
    name: 'rajasthan.jpg',
    url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1920&q=82',
    dir: destImagesDir
  },
  {
    name: 'green-rain.jpg',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=82',
    dir: destImagesDir
  },
  // Categories & expertise
  {
    name: 'exp-food.jpg',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    dir: catImagesDir
  },
  {
    name: 'exp-trails.jpg',
    url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=800&q=80',
    dir: catImagesDir
  },
  {
    name: 'exp-culture.jpg',
    url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    dir: catImagesDir
  },
  {
    name: 'exp-family.jpg',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    dir: catImagesDir
  }
];

async function main() {
  console.log('Downloading fonts...');
  for (const font of fontFiles) {
    await downloadFile(font.url, path.join(fontsDir, font.name));
  }

  console.log('Downloading images...');
  for (const img of images) {
    await downloadFile(img.url, path.join(img.dir, img.name));
  }

  // Generate fonts.css
  const fontsCss = `/* Local Self-Hosted Fonts for Vayanai */
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/dm-sans-400.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/dm-sans-500.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/dm-sans-600.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/dm-sans-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/playfair-display-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/playfair-display-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/playfair-display-500-italic.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/playfair-display-600-italic.woff2') format('woff2');
}
`;
  fs.writeFileSync(path.resolve('public/fonts/fonts.css'), fontsCss);
  console.log('Generated public/fonts/fonts.css');
  console.log('Asset download complete!');
}

main().catch(err => {
  console.error('Error downloading assets:', err);
  process.exit(1);
});
