import { ServiceBusClient, ServiceBusReceiver } from '@azure/service-bus';
import logger from './utils/troxorlogger'; // Logger utility
import { tokenManager } from './tokenManager'; // Token management module
import { httpsRequest } from './utils'; // Your existing HTTPS request utility
import { messageDecoder } from './messageDecoder';
import { ChargerState } from './stateManager';

const chargerState = ChargerState.getInstance();

// Fetch connection details for Azure Service Bus
async function fetchConnectionDetails(accessToken: string) {
    const endpoint = '/api/installation/f4782e01-956d-4237-85e7-9b362cef8954/messagingConnectionDetails';

    try {
        const response = await httpsRequest(endpoint, null, accessToken);
        return JSON.parse(response); // Parse and return the JSON response
    } catch (error) {
        throw new Error(`Failed to fetch connection details: ${error}`);
    }
}

// Process messages from Azure Service Bus
export async function processMessages() {
    const accessToken = await tokenManager.getAccessToken();
    const connectionDetails = await fetchConnectionDetails(accessToken);

    const connectionString = `Endpoint=sb://${connectionDetails.Host}/;SharedAccessKeyName=${connectionDetails.Username};SharedAccessKey=${connectionDetails.Password}`;
    const serviceBusClient = new ServiceBusClient(connectionString);
    logger.debug("Connecting to Service Bus using %s", connectionString);

    const topicName = connectionDetails.Topic;
    const subscriptionName = connectionDetails.Subscription;

    const receiver: ServiceBusReceiver = serviceBusClient.createReceiver(topicName, subscriptionName);

    try {
        logger.info(`Starting message processing for topic: ${topicName}, subscription: ${subscriptionName}`);

        while (true) {
            const messages = await receiver.receiveMessages(10, { maxWaitTimeInMs: 5000 });

            if (messages.length === 0) {
                logger.debug("No messages received in this batch.");
                continue; // No messages, continue to the next iteration
            }

            for (const msg of messages) {
                try {
                    const decodedMessage = messageDecoder(new Uint8Array(msg.body));

                    if (decodedMessage.length > 0 && decodedMessage[0]?.text) {
                        const parsedData = JSON.parse(decodedMessage[0].text);
                        chargerState.handleChargerState(parsedData.StateId.toString(), parsedData.ValueAsString)
                    } else {
                        logger.warn("Decoded message does not contain expected text.");
                    }

                    await receiver.completeMessage(msg);
                    logger.info(`Completed message: ${msg.messageId}`);
                } catch (error) {
                    logger.error("Error processing message: %s", error);
                    logger.info("Message content: %o", msg.body);
                }
            }
        }
    } catch (err) {
        logger.error("Error during message processing: %s", err);
    } finally {
        await receiver.close(); // Close the receiver
        await serviceBusClient.close(); // Close the Service Bus client
    }
}