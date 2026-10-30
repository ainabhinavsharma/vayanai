import fs from 'node:fs';

let css = fs.readFileSync('assets/styles.css', 'utf8');

css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1501785888041-af3ef285b470[^\'\)]*/g, '/images/destinations/hero-ladakh.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1464822759023-fed622ff2c3b[^\'\)]*/g, '/images/destinations/meghalaya.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1602216056096-3b40cc0c9944[^\'\)]*/g, '/images/destinations/kerala.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1477587458883-47145ed94245[^\'\)]*/g, '/images/destinations/rajasthan.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1511497584788-876760111969[^\'\)]*/g, '/images/destinations/green-rain.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1555939594-58d7cb561ad1[^\'\)]*/g, '/images/categories/exp-food.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1472396961693-142e6e269027[^\'\)]*/g, '/images/categories/exp-trails.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1561361513-2d000a50f0dc[^\'\)]*/g, '/images/categories/exp-culture.jpg');
css = css.replace(/https:\/\/images\.unsplash\.com\/photo-1511895426328-dc8714191300[^\'\)]*/g, '/images/categories/exp-family.jpg');

const header = '@import "/fonts/fonts.css";\n\n';
fs.writeFileSync('app/globals.css', header + css);
console.log('Successfully created app/globals.css with local assets');
