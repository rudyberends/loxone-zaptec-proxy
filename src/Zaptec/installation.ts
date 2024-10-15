import logger from '../utils/troxorlogger';
import { tokenManager } from './tokenManager';
import { apiRequest } from './apiRequest';

// Interface representing the structure of the response from the charger API
interface InstallationResponse {
  Data: Array<{ Id: string }>; // An array of objects containing the charger IDs
}

/**
 * Class representing an installation and its functionalities.
 */
class Installation {
  private installationId: string = ''; // Holds the ID of the installation

  /**
   * Retrieves the installation ID. If the ID has not been fetched yet, it will fetch it from the API.
   * 
   * @returns {Promise<string>} A promise that resolves to the installation ID.
   * 
   * @throws {Error} Throws an error if the installation ID cannot be retrieved from the API.
   */
  async getInstallationId(): Promise<string> {
    // If the installation ID is not available, fetch it from the API
    if (!this.installationId) {
      await this.fetchInstallationId(); // Fetch the installation ID if it's not already available
    }
    return this.installationId; // Return the fetched or cached installation ID
  }

  /**
   * Fetches the installation ID from the Zaptec API and stores it for future use.
   * 
   * @returns {Promise<void>} A promise that resolves once the installation ID has been successfully fetched.
   * 
   * @throws {Error} Throws an error if no installations are found or if there is an issue with the request.
   */
  private async fetchInstallationId(): Promise<void> {
    const accessToken = await tokenManager.getAccessToken(); // Retrieve access token from the token manager
    const endpoint = '/api/installation'; // Define API path for fetching the installation

    logger.info('Fetching Installation ID...'); // Log the initiation of the process
    try {
      // Make an HTTPS request to the Zaptec API to fetch charger details
      const data = await apiRequest(endpoint, null, accessToken);
      const jsonResponse: InstallationResponse = JSON.parse(data); // Parse the JSON response

      // Validate if the response contains the charger data and if the data format is correct
      if (!Array.isArray(jsonResponse.Data) || jsonResponse.Data.length === 0 || !jsonResponse.Data[0].Id) {
        throw new Error('Invalid charger data format'); // More specific error for data validation
      }

      // Store the first charger ID in the class property
      this.installationId = jsonResponse.Data[0].Id;
      logger.info(`Charger ID obtained: ${this.installationId}`); // Log the obtained charger ID
    } catch (error) {
      logger.error('Failed to fetch charger ID:', error); // Log any errors encountered during the request
      throw new Error('Failed to fetch charger ID'); // Re-throw error with a custom message
    }
  }

  // Fetch connection details for Azure Service Bus
  async fetchConnectionDetails() {
    const installationId = await this.getInstallationId(); // Ensure that the charger ID has been fetched
    const accessToken = await tokenManager.getAccessToken(); // Retrieve access token from the token manager
    const endpoint = `/api/installation/${installationId}/messagingConnectionDetails`;

    try {
      const response = await apiRequest(endpoint, null, accessToken);
      return JSON.parse(response); // Parse and return the JSON response
    } catch (error) {
      throw new Error(`Failed to fetch connection details: ${error}`);
    }
  }
}

// Export an instance of the installation class, providing a single shared instance for use elsewhere
export const installation = new Installation();
