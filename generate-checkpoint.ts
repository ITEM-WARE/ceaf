import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFile } from 'fs/promises';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fullDatabaseBackup() {
  console.log('--- STARTING FULL DATABASE BACKUP ---');
  const backup: any = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  const collectionsToBackup = ['profiles', 'settings', 'donations', 'logs'];

  for (const collName of collectionsToBackup) {
    try {
      console.log(`Backing up collection: ${collName}...`);
      const querySnapshot = await getDocs(collection(db, collName));
      const docs: any[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      backup.collections[collName] = docs;
      console.log(`Successfully backed up ${docs.length} documents from ${collName}.`);
    } catch (err) {
      console.error(`Error backing up ${collName}:`, err);
    }
  }

  const filename = `FULL_CHECKPOINT_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await writeFile(filename, JSON.stringify(backup, null, 2));
  console.log(`--- BACKUP COMPLETE: ${filename} ---`);
}

fullDatabaseBackup().catch(console.error);
