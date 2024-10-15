import dotenv from 'dotenv'; // Import dotenv for environment variable management
import { informMiniServer } from "./Loxone/Loxone";
import logger from './utils/troxorlogger';
import { charger } from './Zaptec/charger';

// Load environment variables from .env file
dotenv.config();

export interface ChargerStateData {
    loxoneID: string;
    inputType: 'digital' | 'analog'; // Define the type of input
    value: number | string;
}

export class ChargerState {
    private static instance: ChargerState;
    private state: Record<string, ChargerStateData>;

    private constructor() {

        // Initialize with relevant states, their Loxone IDs, input types, and default values
        this.state = {
            'EnableCharging': { loxoneID: 'Ec', inputType: 'digital', value: 0 }, // Default: Charging disabled
            'VehicleConnected': { loxoneID: 'Vc', inputType: 'digital', value: 0 }, // Default: No vehicle connected
            'CurrentChargingPower': { loxoneID: 'Cp', inputType: 'analog', value: 0 }, // Default: No charging power
            'AssignedChargingPower': { loxoneID: 'Lm1', inputType: 'analog', value: 0 }, // Default: No charging power
            'MeterReading': { loxoneID: 'MrX', inputType: 'analog', value: 0 }, // Default: Meter reading 0
            'ChargingActive': { loxoneID: 'Cac', inputType: 'digital', value: 0 }, // Default: Charging inactive
        };
    }

    public static getInstance(): ChargerState {
        if (!ChargerState.instance) {
            ChargerState.instance = new ChargerState();
        }
        return ChargerState.instance;
    }

    async initializeState(): Promise<void> {
        try {
           
            const jsonResponse = await charger.pollChargerLiveData();
            
            // Iterate over the JSON response and handle each ID
            for (const [id, state] of Object.entries(jsonResponse.State)) {
                if (state && state.ValueAsString) {
                    this.handleChargerState(id, state.ValueAsString);
                }
            }

        } catch (error) {
            logger.error('Error initializing state from Zaptec API:', error);
        }
    }

    public handleChargerState(id: string, valueAsString: string | '1'): void {
        switch (id) {
            case '710': // Operation Mode
                const modeValue = parseInt(valueAsString) || 1; // Default to 1 if parsing fails
                this.updateChargerOperationMode(modeValue);
                break;
            case '513': // Current Charging Power
                const powerValue = parseFloat(valueAsString) || 0; // Default to 0 if parsing fails
                this.updateCurrentChargingPower(powerValue);
                break;
            case '553': // Total Energy Delivered - accumulate this for every session
                const deliveredValue = parseFloat(valueAsString) || 0; // Default to 0 if parsing fails
                break;
            default:
                logger.debug(`[ID ${id}] Not interested in this ID. (${valueAsString})`);
        }
    }

    updateState(key: string, value: number | string): void {
        if (this.state[key]) {
            this.state[key].value = value;
            // Inform the Loxone Miniserver about the state update
            informMiniServer(key, value);
        } else {
            console.warn(`State with key "${key}" not found.`);
        }
    }

    updateChargerOperationMode(mode: number): void {
        logger.info('Update ChargerOperationMode');
        switch (mode) {
            case 1:
                this.updateState('VehicleConnected', 0);
                this.updateState('ChargingActive', 0);
                break;
            case 2:
                this.updateState('VehicleConnected', 1);
                this.updateState('ChargingActive', 0);
                break;
            case 3:
                this.updateState('VehicleConnected', 1);
                this.updateState('ChargingActive', 1);
                break;
            case 5:
                this.updateState('VehicleConnected', 1);
                this.updateState('ChargingActive', 0);
                break;
            default:
                console.warn(`Unknown ChargerOperationMode: ${mode}`);
        }
    }

    updateCurrentChargingPower(totalChargePower: number): void {
        logger.info('Update ChargerChargingPower');
        const powerInKw = totalChargePower / 1000; // Convert watts to kilowatts

        // Ensure AssignedChargingPower is never less than 4 kW
        let assignedPowerInKw = powerInKw < 4 ? 4 : powerInKw;

        this.updateState('CurrentChargingPower', powerInKw);
        this.updateState('AssignedChargingPower', assignedPowerInKw);
    }

    getState(key: string): ChargerStateData | undefined {
        return this.state[key];
    }

    getAllStates(): Record<string, ChargerStateData> {
        return this.state;
    }
}
