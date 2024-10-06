import http, { IncomingMessage, ServerResponse } from 'http';
import { httpsRequest, extractMeterReading } from './utils';
import { tokenManager } from './tokenManager';
import logger from './utils/troxorlogger';
import { charger } from './charger';

// Interface for the live data response from the charger
interface LiveDataResponse {
  State: {
    [key: string]: {
      ValueAsString?: string;
    };
  };
}

/**
 * Retrieves live data from the charger.
 *
 * @returns {Promise<Record<string, number | string>>} A promise that resolves to an object containing live data about the charger.
 *
 * @throws {Error} Throws an error if the response structure is invalid or if there is an issue fetching data.
 */
const getChargerLiveData = async (): Promise<Record<string, number | string>> => {
  // Get the charger ID and access token
  const chargerId = await charger.getChargerId();
  const accessToken = await tokenManager.getAccessToken();

  // Define the options for the HTTPS request
  const options: http.RequestOptions = {
    method: 'GET',
    hostname: 'api.zaptec.com',
    path: `/api/chargers/${chargerId}/live`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  logger.info(`Fetching live data for charger ID: ${chargerId}...`);
  const data = await httpsRequest(options); // Pass options directly
  const jsonResponse: LiveDataResponse = JSON.parse(data);

  // Validate the response structure
  if (!jsonResponse.State) throw new Error('Invalid response structure');

  // Extract relevant values from the response
  const mode = jsonResponse.State[710]?.ValueAsString || null;
  const power = parseFloat(jsonResponse.State[513]?.ValueAsString || '0') / 1000 || 0; // Convert to kW
  const energy = parseFloat(jsonResponse.State[553]?.ValueAsString || '0') || 0; // Energy in kWh
  const uuid = jsonResponse?.State?.['721']?.ValueAsString || '';

  const meterReading = extractMeterReading(jsonResponse.State[554]?.ValueAsString);

  // Create an object containing the status data
  const statusData = {
    connected: mode === '1' ? 0 : 1,
    charging: mode === '3' ? 1 : 0,
    power,
    energy,
    meter_reading: meterReading,
    uuid,
  };

  logger.info('Live data retrieved successfully:', statusData);
  return statusData;
};

/**
 * Sends a command to the charger.
 *
 * @param {number} commandId - The ID of the command to be sent to the charger.
 * @returns {Promise<void>} A promise that resolves when the command has been sent successfully.
 *
 * @throws {Error} Throws an error if there is an issue sending the command.
 */
const sendChargerCommand = async (commandId: number): Promise<void> => {
  // Get the charger ID and access token
  const chargerId = await charger.getChargerId();
  const accessToken = await tokenManager.getAccessToken();

  // Define the options for the HTTPS request
  const options: http.RequestOptions = {
    method: 'POST',
    hostname: 'api.zaptec.com',
    path: `/api/chargers/${chargerId}/sendCommand/${commandId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  logger.info(`Sending command ${commandId} to charger ID: ${chargerId}...`);
  await httpsRequest(options); // Pass options directly
  logger.info(`Command ${commandId} sent successfully.`);
};

// Create an HTTP server to act as a proxy
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);

  try {
    if (req.url === '/status') {
      // Handle request to get charger live status
      const statusData = await getChargerLiveData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(statusData));
    } else if (req.url === '/start') {
      // Handle request to start charging
      await sendChargerCommand(507); // Command ID for start
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Charging started.');
    } else if (req.url === '/stop') {
      // Handle request to stop charging
      await sendChargerCommand(506); // Command ID for stop
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Charging stopped.');
    } else {
      logger.warn(`404 Not Found: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } catch (error) {
    logger.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error })); // Send a more user-friendly error message
  }
});

// Start the proxy server on port 6000
server.listen(6000, () => {
  logger.info('Proxy server running on port 6000');
});
