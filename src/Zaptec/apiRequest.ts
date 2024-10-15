import https from 'https';
import logger from '../utils/troxorlogger';

/**
 * Makes an HTTPS request with the given options and optional post data.
 *
 * @param {string} endpoint - The API endpoint to call.
 * @param {string | null} postData - Optional data to be sent in the body of the request.
 * @param {string | null} accessToken - Optional access token for authorization. If provided, it will be used in the request.
 * @returns {Promise<string>} A promise that resolves with the response data as a string if the request is successful.
 * 
 * @throws {Error} Throws an error if the request fails or if the response status code indicates an error.
 */
export const apiRequest = async (endpoint: string, postData: string | null = null, accessToken: string | null = null): Promise<string> => {
  // Build the request options
  const options: https.RequestOptions = {
    method: postData ? 'POST' : 'GET',
    hostname: 'api.zaptec.com', // Static hostname
    path: `${endpoint}`, // Static path with dynamic endpoint
    headers: {
      'Content-Type': endpoint === '/oauth/token' ? 'application/x-www-form-urlencoded' : 'application/json',
    },
  };

  // If an access token is provided, add it to the Authorization header
  if (accessToken) {
    options.headers = {
      ...options.headers, // Preserve existing headers
      Authorization: `Bearer ${accessToken}`, // Add the Bearer token
    };
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          const errorMessage = `Request failed with status ${res.statusCode}: ${data}`;
          logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => reject(error));

    // If there is post data, write it to the request body
    if (postData) req.write(postData);

    // End the request
    req.end();
  });
};
