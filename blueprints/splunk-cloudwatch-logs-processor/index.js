/**
 * Stream events from AWS CloudWatch Logs to Splunk
 *
 * This function streams AWS CloudWatch Logs to Splunk using
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

var zlib = require('zlib');
var SplunkLogger = require("./lib/mysplunklogger");
var logger = new SplunkLogger(loggerConfig);

exports.handler = (event, context, callback) => {
    // CloudWatch Logs data is base64 encoded so decode here
    var payload = new Buffer(event.awslogs.data, 'base64');
    zlib.gunzip(payload, (err, result) => {
        if (err) { 
            callback(err);
        } else {
            result = JSON.parse(result.toString('ascii'));
            console.log("Event Data:", JSON.stringify(result, null, 2));
            var count = result && result.logEvents && result.logEvents.length || 0;
            if (count > 0) {
                result.logEvents.forEach((item, index) => {
                    logger.logWithTime(item.timestamp, item.message, context);
                });
            }
            //send all the events in a single batch to Splunk
            logger.flushAsync((error, response) => {
                if (error) {
                    callback(error);
                } else {
                    console.log(`Successfully processed ${count} log event(s).`);
                    callback(null, count); // Return number of log events
                }
            });
        }
    });
};
