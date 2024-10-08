import http, { IncomingMessage, ServerResponse } from 'http';
import { charger } from './charger'; // Module to manage charger data
import { httpsRequest, extractMeterReading } from './utils'; // Utility functions
import logger from './utils/troxorlogger'; // Logger utility
import { tokenManager } from './tokenManager'; // Token management module

// Interface for the structure of the live data response from the charger
interface LiveDataResponse {
  State: {
    [key: string]: {
      ValueAsString?: string; // Optional string value for each state property
    };
  };
}

/**
 * Fetches live data from the charger.
 * 
 * @returns {Promise<Record<string, number | string>>} An object containing live data from the charger,
 * including connection status, charging status, power, energy, meter reading, and UUID.
 * 
 * @throws {Error} Throws an error if the response structure is invalid.
 */
const getChargerLiveData = async (): Promise<Record<string, number | string>> => {
  // Fetch the charger ID and access token
  const chargerId = await charger.getChargerId();
  const accessToken = await tokenManager.getAccessToken();

  const endpoint = `/api/chargers/${chargerId}/live`; // Construct endpoint for fetching live data

  logger.info(`Fetching live data for charger ID: ${chargerId}...`);
  const data = await httpsRequest(endpoint, null, accessToken); // Make an HTTP request with the access token
  const jsonResponse: LiveDataResponse = JSON.parse(data); // Parse the JSON response

  // Check if the response has the expected structure
  if (!jsonResponse.State) throw new Error('Invalid response structure');

  // Extract relevant data from the response
  const mode = jsonResponse.State[710]?.ValueAsString || null;
  const power = parseFloat(jsonResponse.State[513]?.ValueAsString || '0') / 1000 || 0; // Convert power to kW
  const energy = parseFloat(jsonResponse.State[553]?.ValueAsString || '0') || 0; // Energy in kWh
  const uuid = jsonResponse?.State?.['721']?.ValueAsString || '';

  // Extract meter reading from the response
  const meterReading = extractMeterReading(jsonResponse.State[554]?.ValueAsString);

  // Prepare the status data to return
  const statusData = {
    connected: mode === '1' ? 0 : 1, // Convert mode to connected status
    charging: mode === '3' ? 1 : 0, // Convert mode to charging status
    power,
    energy,
    meter_reading: meterReading,
    uuid,
  };

  logger.info('Live data retrieved successfully:', statusData);
  return statusData; // Return the constructed status data
};

/**
 * Sends a command to the charger.
 * 
 * @param {number} commandId - The ID of the command to send (e.g., start or stop charging).
 * 
 * @returns {Promise<void>} A promise that resolves when the command is successfully sent.
 */
const sendChargerCommand = async (commandId: number): Promise<void> => {
  // Fetch the charger ID and access token
  const chargerId = await charger.getChargerId();
  const accessToken = await tokenManager.getAccessToken();

  const endpoint = `/api/chargers/${chargerId}/sendCommand/${commandId}`; // Construct endpoint for sending commands

  logger.info(`Sending command ${commandId} to charger ID: ${chargerId}...`);
  await httpsRequest(endpoint, '{}', accessToken); // Send the command using the access token
  logger.info(`Command ${commandId} sent successfully.`); // Log success
};

/**
 * Create an HTTP server to act as the proxy for handling charger-related requests.
 * 
 * Routes:
 * - `/status`: Fetch and return live data from the charger.
 * - `/start`: Send a command to start charging.
 * - `/stop`: Send a command to stop charging.
 * 
 * All other routes respond with a 404 Not Found.
 */
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);

  try {
    if (req.url === '/status') {
      // If the request is for status, get live data and respond
      const statusData = await getChargerLiveData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(statusData)); // Send JSON response
    } else if (req.url === '/start') {
      // If the request is to start charging, send the start command
      await sendChargerCommand(507); // Command ID for start
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Charging started.'); // Send confirmation response
    } else if (req.url === '/stop') {
      // If the request is to stop charging, send the stop command
      await sendChargerCommand(506); // Command ID for stop
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Charging stopped.'); // Send confirmation response
    } else {
      // Handle unknown routes
      logger.warn(`404 Not Found: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found'); // Send 404 response for unknown routes
    }
  } catch (error) {
    // Handle errors during request processing
    logger.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error })); // Send 500 response on error
  }
});

// Start the HTTP server on port 6000
server.listen(6000, () => {
  logger.info('Proxy server running on port 6000'); // Log server start
});
