import http, { IncomingMessage, ServerResponse } from 'http';
import logger from "./utils/troxorlogger";
import { charger } from './charger';
import { ChargerStateManager } from './chargerStateManager'; // Import the new ChargerStateManager
import { processMessages } from './serviceBusSubscriber';

// Create an instance of ChargerStateManager to use in the request handler
const stateManager = new ChargerStateManager(); 

// Create an HTTP server to act as the proxy for handling charger-related requests.
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);

  try {
    if (req.url === '/status') {
      const statusData = stateManager.getState(); // Access stateManager here
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(statusData)); // Send JSON response
    } else if (req.url === '/start') {
      await charger.sendChargerCommand(507); // Command ID for start
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Charging started.'); // Send confirmation response
    } else if (req.url === '/stop') {
      await charger.sendChargerCommand(506); // Command ID for stop
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Charging stopped.'); // Send confirmation response
    } else {
      logger.warn(`404 Not Found: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found'); // Send 404 response for unknown routes
    }
  } catch (error) {
    logger.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' })); // Send 500 response on error
  }
});

// Initialize the server and start listening on port 6000
const initializeServer = async () => {
  await stateManager.initialize(); // Initialize the state manager
  processMessages(); // Ensure this is called after initialization

  server.listen(6000, () => {
    logger.info('Proxy server running on port 6000'); // Log server start
  });
};

// Start the initialization process
initializeServer();
