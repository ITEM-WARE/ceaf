import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";

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
  console.log("Starting Test Script...");

  // 1. Add a Test Donor Account to Settings
  console.log("1. Fetching current settings...");
  const settingsRef = doc(db, 'settings', 'global');
  const settingsSnap = await getDoc(settingsRef);
  
  let settings = settingsSnap.exists() ? settingsSnap.data() : { questions: [] };
  
  const testDonor = {
    id: "donor_" + Date.now(),
    name: "Test Donor",
    password: "testdonor123"
  };

  const existingDonors = settings.donors || [];
  // Check if test donor already exists
  if (!existingDonors.find((d: any) => d.name === "Test Donor")) {
    console.log("   Adding 'Test Donor' account with password 'testdonor123'...");
    const updatedDonors = [...existingDonors, testDonor];
    await setDoc(settingsRef, { donors: updatedDonors }, { merge: true });
    console.log("   ✅ Test Donor account added to settings.");
  } else {
    console.log("   ✅ 'Test Donor' account already exists in settings.");
  }

  // 2. Create a Test Profile
  console.log("2. Creating a test profile...");
  const newProfile = {
    applicationNumber: "TEST-" + Math.floor(Math.random() * 10000),
    district: "Test District",
    name: "Test Applicant",
    fatherName: "Test Father",
    cnic: "12345-6789012-3",
    address: "123 Test Street",
    phoneNumber: "0300-1234567",
    answers: {},
    conditionalAnswers: {},
    score: 50,
    scoreBreakdown: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    donations: [
      {
        id: "don_" + Date.now(),
        donorName: "Test Donor",
        amount: 1500,
        description: "Test donation from script",
        date: Date.now()
      }
    ]
  };

  const docRef = await addDoc(collection(db, 'profiles'), newProfile);
  console.log(`   ✅ Test profile created with ID: ${docRef.id}`);
  console.log(`   ✅ Added a $1500 donation from 'Test Donor' to this profile.`);

  console.log("\n=======================================================");
  console.log("🎉 Test Setup Complete!");
  console.log("=======================================================");
  console.log("How to verify the features:");
  console.log("1. Go to the app and log out if you are logged in.");
  console.log("2. Log in using the password: testdonor123");
  console.log("3. Click 'View Profiles'. You should ONLY see the 'Test Applicant' profile.");
  console.log("4. Click 'View All Profiles' to see everyone, then click 'View My Donations' to go back.");
  console.log("5. Click the 'Donations' button on the 'Test Applicant' profile to see the $1500 donation.");
  console.log("6. Log out, then log in as Admin (Accessadmin).");
  console.log("7. Click 'Donations' on any profile, and you will see 'Test Donor' in the dropdown list when adding a new donation.");
  console.log("=======================================================\n");

  process.exit(0);
}

runTest().catch(err => {
  console.error("Error running test:", err);
  process.exit(1);
});
