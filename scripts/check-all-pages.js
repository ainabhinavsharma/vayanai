async function checkPages() {
  const pages = ['/', '/portal', '/plan', '/trip', '/people', '/my-trips'];
  for (const page of pages) {
    const res = await fetch('http://localhost:3000' + page);
    const html = await res.text();
    const hasCss = html.includes('/_next/static/css/');
    const hasFonts = html.includes('/fonts/fonts.css');
    console.log(`${page.padEnd(12)} -> Status: ${res.status} | HTML Size: ${html.length} | Has CSS: ${hasCss} | Has Fonts: ${hasFonts}`);
  }
}
checkPages().catch(console.error);
