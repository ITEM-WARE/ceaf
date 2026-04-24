const extract = require('extract-zip');
const path = require('path');

async function main() {
  try {
    await extract('/ceafgit.zip', { dir: '/ceafgit_extracted' });
    console.log('Extraction complete');
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
