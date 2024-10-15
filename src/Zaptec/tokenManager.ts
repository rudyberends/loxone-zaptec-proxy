import querystring from 'querystring';
import logger from '../utils/troxorlogger';
import { apiRequest } from './apiRequest';

// Interface representing the structure of the token response from the OAuth API
interface TokenResponse {
  access_token: string; // The access token issued by the API
  expires_in: number;   // The duration in seconds until the token expires
}

/**
 * Class responsible for managing the access token used for authentication.
 */
class TokenManager {
  private accessToken: string = ''; // Holds the current access token
  private tokenExpiresAt: number = 0; // Timestamp for when the token expires

  /**
   * Retrieves the current access token. If the token is expired, it will refresh it.
   *
   * @returns {Promise<string>} A promise that resolves to the access token.
   *
   * @throws {Error} Throws an error if the token cannot be retrieved or refreshed.
   */
  async getAccessToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshToken(); // Refresh the token if it has expired
    }
    return this.accessToken; // Return the current access token
  }

  /**
   * Checks if the access token has expired.
   *
   * @returns {boolean} True if the token is expired, false otherwise.
   */
  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiresAt; // Compare current time with token expiration time
  }

  /**
   * Refreshes the access token by making a request to the OAuth API.
   *
   * @returns {Promise<void>} A promise that resolves when the token has been successfully refreshed.
   *
   * @throws {Error} Throws an error if the token refresh fails or the response is invalid.
   */
  private async refreshToken(): Promise<void> {
    // Prepare the POST data for the token request
    const postData = querystring.stringify({
      grant_type: 'password',
      username: process.env.ZAPTEC_USERNAME as string, // Retrieve the username from environment variables
      password: process.env.ZAPTEC_PASSWORD as string, // Retrieve the password from environment variables
    });

    // Define the API endpoint for refreshing the token
    const endpoint = '/oauth/token'; 

    logger.info('Refreshing token...'); // Log the action
    const data = await apiRequest(endpoint, postData); // Send the HTTPS request to refresh the token
    const jsonResponse: TokenResponse = JSON.parse(data); // Parse the JSON response

    // Store the new access token and calculate the expiration time
    this.accessToken = jsonResponse.access_token;
    this.tokenExpiresAt = Date.now() + jsonResponse.expires_in * 1000; // Set expiration time based on the API response
    logger.info('Token refreshed successfully.'); // Log the successful token refresh
  }
}

// Export an instance of the TokenManager class
export const tokenManager = new TokenManager();
