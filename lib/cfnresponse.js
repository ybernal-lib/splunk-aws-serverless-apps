/* Copyright 2015 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
   This file is licensed to you under the AWS Customer Agreement (the "License").
   You may not use this file except in compliance with the License.
   A copy of the License is located at http://aws.amazon.com/agreement/.
   This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied.
   See the License for the specific language governing permissions and limitations under the License. */
module.exports.SUCCESS = 'SUCCESS';
module.exports.FAILED = 'FAILED';
module.exports.send = function (event, context, responseStatus, responseData, physicalResourceId) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
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
            'content-length': responseBody.length
        }
    };
    const request = https.request(options, function(response) {
        console.log('Status code: ' + response.statusCode);
        console.log('Status message: ' + response.statusMessage);
        context.done();
    });
    request.on('error', function(error) {
        console.log('send(..) failed executing https.request(..): ' + error);
        context.done();
    });
    request.write(responseBody);
    request.end();
};

module.exports.testMe = function(param){
    console.log('testMe:: paramater output is ', param);
};
