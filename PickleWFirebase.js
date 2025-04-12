// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9HKUAEUg3-WgKjCYSL9zVVCj6nMOL2tE",
  authDomain: "pickleq.firebaseapp.com",
  projectId: "pickleq",
  storageBucket: "pickleq.firebasestorage.app",
  messagingSenderId: "1006103039653",
  appId: "1:1006103039653:web:2d021ce8bfcaf427ac874c",
  measurementId: "G-RL250FTMFF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);