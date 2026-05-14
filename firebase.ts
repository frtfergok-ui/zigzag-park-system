import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBKAzN3ffB9eGISvtH4pa2CXhOOiSXJvzE",
  authDomain: "zigzag-park.firebaseapp.com",
  projectId: "zigzag-park",
  storageBucket: "zigzag-park.firebasestorage.app",
  messagingSenderId: "748287953387",
  appId: "1:748287953387:web:8d5e2ed15cb776c560b1ae",
  measurementId: "G-M3B82G7717"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);