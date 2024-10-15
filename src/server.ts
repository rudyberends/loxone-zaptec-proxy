import { startServer } from './httpServer/httpServer'; // Import HTTP server setup
import { processMessages } from './Zaptec/serviceBus/serviceBusSubscriber';
import { ChargerState } from './stateManager'; // Import the ChargerState class

async function main() {
    // Initialize the ChargerState
    const chargerState = ChargerState.getInstance();
    await chargerState.initializeState(); // Fetch initial state from the Zaptec API
    
    processMessages(); // Ensure this is called after initialization

    // Start the HTTP server on all interfaces and port 6000
    const port = 6000;
    startServer(port);
}

main().catch(error => {
    console.error('Error starting server:', error);
});
