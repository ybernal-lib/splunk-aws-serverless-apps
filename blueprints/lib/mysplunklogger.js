
const url = require('url');

const Logger = function(config) {
    this.url = config.url;
    this.token = config.token;
    
    this.addMetadata = true;
    this.setSource = true;

    this.payloads = [];
};

// Simple logging API for Lambda functions
Logger.prototype.log = function(message, context) {
    this.logWithTime(Date.now(), message, context);
};

Logger.prototype.logWithTime = function(time, message, context) {
    const payload = {};

    if (Object.prototype.toString.call(message) === '[object Array]') {
        throw new Error("message argument must be a string or a JSON object.");
    }
    payload.event = message;

    // Add Lambda metadata
    if (typeof context !== 'undefined') {
        if (this.addMetadata) {
            // Enrich event only if it is an object
            if (message === Object(message)) {
                payload.event = JSON.parse(JSON.stringify(message)); // deep copy
                payload.event.awsRequestId = context.awsRequestId;
            }
        }
        if (this.setSource) {
            payload.source = `lambda:${context.functionName}`;
        }
    }

    payload.time = new Date(time).getTime() / 1000;

    this.logEvent(payload);
};

Logger.prototype.logEvent = function(payload) {
    this.payloads.push(JSON.stringify(payload));
};

Logger.prototype.flushAsync = function(callback) {
    callback = callback || (() => {});

    const parsed = url.parse(this.url);
    const options = {
        hostname: parsed.hostname,
        path: parsed.path,
        port: parsed.port,
        method: 'POST',
        headers: {
            'Authorization': `Splunk ${this.token}`
        },
        rejectUnauthorized: false,
    };
    const requester = require(parsed.protocol.substring(0, parsed.protocol.length - 1));

    console.log('Sending event');
    const req = requester.request(options, res => {
        res.setEncoding('utf8');

        console.log('Response received');
        res.on('data', data => {
            let error = null;
            if (res.statusCode != 200) {
                error = new Error(`error: statusCode=${res.statusCode}\n\n${data}`);
                console.error(error);
            } else {
                console.log('Sent');
            }
            this.payloads.length = 0;
            callback(error, data);
        });
    });

    req.on('error', error => {
        callback(error);
    });

    req.end(this.payloads.join(''), 'utf8');
};

module.exports = Logger;
