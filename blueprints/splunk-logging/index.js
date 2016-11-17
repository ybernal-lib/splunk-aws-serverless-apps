/**
 * Splunk logging for AWS Lambda
 *
 * This function logs to a Splunk host using Splunk's HTTP event collector
 * API.
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
    // Log strings
    logger.log(`value1 = ${event.key1}`, context);
    logger.log(`value2 = ${event.key2}`, context);
    logger.log(`value3 = ${event.key3}`, context);

    // Log JSON objects
    logger.log(event);

    // Log JSON objects with context object for additional Lambda metadata such as awsRequestId
    logger.log(event, context);

    // Specify the timestamp explicitly, useful for forwarding events with embedded
    // timestamps like from AWS IoT, AWS Kinesis, AWS CloudWatch Logs
    logger.logWithTime(Date.now(), event, context);

    // Send all the events in a single batch to Splunk
    logger.flushAsync((error, response) => {
        if (error) {
            callback(error);
        } else {
            console.log(`Response from Splunk:\n${response}`);
            callback(null, event.key1); // Echo back the first key value
        }
    });
};
