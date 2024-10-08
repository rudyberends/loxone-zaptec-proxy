import logger from './utils/troxorlogger';
import { tokenManager } from './tokenManager';
import { httpsRequest } from './utils';

// Interface representing the structure of the response from the charger API
interface ChargerResponse {
  Data: Array<{ Id: string }>; // An array of objects containing the charger IDs
}

/**
 * Class representing a charger and its functionalities.
 */
class Charger {
  private chargerId: string = ''; // Holds the ID of the charger

  /**
   * Retrieves the charger ID. If not already fetched, it will fetch it from the API.
   *
   * @returns {Promise<string>} A promise that resolves to the charger ID.
   *
   * @throws {Error} Throws an error if the charger ID cannot be retrieved.
   */
  async getChargerId(): Promise<string> {
    if (!this.chargerId) {
      await this.fetchChargerId(); // Fetch the charger ID if it's not already available
    }
    return this.chargerId; // Return the charger ID
  }

  /**
   * Fetches the charger ID from the Zaptec API.
   *
   * @returns {Promise<void>} A promise that resolves when the charger ID has been successfully fetched.
   *
   * @throws {Error} Throws an error if no chargers are found or if there is an issue with the request.
   */
  private async fetchChargerId(): Promise<void> {
    const accessToken = await tokenManager.getAccessToken(); // Get the access token for authorization
    const endpoint = '/api/chargers'; // API path for fetching chargers

    logger.info('Fetching charger ID...'); // Log the action
    try {
      const data = await httpsRequest(endpoint, null, accessToken); // Use the new httpsRequest signature
      const jsonResponse: ChargerResponse = JSON.parse(data); // Parse the JSON response

      // Validate the response structure
      if (!Array.isArray(jsonResponse.Data) || jsonResponse.Data.length === 0 || !jsonResponse.Data[0].Id) {
        throw new Error('Invalid charger data format'); // More specific error
      }

      // Store the first charger ID
      this.chargerId = jsonResponse.Data[0].Id;
      logger.info(`Charger ID obtained: ${this.chargerId}`); // Log the obtained charger ID
    } catch (error) {
      logger.error('Failed to fetch charger ID:', error);
      throw new Error('Failed to fetch charger ID'); // Throw a new error with context
    }
  }

  /**
   * Sends a command to the charger.
   * 
   * @param {number} commandId - The ID of the command to send (e.g., start or stop charging).
   * 
   * @returns {Promise<void>} A promise that resolves when the command is successfully sent.
   *
   * @throws {Error} Throws an error if the command cannot be sent.
   */
  async sendChargerCommand(commandId: number): Promise<void> {
    const chargerId = await this.getChargerId(); // Ensure we have the charger ID
    const accessToken = await tokenManager.getAccessToken(); // Get the access token for authorization
    const endpoint = `/api/chargers/${chargerId}/sendCommand/${commandId}`; // Construct the endpoint

    logger.info(`Sending command ${commandId} to charger ID: ${chargerId}...`);
    try {
      await httpsRequest(endpoint, '{}', accessToken); // Use the new httpsRequest signature
      logger.info(`Command ${commandId} sent successfully.`); // Log successful command sending
    } catch (error) {
      logger.error(`Failed to send command ${commandId}:`, error);
      throw new Error(`Failed to send command ${commandId}`); // Throw a new error with context
    }
  }
}

// Export an instance of the Charger class
export const charger = new Charger();
