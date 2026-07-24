const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const fetchStitchPath = '/Users/swet/Developer/Project/examai-rag/.agents/skills/stitch-react-components/scripts/fetch-stitch.sh';
const screensFile = '/Users/swet/.gemini/antigravity-ide/brain/32628ed0-163d-4d04-afc3-6e85877791a0/.system_generated/steps/26/output.txt';
const designsDir = path.join(__dirname, '.stitch', 'designs');

fs.mkdirSync(designsDir, { recursive: true });

const screensData = JSON.parse(fs.readFileSync(screensFile, 'utf8'));

screensData.screens.forEach((screen) => {
  // e.g. projects/9993824954322017543/screens/aa31b6e00cd14b7e89b91d735381d13a -> aa31b6e00cd14b7e89b91d735381d13a
  const screenId = screen.name.split('/').pop();
  
  if (screen.htmlCode && screen.htmlCode.downloadUrl) {
    const htmlDest = path.join(designsDir, `${screenId}.html`);
    console.log(`Fetching HTML for ${screen.title} (${screenId})`);
    try {
      execSync(`bash "${fetchStitchPath}" "${screen.htmlCode.downloadUrl}" "${htmlDest}"`, { stdio: 'inherit' });
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
      execSync(`bash "${fetchStitchPath}" "${pngUrl}" "${pngDest}"`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to fetch PNG for ${screenId}:`, e.message);
    }
  }
});

console.log('Finished downloading all screens.');
