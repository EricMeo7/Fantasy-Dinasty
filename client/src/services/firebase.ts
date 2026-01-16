import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Replace with your Firebase project configuration
// You can find this in the Firebase Console > Project Settings > General > Your apps

const firebaseConfig = {
    apiKey: "AIzaSyCAQdXe7L0BObLSgh-xVXpIUkdIcIUWgAU",
    authDomain: "fantasydinasty-5e957.firebaseapp.com",
    projectId: "fantasydinasty-5e957",
    storageBucket: "fantasydinasty-5e957.firebasestorage.app",
    messagingSenderId: "125799043452",
    appId: "1:125799043452:web:70067ff650e90bfa3414f9",
    measurementId: "G-T1L9MGQ2YK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();