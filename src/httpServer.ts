import { ChargerState } from './stateManager'; // Import the ChargerState class
import * as http from 'http'; // Import the HTTP module
import logger from './utils/troxorlogger';
import { charger } from './charger'

// Initialize the ChargerState singleton instance
const chargerState = ChargerState.getInstance();

// Create the web server
const server = http.createServer(async (req, res) => {

    // Simple routing logic
    if (req.method === 'GET' && req.url === '/state') {
        // Respond with the current states
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(JSON.stringify(chargerState.getAllStates(), null, 2));
    } else if (req.url === '/start') {
        // If the request is to start charging, send the start command
        await charger.sendChargerCommand(507); // Command ID for start
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Charging started.'); // Send confirmation response
      } else if (req.url === '/stop') {
        // If the request is to stop charging, send the stop command
        await charger.sendChargerCommand(506); // Command ID for stop
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Charging stopped.'); // Send confirmation response
    } else {
        // Respond with a 404 for other routes
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

// Function to start the HTTP server
const startServer = (port: number) => {
    server.listen(port, () => {
        logger.info(`Http Server running at ${port}`);
    });
};

export { startServer }; // Export the startServer function
