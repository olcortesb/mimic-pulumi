import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.Bucket("my-bucket");

// Export the name of the bucket
export const bucketName = bucket.id;

const iamForLambdaListen = new aws.iam.Role("iamForLambda", {assumeRolePolicy: `{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  `});

  const iamForLambdaResponse = new aws.iam.Role("iamForLambda", {assumeRolePolicy: `{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  `});

// Create a DynamoDB table
const mimicTable = new aws.dynamodb.Table("mimic-table", {
    attributes: [
        { name: "id", type: "S" },
    ],
    hashKey: "id",
    billingMode: "PROVISIONED",
    readCapacity: 1,
    writeCapacity: 1,
});
  
// Attach a policy to allow the Lambda function to access DynamoDB
const dynamoPolicyListen = new aws.iam.RolePolicy("dynamoPolicy", {
    role: iamForLambdaListen,
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Action: [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
            ],
            Effect: "Allow",
            Resource: [mimicTable.arn],
        }],
    },
});

// Attach a policy to allow the Lambda function to access DynamoDB
const dynamoPolicyResponse = new aws.iam.RolePolicy("dynamoPolicy", {
    role: iamForLambdaResponse,
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Action: [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
            ],
            Effect: "Allow",
            Resource: [mimicTable.arn],
        }],
    },
});

// Lambda listen
const lambda_listen = new aws.lambda.Function("lambda_listen_pulumi", {
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./repository/src"),
    }),
    role: iamForLambdaListen.arn,
    handler: "mimicListens.lambdaHandler",
    runtime: "nodejs18.x",
    timeout: 500,
    memorySize: 256,
    environment: {
        variables: {
            MIMIC_TABLE: mimicTable.name,
        },
    },
});

// Lambda response
const lambda_response = new aws.lambda.Function("lambda_response_pulumi", {
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./repository/src"),
    }),
    role: iamForLambdaResponse.arn,
    handler: "mimicResponse.lambdaHandler",
    runtime: "nodejs18.x",
    timeout: 500,
    memorySize: 256,
    environment: {
        variables: {
            MIMIC_TABLE: mimicTable.name,
        },
    },
});

export const dynamoTableName = mimicTable.name;