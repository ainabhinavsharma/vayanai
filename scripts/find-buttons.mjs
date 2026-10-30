import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./components'));
const buttonDetails = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('<button') || line.includes('type="submit"') || (line.includes('<Link') && line.includes('className'))) {
      buttonDetails.push({ file: f, line: idx + 1, content: line.trim() });
    }
  });
});

console.log(JSON.stringify(buttonDetails, null, 2));
