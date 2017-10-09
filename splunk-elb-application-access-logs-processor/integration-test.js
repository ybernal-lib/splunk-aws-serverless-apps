var handler = require('./index').handler;

fs=require('fs');
var event = JSON.parse(fs.readFileSync('sampleEvent.json', 'utf8'));

handler(
	event,
    {
    	functionName: 'splunk-elb-application-access-logs-processor',
    	awsRequestId: Math.floor(Math.random() * Math.pow(10,10))
    },
    function() {
        console.log(Array.prototype.slice.call(arguments));
    }
);

console.log("Done");