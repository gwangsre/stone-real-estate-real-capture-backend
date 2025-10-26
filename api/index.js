import { createServer } from '../src/server.js';
import { initFirebase } from '../src/config/firebase.js';

// Initialize Firebase only once at cold start
initFirebase();
const app = createServer();

// Export a handler function that delegates to the Express app.
// Exporting the app function directly can work, but an explicit handler is clearer.
export default function handler(req, res) {
	return app(req, res);
}
