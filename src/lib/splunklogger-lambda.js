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

var SplunkLogger = require("splunk-logging").Logger;

// Override default built-in eventFormatter function
function _defaultEventFormatterForLambda(message, severity) {
    var event = message;
    return event;
};

// Extend SplunkLogger with simple Lambda logging API
SplunkLogger.prototype.log = function(message, context) {
    this.logWithTime(Date.now(), message, context);
};

SplunkLogger.prototype.logWithTime = function(time, message, context) {
    var payload = {
        message: {},
        metadata: {}
    };

    if (Object.prototype.toString.call(message) === '[object Array]') {
        throw new Error("message argument must be a string or a JSON object.");
    }
    payload.message = message;

    // Add Lambda metadata if available
    if (typeof context !== 'undefined') {
        var reqId = context.awsRequestId;
        if (typeof reqId !== 'undefined') {
            payload.message.awsRequestId = context.awsRequestId;
        }
        payload.metadata.source = context.functionName;
    }

    payload.metadata.time = new Date(time).getTime() / 1000;

    this.send(payload);
};

SplunkLogger.prototype.flushAsync = function(callback) {
    if (this.serializedContextQueue.length > 0) {
        this.flush(callback);
    } else {
        callback();
    }
};

module.exports = SplunkLogger;
