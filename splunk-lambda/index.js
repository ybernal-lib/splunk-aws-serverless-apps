/*
 * Copyright 2016 Splunk, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"): you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

/**
 * Splunk logging for AWS Lambda
 *
 * This function logs to a Splunk host using Splunk's event collector
 * API.
 *
 * Follow these steps to configure the function to log to your Splunk
 * host:
 *
 * 1. Enter url address for your Splunk HTTP event collector endpoint.
 * Default port for event collector is 8088. Make sure no firewalls will prevent
 * your Lambda function from connecting to this port on your Splunk host(s).
 *
 * 2. Enter token for your Splunk HTTP event collector. To create a new token
 * for this Lambda function, refer to Splunk Docs:
 * http://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector#Create_an_Event_Collector_token
 *
 * For optional advanced logging configuration like batching and retries,
 * refer to configuration parameters in Splunk JavaScript Logging library:
 * https://github.com/splunk/splunk-javascript-logging
 */

var SplunkLogger = require("./splunklogger-lambda");

var loggerConfig = {
    url: "https://<HOST>:<PORT>/services/collector",
    token: "<TOKEN>",
    batchInterval: 500 // batch & flush events every 500ms
};
 
var logger = new SplunkLogger(loggerConfig);
// Override default built-in eventFormatter function
logger.eventFormatter = function(message, severity) {
    return message;
};

// User code
exports.handler = function(event, context, callback) { 
    //log strings
    // logger.send('value1 =', event.key1);
    // logger.send('value2 =', event.key2);
    // logger.send('value3 =', event.key3);
    
    //log JSON objects
    logger.log(event, context);
    
    //specify the timestamp explicitly, useful for forwarding events like from AWS IOT
    //logger.logWithTime(Date.now(), event, context);

    //send all the events in a single batch to Splunk
    logger.flushAsync(function() {
        callback(event.key1);  // Echo back the first key value
    });
};
