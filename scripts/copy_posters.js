import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Abhishek\\.gemini\\antigravity-ide\\brain\\edc1926e-cd5a-42df-b81d-a677822a6fa3';
const targetDir = path.resolve('public', 'assets', 'posters');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = fs.readdirSync(brainDir);
const posterFiles = files.filter(f => f.includes('_poster_') && f.endsWith('.jpg'));

console.log(`Found ${posterFiles.length} poster files in artifact directory.`);

for (const file of posterFiles) {
  const cleanName = file.replace(/_poster_\d+\.jpg$/, '.jpg');
  const srcPath = path.join(brainDir, file);
  const destPath = path.join(targetDir, cleanName);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${file} -> ${cleanName} (${(fs.statSync(destPath).size / 1024).toFixed(1)} KB)`);
}

console.log('All posters copied successfully to', targetDir);
