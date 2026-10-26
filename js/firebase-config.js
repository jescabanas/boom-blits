import { initializeApp } from "firebase/app";
import "./dialog-ui.js?v=20260902-hidden-fix";
import "./sidebar-toggle.js?v=20260903-uniform-navigation-icons";
import "./dark-mode-toggle.js?v=20260903";

const firebaseConfig = {
  apiKey: "AIzaSyDwZgpBQ07yHZaBL5wGj9LXlFLnl_3urnU",
  authDomain: "barangay-tracker-1b869.firebaseapp.com",
  projectId: "barangay-tracker-1b869",
  storageBucket: "barangay-tracker-1b869.firebasestorage.app",
  messagingSenderId: "323608603289",
  appId: "1:323608603289:web:b5ac5939c56f5fff356608"
};

const app = initializeApp(firebaseConfig);

export { app };
