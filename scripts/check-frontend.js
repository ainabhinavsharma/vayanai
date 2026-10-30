async function main() {
  const res = await fetch('http://localhost:3000/');
  const html = await res.text();
  const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+)"/);
  console.log('CSS match:', cssMatch ? cssMatch[1] : 'NONE');
  if (cssMatch) {
    const cssRes = await fetch('http://localhost:3000' + cssMatch[1]);
    console.log('CSS status:', cssRes.status, 'Type:', cssRes.headers.get('content-type'));
    const cssText = await cssRes.text();
    console.log('CSS length:', cssText.length);
    console.log('CSS preview:', cssText.slice(0, 300));
  }

  // Also check fonts.css
  const fontsRes = await fetch('http://localhost:3000/fonts/fonts.css');
  console.log('Fonts status:', fontsRes.status, 'Length:', (await fontsRes.text()).length);
}
main().catch(console.error);
