import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

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

async function testConnection() {
  try {
    console.log("1. Connecting to your Firebase project (zakat-d2a9d)...");
    
    // Write test
    const docRef = await addDoc(collection(db, "ai_test_connection"), {
      message: "Hello! The database connection is working perfectly.",
      timestamp: new Date().toISOString()
    });
    console.log("2. SUCCESS! Wrote a test document with ID:", docRef.id);
    
    // Read test
    const querySnapshot = await getDocs(collection(db, "ai_test_connection"));
    console.log(`3. SUCCESS! Read data back. Found ${querySnapshot.size} test document(s).`);
    
    console.log("Result: Firebase is 100% connected and working.");
    process.exit(0);
  } catch (error) {
    console.error("FAILED to connect:", error);
    process.exit(1);
  }
}

testConnection();
