const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const fetchStitchPath = path.join(
  __dirname,
  '..',
  '.agents',
  'skills',
  'stitch-react-components',
  'scripts',
  'fetch-stitch.sh'
);
const screensFile = process.argv[2] || process.env.SCREENS_FILE;
const designsDir = path.join(__dirname, '.stitch', 'designs');

if (!screensFile) {
  console.error('Error: screens input path is required.');
  console.error('Usage: node fetch_screens.cjs <screens-json-path>');
  console.error('Or set the SCREENS_FILE environment variable.');
  process.exit(1);
}

fs.mkdirSync(designsDir, { recursive: true });

const screensData = JSON.parse(fs.readFileSync(screensFile, 'utf8'));

screensData.screens.forEach((screen) => {
  // e.g. projects/9993824954322017543/screens/aa31b6e00cd14b7e89b91d735381d13a -> aa31b6e00cd14b7e89b91d735381d13a
  const screenId = screen.name.split('/').pop();

  if (screen.htmlCode && screen.htmlCode.downloadUrl) {
    const htmlDest = path.join(designsDir, `${screenId}.html`);
    console.log(`Fetching HTML for ${screen.title} (${screenId})`);
    try {
      execFileSync('bash', [fetchStitchPath, screen.htmlCode.downloadUrl, htmlDest], { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to fetch HTML for ${screenId}:`, e.message);
    }
  }

  if (screen.screenshot && screen.screenshot.downloadUrl) {
    const width = screen.width || 1280;
    const pngDest = path.join(designsDir, `${screenId}.png`);
    const pngUrl = `${screen.screenshot.downloadUrl}=w${width}`;
    console.log(`Fetching PNG for ${screen.title} (${screenId})`);
    try {
      execFileSync('bash', [fetchStitchPath, pngUrl, pngDest], { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to fetch PNG for ${screenId}:`, e.message);
    }
  }
});

console.log('Finished downloading all screens.');
