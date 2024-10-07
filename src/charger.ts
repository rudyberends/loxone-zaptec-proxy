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

    // No longer using `options`, just pass the endpoint and the access token to `httpsRequest`
    const endpoint = '/api/chargers'; // API path for fetching chargers

    logger.info('Fetching charger ID...'); // Log the action
    const data = await httpsRequest(endpoint, null, accessToken); // Use the new httpsRequest signature
    const jsonResponse: ChargerResponse = JSON.parse(data); // Parse the JSON response

    // Check if any chargers were returned
    if (!jsonResponse.Data || jsonResponse.Data.length === 0) {
      throw new Error('No chargers found'); // Throw an error if no chargers are found
    }

    // Store the first charger ID
    this.chargerId = jsonResponse.Data[0].Id;
    logger.info(`Charger ID obtained: ${this.chargerId}`); // Log the obtained charger ID
  }
}

// Export an instance of the Charger class
export const charger = new Charger();
