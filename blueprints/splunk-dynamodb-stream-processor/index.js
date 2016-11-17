/**
 * Stream events from AWS DynamoDB Stream to Splunk
 *
 * This function streams AWS DynamoDB Stream events to Splunk using
 * Splunk's HTTP event collector API.
 *
 * Follow these steps to configure the function to log to your Splunk
 * host:
 *
 * 1. Enter url address for your Splunk HTTP event collector endpoint.
 * Default port for event collector is 8088. Make sure no firewalls would prevent
 * your Lambda function from connecting to this port on your Splunk host(s).
 *
 * 2. Enter token for your Splunk HTTP event collector. To create a new token
 * for this Lambda function, refer to Splunk Docs:
 * http://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector#Create_an_Event_Collector_token
 */

'use strict';

const loggerConfig = {
    url: process.env.SPLUNK_HEC_URL || 'https://<HOST>:<PORT>/services/collector',
    token: process.env.SPLUNK_HEC_TOKEN || '<TOKEN>',
};

const SplunkLogger = require('./lib/mysplunklogger');

const logger = new SplunkLogger(loggerConfig);

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    event.Records.forEach((record) => {
        console.log('DynamoDB Record: %j', record.dynamodb);
        // Send record as JSON object with context object for additional metadata
        logger.log(record, context);
    });

    // Send all the events in a single batch to Splunk
    logger.flushAsync((error, response) => {
        if (error) {
            callback(error);
        } else {
            console.log(`Response from Splunk:\n${response}`);
            console.log(`Successfully processed ${event.Records.length} record(s).`);
            callback(null, event.Records.length); // Return number of records
        }
    });
};
