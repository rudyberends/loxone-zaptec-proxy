import logger from '../utils/troxorlogger';
import { tokenManager } from './tokenManager';
import { apiRequest } from './apiRequest';

// Interface representing the structure of the response from the charger API
interface ChargerResponse {
  Data: Array<{ Id: string }>; // An array of objects containing the charger IDs
}

// Interface for the structure of the live data response from the charger
export interface LiveDataResponse {
  State: {
      [key: string]: {
          ValueAsString?: string; // Optional string value for each state property
      };
  };
}

/**
 * Class representing a charger and its functionalities, including fetching charger IDs,
 * sending commands, and polling for live data.
 */
class Charger {
  private chargerId: string = ''; // Holds the ID of the charger

  /**
   * Retrieves the charger ID. If the ID has not been fetched yet, it will fetch it from the API.
   * 
   * @returns {Promise<string>} A promise that resolves to the charger ID.
   * 
   * @throws {Error} Throws an error if the charger ID cannot be retrieved from the API.
   */
  async getChargerId(): Promise<string> {
    // If the charger ID is not available, fetch it from the API
    if (!this.chargerId) {
      await this.fetchChargerId(); // Fetch the charger ID if it's not already available
    }
    return this.chargerId; // Return the fetched or cached charger ID
  }

  /**
   * Fetches the charger ID from the Zaptec API and stores it for future use.
   * 
   * @returns {Promise<void>} A promise that resolves once the charger ID has been successfully fetched.
   * 
   * @throws {Error} Throws an error if no chargers are found or if there is an issue with the request.
   */
  private async fetchChargerId(): Promise<void> {
    const accessToken = await tokenManager.getAccessToken(); // Retrieve access token from the token manager
    const endpoint = '/api/chargers'; // Define API path for fetching chargers

    logger.info('Fetching charger ID...'); // Log the initiation of the process
    try {
      // Make an HTTPS request to the Zaptec API to fetch charger details
      const data = await apiRequest(endpoint, null, accessToken);
      const jsonResponse: ChargerResponse = JSON.parse(data); // Parse the JSON response

      // Validate if the response contains the charger data and if the data format is correct
      if (!Array.isArray(jsonResponse.Data) || jsonResponse.Data.length === 0 || !jsonResponse.Data[0].Id) {
        throw new Error('Invalid charger data format'); // More specific error for data validation
      }

      // Store the first charger ID in the class property
      this.chargerId = jsonResponse.Data[0].Id;
      logger.info(`Charger ID obtained: ${this.chargerId}`); // Log the obtained charger ID
    } catch (error) {
      logger.error('Failed to fetch charger ID:', error); // Log any errors encountered during the request
      throw new Error('Failed to fetch charger ID'); // Re-throw error with a custom message
    }
  }

  /**
   * Sends a command to the charger, such as start or stop charging.
   * 
   * @param {number} commandId - The ID of the command to send (e.g., start or stop charging).
   *                             Command IDs should map to predefined Zaptec API commands.
   * 
   * @returns {Promise<void>} A promise that resolves once the command has been successfully sent.
   * 
   * @throws {Error} Throws an error if the command cannot be sent.
   */
  async sendChargerCommand(commandId: number): Promise<void> {
    const chargerId = await this.getChargerId(); // Ensure that the charger ID has been fetched
    const accessToken = await tokenManager.getAccessToken(); // Get the access token for authorization
    const endpoint = `/api/chargers/${chargerId}/sendCommand/${commandId}`; // Construct API endpoint for sending command

    logger.info(`Sending command ${commandId} to charger ID: ${chargerId}...`); // Log the command initiation
    try {
      // Send an HTTPS request with the command ID
      await apiRequest(endpoint, '{}', accessToken); // Send a POST request with an empty payload
      logger.info(`Command ${commandId} sent successfully.`); // Log success upon completion
    } catch (error) {
      logger.error(`Failed to send command ${commandId}:`, error); // Log any errors that occur
      throw new Error(`Failed to send command ${commandId}`); // Re-throw error with a custom message
    }
  }

  /**
   * Polls the charger for live data, such as current status and readings.
   * 
   * @returns {Promise<string>} A promise that resolves with the live data as a string.
   *                            The live data will typically be in JSON format, though this
   *                            method does not explicitly parse it.
   * 
   * @throws {Error} Throws an error if the live data cannot be fetched.
   */
  async pollChargerLiveData(): Promise<LiveDataResponse> {
    const chargerId = await this.getChargerId(); // Ensure that the charger ID is available
    const accessToken = await tokenManager.getAccessToken(); // Retrieve the access token for authorization

    const endpoint = `/api/chargers/${chargerId}/live`; // Construct the API endpoint for live data

    logger.info(`Fetching live data for charger ID: ${chargerId}...`); // Log the data-fetching process
    try {
      // Fetch live data from the charger using an HTTPS request
      const data = await apiRequest(endpoint, null, accessToken);
      return JSON.parse(data); // Parse the JSON response
    } catch (error) {
      logger.error(`Failed to fetch live data for charger ID: ${chargerId}:`, error); // Log errors if they occur
      throw new Error(`Failed to fetch live data for charger ID: ${chargerId}`); // Re-throw with a custom error message
    }
  }
}

// Export an instance of the Charger class, providing a single shared instance for use elsewhere
export const charger = new Charger();
