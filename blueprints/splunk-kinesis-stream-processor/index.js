/**
 * Stream events from AWS Kinesis to Splunk
 *
 * This function streams AWS Kinesis events to Splunk using
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
        // Kinesis data is base64 encoded so decode here
        const data = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        let item = null;

        try {
            item = JSON.parse(data);
            // Send item JSON object (optional 'context' arg used to add Lambda metadata e.g. awsRequestId, functionName)
            // Change "item.time" below if time is specified in another field in the event
            // Change to use "logger.log(item, context)" if no time field is present in event
            logger.logWithTime(item.time, item, context);
        } catch (exception) {
            item = data;
            // Change to use "logger.logWithTime(<EVENT_TIMESTAMP>, item, context)" below if you want to
            // to pass in the timestamp from your event
            logger.log(item, context);
        }
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
