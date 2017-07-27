/**
 * Stream events from AWS IoT to Splunk
 *
 * This function streams AWS IoT events to Splunk using
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
 *
 * Once Lambda function created, add an AWS IoT Rule with Lambda action set to this function name.
 * For more details, including adding permissions to AWS IoT to invoke Lambda, refer to AWS Docs:
 * http://docs.aws.amazon.com/iot/latest/developerguide/iot-lambda-rule.html#iot-create-lambda-rule
 * http://docs.aws.amazon.com/iot/latest/developerguide/lambda-rule.html
 */

'use strict';

const loggerConfig = {
    url: process.env.SPLUNK_HEC_URL,
    token: process.env.SPLUNK_HEC_TOKEN,
};

const SplunkLogger = require('./lib/mysplunklogger');

const logger = new SplunkLogger(loggerConfig);

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Send event JSON (optional 'context' arg used to add Lambda metadata e.g. awsRequestId, functionName)
    logger.log(event, context);

    // Send event JSON with explicit timestamp
    // Change "Date.now()" below to event timestamp if specified in event payload
    logger.logWithTime(Date.now(), event, context);

    // Send all the events in a single batch to Splunk
    logger.flushAsync((error, response) => {
        if (error) {
            callback(error);
        } else {
            console.log(`Response from Splunk:\n${response}`);
            callback(null, event); // Echo back event itself
        }
    });
};
