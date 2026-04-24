import extract from 'extract-zip';

async function main() {
  try {
    await extract('/ceafgit.zip', { dir: '/app/applet/ceafgit_extracted' });
    console.log('Extraction complete');
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
