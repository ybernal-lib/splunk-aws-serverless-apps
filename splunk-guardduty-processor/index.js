/**
 * Splunk logging for AWS Lambda
 *
 * This function logs to Splunk Enterprise using Splunk's HTTP event collector API.
 *
 * Define the following Environment Variables in the console below to configure
 * this function to log to your Splunk host:
 *
 * 1. SPLUNK_HEC_URL: URL address for your Splunk HTTP event collector endpoint.
 * Default port for event collector is 8088. Example: https://host.com:8088/services/collector
 *
 * 2. SPLUNK_HEC_TOKEN: Token for your Splunk HTTP event collector.
 * To create a new token for this Lambda function, refer to Splunk Docs:
 * http://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector#Create_an_Event_Collector_token
 *
 * For details about Splunk logging library used below: https://github.com/splunk/splunk-javascript-logging
 */

'use strict';

const loggerConfig = {
    url: process.env.SPLUNK_HEC_URL,
    token: process.env.SPLUNK_HEC_TOKEN,
    maxBatchCount: 0, // Manually flush events
    maxRetries: 3,    // Retry 3 times
};

const SplunkLogger = require('splunk-logging').Logger;

const logger = new SplunkLogger(loggerConfig);

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // First, configure logger to automatically add Lambda metadata and to hook into Lambda callback
    configureLogger(context, callback); // eslint-disable-line no-use-before-define

    // Log object or string with optional metadata parameters - useful to set input settings per event vs HEC token-level
    // For descripion of each metadata parameter, refer to:
    // http://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTinput#services.2Fcollector */
    logger.send({
        message: event,
        metadata: {
            time: Date.now(),
            host: 'sam',
            source: 'aws_cloudwatchevents_guardduty',
            sourcetype: 'aws:cloudwatch:guardduty',
            //index: 'main',
        },
    });

    // Send all the events in a single batch to Splunk
    logger.flush((err, resp, body) => {
        // Request failure or valid response from Splunk with HEC error code
        if (err || (body && body.code !== 0)) {
            // If failed, error will be handled by pre-configured logger.error() below
        } else {
            // If succeeded, body will be { text: 'Success', code: 0 }
            console.log('Response from Splunk:', body);
            callback(null, event.key1); // Echo back the first key value
        }
    });
};

const configureLogger = (context, callback) => {
    // Override SplunkLogger default formatter
    logger.eventFormatter = (event) => {
        // Enrich event here if needed but be aware it may break Splunk side parsing
        // It is best to enrich the actual GuardDuty finding object
        return event;
    };

    // Set common error handler for logger.send() and logger.flush()
    logger.error = (error, payload) => {
        console.log('error', error, 'context', payload);
        callback(error);
    };
};
