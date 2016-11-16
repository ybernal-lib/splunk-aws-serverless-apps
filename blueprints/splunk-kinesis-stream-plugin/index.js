/**
 * Stream events from AWS Kinesis to Splunk
 *
 * This function streams AWS Kinesis events to Splunk using
 * Splunk's HTTP event collector API.
 *
 * Follow these steps to configure this function:
 *
 * 1. Enter url address for your Splunk HTTP event collector endpoint.
 * Default port for event collector is 8088. Make sure no firewalls would prevent
 * your Lambda function from connecting to this port on your Splunk host(s).
 *
 * 2. Enter token for your Splunk HTTP event collector. To create a new token
 * for this Lambda function, refer to Splunk Docs:
 * http://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector#Create_an_Event_Collector_token
 */

var loggerConfig = {
    url: process.env['SPLUNK_HEC_URL'] || 'https://<HOST>:<PORT>/services/collector',
    token: process.env['SPLUNK_HEC_TOKEN'] || '<TOKEN>'
};

var SplunkLogger = require("./lib/mysplunklogger");
var logger = new SplunkLogger(loggerConfig);

// User code
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    event.Records.forEach((record) => {
        // Kinesis data is base64 encoded so decode here
        var data = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        var splunkEvent = null;
        
        try {
            splunkEvent = JSON.parse(data);
            // change "time" below to be the timestamp from your event
            logger.logWithTime(splunkEvent.time, splunkEvent, context);
        } catch(exception) {
            splunkEvent = data;
            // change to use logWithTime() below if you want to pass in the timestamp from your event 
            logger.log(splunkEvent, context);
        }
    });

     //send all the events in a single batch to Splunk
    logger.flushAsync((error, response) => {
        if (error) {
            callback(error);
        } else {
            console.log(`Successfully processed ${event.Records.length} record(s).`);
            callback(null, event.Records.length); // Return number of records
        }
    });
};
