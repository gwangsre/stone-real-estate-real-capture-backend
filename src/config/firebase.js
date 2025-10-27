import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Dùng CWD để resolve đường dẫn tương đối từ gốc repo (ổn định hơn ESM import URL)
function readServiceAccountFromFile() {
  const rel = process.env.FIREBASE_KEY_FILE; // ví dụ: stone-real-estate-...b064.json
  if (!rel) {
    throw new Error("Missing FIREBASE_KEY_FILE in .env");
  }
  const absPath = path.resolve(process.cwd(), rel); // luôn ra đường dẫn tuyệt đối
  if (!fs.existsSync(absPath)) {
    throw new Error(`Service account JSON not found at: ${absPath}`);
  }
  const raw = fs.readFileSync(absPath, "utf8");
  return JSON.parse(raw);
}

let initialized = false;

export function initFirebase() {
  if (initialized) {
    console.log("🔥 Firebase already initialized");
    return admin;
  }

  console.log("🔥 Initializing Firebase...");
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_KEY_FILE } = process.env;
  let { FIREBASE_PRIVATE_KEY } = process.env;
  
  console.log("🔥 Firebase config check:", {
    hasProjectId: !!FIREBASE_PROJECT_ID,
    hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
    hasKeyFile: !!FIREBASE_KEY_FILE,
    hasPrivateKey: !!FIREBASE_PRIVATE_KEY
  });

  // Prefer explicit service account file when provided
  if (FIREBASE_KEY_FILE) {
    const serviceAccount = readServiceAccountFromFile();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    // Some platforms (or accidental quoting) may store the private key with literal
    // "\n" sequences or wrapped in quotes. Normalize common variants to an actual
    // PEM with real newlines so firebase-admin can parse it.
    //  - Replace escaped \n with real newlines
    //  - If the value is double-escaped (\\n), replace that too
    //  - Strip surrounding quotes if the value was pasted with them
    FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.replace(/^\"|\"$/g, "");
    FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, "\n");
    FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      }),
    });
  } else {
    // Fallback to service account file if available, otherwise throw a helpful error
    const serviceAccount = readServiceAccountFromFile();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  initialized = true;
  console.log("✅ Firebase initialized successfully");
  return admin;
}

export function db() {
  // Auto-initialize Firebase if not already done
  if (!initialized) {
    console.log("🔥 Firebase not initialized, initializing now...");
    initFirebase();
  }
  return admin.firestore();
}
