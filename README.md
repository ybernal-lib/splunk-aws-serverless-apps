# splunk-aws-lambda-blueprints
Splunk AWS Lambda blueprints for AWS Lambda Console

## Getting Started

### Preqrequisites
- AWS CLI
- Node.js v4.3 or later.
- Splunk Enterprise 6.3.0 or later, or Splunk Cloud.
- Splunk HTTP Event Collector token from your Splunk Enterprise server.
- S3 bucket to host artifacts uploaded by CloudFormation e.g. Lambda ZIP deployment packages

You can use the following command to create the Amazon S3 bucket, say in `us-east-1` region
```
aws s3 mb s3://<my-bucket-name> --region us-east-1
```

### Installing

First, cd into any of the serverless applications:
```
cd splunk-cloudwatch-logs-processor
```
Then install node package dependencies:
```
npm install
```

### Packaging
Then build the function deployment package:
```
npm run build
```
This will package the necessary Lambda function(s) and dependencies into one local deployment zip `splunk-cloudwatch-logs-processor.zip`

Then upload all local artifacts needed by the SAM template to your previously created S3 bucket by running:
```
aws cloudformation package --template template.yaml --s3-bucket <my-bucket-name> --output-template-file template.output.yaml
```
The command returns a copy of the SAM template, in this case `template.output.yaml`, replacing all references to local artifacts with the S3 location where the command uploaded the artifacts. In particular, `CodeUri` property of the Lambda resource points to the deployment zip `splunk-cloudwatch-logs-processor.zip` in the Amazon S3 bucket that you specified.

### Deploying

```
aws cloudformation deploy --template $(pwd)/template.output.yaml --parameter-overrides SplunkHttpEventCollectorURL='https://<my-splunk-ip-or-fqdn>:8088/services/collector' SplunkHttpEventCollectorToken=<my-splunk-hec-token> CloudWatchLogsGroupName=<my-cwl-group-name> --capabilities "CAPABILITY_IAM" --stack-name my-cloudwatch-logs-forwarder-stack
```

## Dev & Test

### NPM tasks
For each serverless application, you can use the following npm tasks:

| command | description |
| --- | --- |
| `npm run lint` | run eslint rules against .js files |
| `npm run build` | create zip deployment package out of required .js files |
| `npm run clean` | remove zip deployment package |
| `npm run test` (or `npm test`) | run simple integration test with live Splunk instance. More details in section below. |

### Setup test environment

For test-driven development, you can easily run a simple integration test as you develop the Lambda function.
First, copy over the provided setEnv bash script in root folder:
```
cp setEnv.sh.template setEnv.sh
```
Modify `setEnv.sh` contents to set the values of `SPLUNK_HEC_URL` and `SPLUNK_HEC_TOKEN` to point to a local (or remote) Splunk Enterprise test instance and its valid HEC token. Then, source these environment variables:
```
source setEnv.sh
```
### Run integration test
Now, you can run a simple integration test to validate functionality of the Lambda function and ensure events are being indexed correctly in Splunk Enterprise:
```
npm test
```
This command first runs lint checks against Lambda function code. Only after successfully lint checks, this command will run the Lambda function passing it the event in `sampleEvent.json` along with `SPLUNK_HEC_URL` and `SPLUNK_HEC_TOKEN` environment variables. The function output and final status is directed to standard out. Here's an example of a successful execution:
```
> node integration-test.js

Received event: {
  "awslogs": {
    "data": "H4sIAAAAAAAAAHWPwQqCQBCGX0Xm7EFtK+smZBEUgXoLCdMhFtKV3akI8d0bLYmibvPPN3wz00CJxmQnTO41whwWQRIctmEcB6sQbFC3CjW3XW8kxpOpP+OC22d1Wml1qZkQGtoMsScxaczKN3plG8zlaHIta5KqWsozoTYw3/djzwhpLwivWFGHGpAFe7DL68JlBUk+l7KSN7tCOEJ4M3/qOI49vMHj+zCKdlFqLaU2ZHV2a4Ct/an0/ivdX8oYc1UVX860fQDQiMdxRQEAAA=="
  }
}
Done
Decoded payload: {
  "messageType": "DATA_MESSAGE",
  "owner": "123456789123",
  "logGroup": "testLogGroup",
  "logStream": "testLogStream",
  "subscriptionFilters": [
    "testFilter"
  ],
  "logEvents": [
    {
      "id": "eventId1",
      "timestamp": 1440442987000,
      "message": "[ERROR] First test message"
    },
    {
      "id": "eventId2",
      "timestamp": 1440442987001,
      "message": "[ERROR] Second test message"
    }
  ]
}
Sending event(s)
Response received
Response from Splunk:
{"text":"Success","code":0}
Successfully processed 2 log event(s).
[ null, 2 ]
```
The last few lines display a success response from Splunk HEC.


## Authors
* **Roy Arsan** - [rarsan](https://github.com/rarsan)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License
