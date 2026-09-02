import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey:            "AIzaSyCUldI4aarUZBJ7627uUjCHsGPlqfekgfA",
  authDomain:        "m-customs.firebaseapp.com",
  projectId:         "m-customs",
  storageBucket:     "m-customs.firebasestorage.app",
  messagingSenderId: "869699243478",
  appId:             "1:869699243478:web:0ec5f8199f3d8604692877",
  measurementId:     "G-XCTNG77EXJ"
};

const app = initializeApp(firebaseConfig);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const analytics = getAnalytics(app);
export default app;
