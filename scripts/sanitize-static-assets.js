import fs from 'fs';

if (fs.existsSync('assets/styles.css')) {
  let css = fs.readFileSync('assets/styles.css', 'utf8');
  css = css.replace(/https:\/\/images\.unsplash\.com\/[^\'\"\)]+/g, (m) => {
    if (m.includes('501785888041')) return '/images/destinations/hero-ladakh.jpg';
    if (m.includes('464822759023')) return '/images/destinations/meghalaya.jpg';
    if (m.includes('511497584788')) return '/images/destinations/green-rain.jpg';
    if (m.includes('602216056096')) return '/images/destinations/kerala.jpg';
    if (m.includes('555939594')) return '/images/categories/exp-food.jpg';
    if (m.includes('472396961693')) return '/images/categories/exp-trails.jpg';
    if (m.includes('561361513')) return '/images/categories/exp-culture.jpg';
    if (m.includes('511895426328')) return '/images/categories/exp-family.jpg';
    return '/images/destinations/meghalaya.jpg';
  });
  fs.writeFileSync('assets/styles.css', css, 'utf8');
  console.log('Sanitized assets/styles.css with local images.');
}

const htmlFiles = ['index.html', 'plan.html', 'trip.html', 'people.html', 'my-trips.html'];
for (const file of htmlFiles) {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/https:\/\/fonts\.googleapis\.com[^\"]+/g, '/fonts/fonts.css');
    fs.writeFileSync(file, html, 'utf8');
  }
}
console.log('Sanitized static HTML files.');
