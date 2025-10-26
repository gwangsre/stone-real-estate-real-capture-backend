import "dotenv/config";
import { initFirebase } from "./config/firebase.js";
import { createServer } from "./server.js";

initFirebase();
const app = createServer();

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`[api] running on :${PORT}`));
