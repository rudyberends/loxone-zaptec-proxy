import { ServiceBusClient, ServiceBusReceiver } from '@azure/service-bus';
import logger from '../../utils/troxorlogger'; // Logger utility
import { messageDecoder } from './messageDecoder';
import { ChargerState } from '../../stateManager';
import { installation } from '../installation';

const chargerState = ChargerState.getInstance();

// Process messages from Azure Service Bus
export async function processMessages() {
    const connectionDetails = await installation.fetchConnectionDetails();

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