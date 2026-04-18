import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrzgY4Rni2tYGK1pCWBs7SpkYiIZSpXO8",
  authDomain: "zakat-d2a9d.firebaseapp.com",
  projectId: "zakat-d2a9d",
  storageBucket: "zakat-d2a9d.firebasestorage.app",
  messagingSenderId: "536102190813",
  appId: "1:536102190813:web:0bd98938d68d7b86f22534",
  measurementId: "G-RD8QRDTL8Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testQuery() {
  try {
    const q = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} profiles with orderBy('createdAt', 'desc')`);
    snapshot.forEach(doc => {
      console.log(doc.id, doc.data().name);
    });
    process.exit(0);
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
}

testQuery();
