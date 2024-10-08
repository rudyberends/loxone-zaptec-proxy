import logger from './utils/troxorlogger'; // Logger utility
import { processMessages } from './serviceBusSubscriber';


// Start processing messages
processMessages().catch(err => {
    logger.error("Error in processMessages: %s", err);
});
