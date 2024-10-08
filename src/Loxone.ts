import axios from 'axios';
import dotenv from 'dotenv';
import { ChargerState } from './stateManager'; // Import the ChargerState class
import logger from './utils/troxorlogger';

// Load environment variables from .env file
dotenv.config();

const MINISERVER_IP = process.env.MINISERVER_IP; // Miniserver IP address
const MINISERVER_USERNAME = process.env.MINISERVER_USERNAME; // Miniserver username
const MINISERVER_PASSWORD = process.env.MINISERVER_PASSWORD; // Miniserver password
const MINISERVER_INPUTNAME = process.env.MINISERVER_INPUTNAME; // Input name for the Zaptec API connector
const FUNCTION_BLOCK = 'Wb2'; // Define the function block name here

/**
 * Informs the Loxone Miniserver by sending a command.
 * Introduces a random delay to prevent flooding the server with requests.
 * 
 * @param command - The command to send to the Miniserver, formatted as per Loxone's API requirements.
 */
async function sendStateUpdate(command: string) {
  const url = `http://${MINISERVER_IP}/dev/sps/io/${MINISERVER_INPUTNAME}/${command}`;

  // Generate a random delay between 100 and 500 milliseconds
  const randomDelay = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  try {
    const response = await axios.get(url, {
      auth: {
        username: MINISERVER_USERNAME || '',
        password: MINISERVER_PASSWORD || '',
      },
    });
    logger.debug(`Response from Miniserver: ${response.data}`);
  } catch (error) {
    console.error('Error informing Miniserver:', error);
  }
}

/**
 * Sends the state update to the Loxone Miniserver based on the state name and its value.
 * 
 * @param stateName - The name of the state to update (e.g., 'EnableCharging').
 *                     This name corresponds to the states defined in the ChargerState.
 * @param value - The value to set for the state, which can be a number or a string.
 *                For digital inputs, this value is interpreted as 'On' or 'Off'.
 */
async function informMiniServer(stateName: string, value: number | string) {
  const chargerState = ChargerState.getInstance(); // Get the singleton instance of ChargerState
  const stateData = chargerState.getState(stateName); // Retrieve the state data for the specified stateName

  // Check if the state exists
  if (!stateData) {
    console.warn(`State "${stateName}" not found.`);
    return; // Exit if the state does not exist
  }

  const { loxoneID, inputType } = stateData; // Destructure the Loxone ID and input type from the state data
  let command: string;

  // Construct the command based on the input type
  if (inputType === 'digital') {
    command = `SET(${FUNCTION_BLOCK};${loxoneID};${value ? 'On' : 'Off'})`; // Command for digital inputs
  } else { // For analog inputs
    command = `SET(${FUNCTION_BLOCK};${loxoneID};${value})`; // Command for analog inputs
  }

  await sendStateUpdate(command); // Send the constructed command to the Miniserver
}

export { sendStateUpdate, informMiniServer }; // Export functions for use in other modules
