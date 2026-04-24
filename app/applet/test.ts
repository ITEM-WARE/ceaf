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

async function runTest() {
  try {
    console.log("Connecting to Firestore...");
    
    // 1. Add a test profile
    const testProfile = {
      applicationNumber: "TEST-" + Math.floor(Math.random() * 10000),
      name: "AI Test User",
      cnic: "12345-1234567-1",
      district: "Test District",
      fatherName: "Test Father",
      address: "123 Test St",
      phoneNumber: "03001234567",
      householdSize: "1-3",
      profession: "Unemployed",
      monthlyIncome: "0-20k",
      professionOfOthers: "None",
      totalHouseholdIncome: "Low",
      numberOfMobilePhones: "0-1",
      governmentSupport: "No",
      externalSupport: "No",
      debtForBasicNeeds: "No",
      disabilityInHousehold: "No",
      houseStatus: "Rented",
      schoolFees: "No",
      score: 85,
      scoreBreakdown: { "Base": 85 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "profiles"), testProfile);
    console.log("✅ Successfully created test profile with ID:", docRef.id);

    // 2. Read profiles back
    const snapshot = await getDocs(collection(db, "profiles"));
    console.log(`✅ Successfully read from database. Found ${snapshot.size} profiles.`);
    
    snapshot.forEach(doc => {
      console.log(`- Profile ID: ${doc.id}, Name: ${doc.data().name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
}

runTest();
