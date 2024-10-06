import https from 'https';
import logger from './utils/troxorlogger';

/**
 * Makes an HTTPS request with the given options and optional post data.
 *
 * @param {https.RequestOptions} options - The options for the HTTPS request, including method, hostname, path, headers, etc.
 * @param {string | null} postData - Optional data to be sent in the body of the request. If no data is needed, pass null.
 * @returns {Promise<string>} A promise that resolves with the response data as a string if the request is successful.
 * 
 * @throws {Error} Throws an error if the request fails or if the response status code indicates an error.
 */
export const httpsRequest = (options: https.RequestOptions, postData: string | null = null): Promise<string> => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      // Collect data chunks as they come in
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        // Resolve the promise if the response status code indicates success
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          // Log error and reject the promise if the status code indicates an error
          const errorMessage = `Request failed with status ${res.statusCode}: ${data}`;
          logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => {
      // Log any request errors and reject the promise
      logger.error('Request error:', error);
      reject(error);
    });

    // If there is post data, write it to the request
    if (postData) req.write(postData);
    
    // End the request
    req.end();
  });
};

/**
 * Extracts a meter reading from the given data string.
 *
 * @param {string | undefined} meterReadingData - The data string containing the meter reading information. 
 * If undefined or invalid, returns 0.
 * @returns {number} The extracted meter reading value as a number.
 * 
 * @throws {Error} Throws an error if the OCMF data format is invalid or the expected data structure is not found.
 */
export const extractMeterReading = (meterReadingData: string | undefined): number => {
  if (!meterReadingData) return 0; // Return 0 if no data provided

  try {
    // Split the data string to extract OCMF data
    const ocmfData = meterReadingData.split('OCMF|')[1];
    if (!ocmfData) throw new Error('Invalid OCMF format'); // Throw an error if the format is invalid

    // Parse the extracted OCMF data
    const parsedOCMF = JSON.parse(ocmfData);
    if (!parsedOCMF.RD || !parsedOCMF.RD[0] || !parsedOCMF.RD[0].RV) {
      throw new Error('Invalid OCMF data structure'); // Throw an error if the expected structure is not found
    }

    // Return the reading value as a float
    return parseFloat(parsedOCMF.RD[0].RV);
  } catch (error) {
    logger.error('Error parsing meter reading:', error); // Log parsing errors
    return 0; // Return 0 if there is an error
  }
};
