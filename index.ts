import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.Bucket("my-bucket");

// Export the name of the bucket
export const bucketName = bucket.id;

const iamForLambdaListen = new aws.iam.Role("iamForLambdaListen", {
    assumeRolePolicy: `{
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

const iamForLambdaResponse = new aws.iam.Role("iamForLambdaResponse", {
    assumeRolePolicy: `{
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
const dynamoPolicyListen = new aws.iam.RolePolicy("dynamoPolicyListen", {
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
const dynamoPolicyResponse = new aws.iam.RolePolicy("dynamoPolicyReponse", {
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

const restApi = new aws.apigateway.RestApi("mimic-api", {});

// Create a resource under the REST API
const resource = new aws.apigateway.Resource("mimicresource", {
    restApi: restApi,
    parentId: restApi.rootResourceId,
    pathPart: "mimic",
});

const restApiDeployment = new aws.apigateway.Deployment("example", {
    restApi: restApi.id,
});

const exampleStage = new aws.apigateway.Stage("example", {
    deployment: restApiDeployment.id,
    restApi: restApi.id,
    stageName: "example",
});

// Add a method (GET) to the created resource
const methodGet = new aws.apigateway.Method("mimicpost", {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: "POST",
    authorization: "NONE",
});

const methodPost = new aws.apigateway.Method("mimiget", {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: "GET",
    authorization: "NONE",
    requestParameters: {
        "method.request.path.id": true 
    }
});


// Set up an integration between the method and the Lambda function
const integrationListen = new aws.apigateway.Integration("integrationsListen", {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: methodGet.httpMethod,
    integrationHttpMethod: "GET",
    type: "AWS_PROXY",
    uri: lambda_listen.invokeArn,
});

// Set up an integration between the method and the Lambda function
const integrationResponse = new aws.apigateway.Integration("integrationsResponse", {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: methodPost.httpMethod,
    integrationHttpMethod: "POST",
    type: "AWS_PROXY",
    uri: lambda_response.invokeArn,
});

new aws.lambda.Permission("apigatewayListen", {
    action: "lambda:invokeFunction",
    function: lambda_listen,
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate`${restApi.executionArn}/*/*`,
});

new aws.lambda.Permission("apigatewayResponse", {
    action: "lambda:invokeFunction",
    function: lambda_response,
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate`${restApi.executionArn}/*/*`,
});


// CloudWatch

const logGroupListen = new aws.cloudwatch.LogGroup("mimic-listen-pulumi", {
    name: "/aws/lambda/lambda-listen-pulumi",
    retentionInDays: 7, // keep logs for 7 days; customize retention as needed
});

const logGroupResponse = new aws.cloudwatch.LogGroup("mimic-response-pulumi", {
    name: "/aws/lambda/lambda-response-pulumi",
    retentionInDays: 7, // keep logs for 7 days; customize retention as needed
});


// Attach the AWSLambdaBasicExecutionRole policy to the role
const lambdaRolePolicyAttachmentListen = new aws.iam.RolePolicyAttachment("lambdaRolePolicyAttachmentListen", {
    role: iamForLambdaListen,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

const lambdaRolePolicyAttachmentResponse = new aws.iam.RolePolicyAttachment("lambdaRolePolicyAttachmentResponse", {
    role: iamForLambdaResponse,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});


const lambdaExecutionPolicyLogs = new aws.iam.Policy("lambdaExecutionPolicyLogs", {
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            Resource: "arn:aws:logs:*:*:*",
            Effect: "Allow",
        }],
    },
});

const lambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment("lambdaRoleLogPolicyAttachmentListen", {
    role: iamForLambdaListen.name,
    policyArn: lambdaExecutionPolicyLogs.arn,
});


// To ensure the Lambda function has permissions to create and put logs
const lambdaLogPermission = new aws.lambda.Permission("lambdaLogPermission", {
    action: "lambda:InvokeFunction",
    function: lambda_listen.arn,
    principal: "logs.amazonaws.com",
    sourceArn: logGroupListen.arn,
});


export const dynamoTableName = mimicTable.name;
export const restApiUrl = pulumi.interpolate`${restApi.executionArn}/*/*`;