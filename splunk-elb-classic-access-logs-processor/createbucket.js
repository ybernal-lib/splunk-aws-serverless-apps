/*eslint no-unused-vars: [2, {"args": "after-used", "argsIgnorePattern": "^_"}]*/
/* function code borrows from code by https://stackoverflow.com/users/2518355/wjordan */
const AWS = require('aws-sdk');
const response = require('./lib/cfnresponse');

const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    const respond = (e) => response.send(event, context, e ? response.FAILED : response.SUCCESS, e ? e : {});
    process.on('uncaughtException', e => failed(e));
    const params = event.ResourceProperties;
    console.log('Parameters: ', JSON.stringify(params));
    delete params.ServiceToken;
    if (event.RequestType === 'Delete') {
        params.NotificationConfiguration = {};
        s3.putBucketNotificationConfiguration(params).promise()
        .then(_data => respond())
        .catch(_e => respond());
    } else {
        s3.putBucketNotificationConfiguration(params).promise()
        .then(_data => respond())
        .catch(e => respond(e));
    }
};
