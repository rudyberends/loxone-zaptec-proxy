import { charger } from "./charger";
import { tokenManager } from "./tokenManager";
import { httpsRequest, extractMeterReading } from "./utils";
import logger from "./utils/troxorlogger";

// Define the initial state interface
export interface ChargerState {
  connected: number;
  charging: number;
  power: number;
  energy: number;
  meter_reading: number;
}

// Interface for the structure of the live data response from the charger
interface LiveDataResponse {
  State: {
    [key: string]: {
      ValueAsString?: string; // Optional string value for each state property
    };
  };
}

// ChargerStateManager class to handle the state of the charger
export class ChargerStateManager {
  private state: ChargerState;

  constructor() {
    this.state = {
      connected: 0,
      charging: 0,
      power: 0,
      energy: 0,
      meter_reading: 0,
    };
  }

  // Asynchronous method to fetch the initial state
  public async initialize(): Promise<void> {
    this.state = await this.createInitialState();
  }

  // Function to create the initial state object
  private async createInitialState(): Promise<ChargerState> {
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
    const meterReading = extractMeterReading(jsonResponse.State[554]?.ValueAsString);

    // Prepare the status data to return
    return {
      connected: mode === '1' ? 0 : 1, // Convert mode to connected status
      charging: mode === '3' ? 1 : 0, // Convert mode to charging status
      power,
      energy,
      meter_reading: meterReading,
    };
  }

  // Method to update the state
  public updateState(updates: Partial<ChargerState>): void {
    this.state = { ...this.state, ...updates };
    console.log("Updated State:", this.state);
  }

  // Method to get the current state
  public getState(): ChargerState {
    return this.state;
  }
}
