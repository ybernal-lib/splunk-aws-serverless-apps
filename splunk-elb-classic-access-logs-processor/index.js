/**
 * Forward Classic Load Balancer Access Logs from S3 to Splunk via AWS Lambda
 *
 * This function streams events to Splunk Enterprise using Splunk's HTTP event collector API.
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
 */

'use strict';

const loggerConfig = {
    url: process.env.SPLUNK_HEC_URL,
    token: process.env.SPLUNK_HEC_TOKEN,
    maxBatchCount: 0, // Manually flush events
    maxRetries: 3,    // Retry 3 times
};

const SplunkLogger = require('splunk-logging').Logger;
const aws = require('aws-sdk');

const logger = new SplunkLogger(loggerConfig);
const s3 = new aws.S3({ apiVersion: '2006-03-01' });

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // First, configure logger to automatically add Lambda metadata and to hook into Lambda callback
    configureLogger(context, callback); // eslint-disable-line no-use-before-define

    // Get the S3 object from the S3 put event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };
    s3.getObject(params, (error, data) => {
        if (error) {
            console.log(error);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            console.log(`Retrieved access log: LastModified="${data.LastModified}" ContentLength=${data.ContentLength}`);
            const payload = data.Body;
            const parsed = payload.toString('ascii');
            const logEntries = parsed.split('\n');
            let count = 0;
            let time;

            if (logEntries) {
                logEntries.forEach((logEntry) => {
                    if (logEntry) {
                        // Extract timestamp as 1st field in log entry
                        // For more details: http://docs.aws.amazon.com/elasticloadbalancing/latest/classic/access-log-collection.html#access-log-entry-format
                        time = logEntry.split(' ')[0];

                        /* Send log entry to Splunk with optional metadata properties such as time, index, source, sourcetype, and host.
                        - Set or remove metadata properties as needed. For descripion of each property, refer to:
                        http://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTinput#services.2Fcollector */
                        logger.send({
                            message: logEntry,
                            metadata: {
                                time: new Date(time).getTime() / 1000,
                                host: 'serverless',
                                source: `s3://${bucket}/${key}`,
                                sourcetype: 'aws:elb:accesslogs',
                                //index: 'main',
                            },
                        });
                        count += 1;
                    }
                });
                console.log(`Processed ${count} log entries`);
            }

            logger.flush((err, resp, body) => {
                // Request failure or valid response from Splunk with HEC error code
                if (err || (body && body.code !== 0)) {
                    // If failed, error will be handled by pre-configured logger.error() below
                } else {
                    // If succeeded, body will be { text: 'Success', code: 0 }
                    console.log('Response from Splunk:', body);
                    console.log(`Successfully forwarded ${count} log entries.`);
                    callback(null, count); // Return number of log events
                }
            });
        }
    });
};

const configureLogger = (context, callback) => {
    // Override SplunkLogger default formatter
    logger.eventFormatter = (event) => {
        // Enrich event only if it is an object
        if (typeof event === 'object' && !Object.prototype.hasOwnProperty.call(event, 'awsRequestId')) {
            event.awsRequestId = context.awsRequestId; // eslint-disable-line no-param-reassign
        }
        return event;
    };

    // Set common error handler for logger.send() and logger.flush()
    logger.error = (error, payload) => {
        console.log('error', error, 'context', payload);
        callback(error);
    };
};
