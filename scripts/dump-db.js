// scripts/dump-db.js
import "dotenv/config";
import { initFirebase, db } from "../src/config/firebase.js";

async function dumpFirestore() {
  initFirebase();

  async function getAllCollections() {
    const collections = await db().listCollections();
    return collections.map(col => col.id);
  }

  async function getFirstDocument(colRef) {
    const snapshot = await colRef.limit(1).get(); // chỉ lấy 1 doc đầu tiên
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    const fieldKeys = Object.keys(data);

    const subCollections = await doc.ref.listCollections();
    const subColNames = subCollections.map(c => c.id);

    return {
      id: doc.id,
      fields: fieldKeys,
      subCollections: subColNames,
    };
  }

  const collections = await getAllCollections();
  const summary = {};
  for (const col of collections) {
    summary[col] = await getFirstDocument(db().collection(col));
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

dumpFirestore().catch(err => {
  console.error(err);
  process.exit(1);
});
