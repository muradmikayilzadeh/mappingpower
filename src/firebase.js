// Import the functions you need from the SDKs you need
import { initializeApp, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOPYO7goL_9lB3teKLUIyCq5ZF5-IN2ao",
  authDomain: "imaginepdx-fb16a.firebaseapp.com",
  projectId: "imaginepdx-fb16a",
  storageBucket: "imaginepdx-fb16a.appspot.com",
  messagingSenderId: "411529785186",
  appId: "1:411529785186:web:2648eb8ee34a86761b463b"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);
export { app, db, storage };
