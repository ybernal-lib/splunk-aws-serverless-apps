/**
 * Stream events from AWS DynamoDB Stream to Splunk
 *
 * This function streams AWS DynamoDB Stream events to Splunk using
 * Splunk's HTTP event collector API.
 *
 * Define the following Environment Variables in the console below to configure
 * this function to stream events to your Splunk host:
 *
 * 1. SPLUNK_HEC_URL: URL address for your Splunk HTTP event collector endpoint.
 * Default port for event collector is 8088. Example: https://host.com:8088/services/collector
 *
 * 2. SPLUNK_HEC_TOKEN: Token for your Splunk HTTP event collector.
 * To create a new token for this Lambda function, refer to Splunk Docs:
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
        // Send record JSON object (optional 'context' arg used to add Lambda metadata e.g. awsRequestId, functionName)
        // Change to use "logger.logWithTime(<EVENT_TIMESTAMP>, record, context)" below if you want to
        // to pass in the timestamp from your event
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
