/**
* Create AWS DynamoDB Stream to be used by Splunk
*
* This function creates AWS DynamoDB Stream to be used by Splunk
*
*/

'use strict';

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB({ version: '2012-08-10' });

const SUCCESS = 'SUCCESS';
const FAILED = 'FAILED';
/*function sendResponse(event, context, callback, status, data, err) {
    const reason = err ? err.message : '';
    const responseBody = {
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: "",
        Status: status,
        Reason: 'See details in CloudWatch Log:' + context.logStreamName,
        Body: data,
    };

    console.log('RESPONSE:\n', responseBody);
    const json = JSON.stringify(responseBody);

    const https = require('https');
    const url = require('url');

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': json.length,
        },
    };

    const request = https.request(options, (response) => {
        console.log('STATUS: ', response.statusCode);
        console.log('HEADERS: ', JSON.stringify(response.headers));
        context.done(null, data);
    });

    request.on('error', (error) => {
        console.log('sendResponse Error:\n', error);
        context.done(error);
    });

    request.on('end', () => {
        console.log('end');
    });
    request.write(json);
    request.end();
}

*/

function sendResponse(event, context, responseStatus, responseData, physicalResourceId) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
        PhysicalResourceId: physicalResourceId || context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData });

    const https = require('https');
    const url = require('url');

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': responseBody.length } };

    const request = https.request(options, (response) => {
        console.log(`Status code: ${response.statusCode}`);
        console.log(`Status message: ${response.statusMessage}`);
        context.done();
    });

    request.on('error', (error) => {
        console.log(`send(..) failed executing https.request(..): ${error}`);
        context.done();
    });
    request.write(responseBody);
    request.end();
}
/********************************************************
 * This function modeled after:
 * https://github.com/andrew-templeton/cfn-dynamodb-streamspecification/blob/master/index.js
 ********************************************************/
function stabilizeTable(table, callback) {
    // Count number of times we check if Table is ACTIVE
    let numberOfTrys = 0;
    // Wait 2 second before recursive calls to check state
    const timeToWaitInMs = 2000;
    // Try 15 times in 2 sec increment - i.e. appx. 30  seconds
    const maximumTrysAllowed = 16;
    // recursive function that checks Table Status
    function wait() {
        dynamodb.describeTable({
            TableName: table,
        }, (describeTableErr, describeTableData) => {
            if (describeTableErr) {
                console.log('wait::Describe table failed: %j', describeTableErr);
                callback(describeTableErr);
            }
            // No errors, check state
            if (describeTableData.Table.TableStatus !== 'ACTIVE') {
                if (numberOfTrys < maximumTrysAllowed) {
                    // This is fine then.
                    numberOfTrys += 1;
                    console.log('wait::Table not ACTIVE yet, waiting longer, making recursive call');
                    // Ensure no flooding by waiting for the interval to go by.
                    return setTimeout(wait, timeToWaitInMs);
                }
                // Else get really mad!
                console.error('wait::TIMEOUT passed by and table is still not ACTIVE');
                callback({
                    message: 'Table took too long to stabilize after StreamSpecification change.',
                });
            }
            // Status is ACTIVE so be happy and callback
            console.log('wait::Table stabilized and is ACTIVE');
            console.log('wait::Returning data', JSON.stringify(describeTableData));
            callback(null, describeTableData);
        });
    }

    // Begin recursively checking.
    console.log('stabilizeTable::Beginning wait sequence to allow Table to stabilize to ACTIVE...');
    wait();
}
/**************************************************************
 *
 *************************************************************/
function createTableStream(pTableName, pStreamViewType, callback) {
    console.log('createTableStream for  table: %j', pTableName, pStreamViewType);
    dynamodb.updateTable({
        TableName: pTableName,
        StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: pStreamViewType,
        },
    }, (error, data) => {
        if (error) {
            console.log('createTableStream::Error when attempting StreamSpecification addition activation: %j', error);
            callback(error);
        }
        console.log('createTableStream::Successfully triggered StreamSpecification addition (but not complete yet): %j', JSON.stringify(data));
        stabilizeTable(pTableName, callback);
    });
}


exports.handler = (event, context, callback) => {
    // extract Table and Stream Type out of CF request
    const DynamoTableName = event.ResourceProperties.DynamoTableName;
    const StreamViewType = event.ResourceProperties.StreamViewType;

    const physicalResource = `${DynamoTableName}::${StreamViewType}`;
    //const responseStatus = 'FAILED';
    //const responseData = { TEST: 'TEST' };

    let hasStreamAlready = false;
    console.log('handler::REQUEST RECEIVED:\n', JSON.stringify(event));
    console.log('handler::RequestType:', event.RequestType);

    const params = {
        TableName: DynamoTableName, /* required */
    };

    // get current status and description of the DynamoDB table
    dynamodb.describeTable(params, (err, descTableData) => {
        if (err) {
            // error occured while doing describeTable
            console.log(err, err.stack); // an error occurred
            //callback(err);
            sendResponse(event, context, FAILED, err, physicalResource);
        } else {
            // describeTable was successfull, check if it already has a stream
            console.log('handler::', params.TableName, ' status is ', descTableData.Table.TableStatus);
            console.log('handler:: data from tableDescribe: ', JSON.stringify(descTableData));
            if (descTableData.Table.StreamSpecification && descTableData.Table.StreamSpecification.StreamEnabled) {
                hasStreamAlready = true;
            }
            console.log('handler:: table already has stream? : ', hasStreamAlready);
        }
    });


    // For Delete requests, immediately send a SUCCESS response.
    if (event.RequestType === 'Delete') {
        console.log('handeler::DELETE::DynamoDB stream exists?', hasStreamAlready);
        if (hasStreamAlready) {
            sendResponse(event, context, SUCCESS, '{Message:Table already has an enabled StreamSpecification!}', physicalResource);
        } else {
            sendResponse(event, context, SUCCESS, '', physicalResource);
        }

    } else if (event.RequestType === 'Update') {
        //sendResponse(event, context, "SUCCESS");
        //return;
    } else if (event.RequestType === 'Create') {
        console.log('handeler::CREATE::DynamoDB stream creation');
        // if there is stream alrady , bail out
        if (hasStreamAlready) {
            console.log('handeler::CREATE::DynamoDB stream already exists');
            sendResponse(event, context, FAILED, '{Message:Table already has an enabled StreamSpecification!}', physicalResource);
        }

        // create stream
        createTableStream(DynamoTableName, StreamViewType,
            (createError, createData) => {
                if (createError) {
                    console.error('handler::CREATE::Failed to create DynamoDB Stream, error ', createError);
                    //callback(createError);
                    sendResponse(event, context, FAILED, createError, physicalResource);
                } else {
                    console.log('handeler::CREATE::DynamoDB stream has been created:', JSON.stringify(createData));
                    const data = {
                        Arn: createData.Table.LatestStreamArn,
                    };
                    //const response = buildresponse(event, context, 'SUCCESS', 'physicalId', data);
                    //console.log('handler:: Response is: ', response);
                    //cfnresponse.send(event, context, cfnresponse.SUCCESS, data);
                    //callback(null, response);
                    sendResponse(event, context, SUCCESS, data, physicalResource);
                }
            });
    }


    //sendResponse(event, context, callback, 'SUCCESS', responseData, null);
};

