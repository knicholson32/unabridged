// import { Low, JSONFile } from 'lowdb';
// import type { Data } from '$lib/types';
// const dbObj = new Low(new JSONFile<Data>('db.json'));
// let loaded = false;

import * as AWS from 'aws-sdk';
import type { DeleteItemInput, GetItemInput, Key, PutItemInput, PutItemInputAttributeMap, TableName, UpdateItemInput, UpdateExpression, ConditionExpression, ExpressionAttributeNameMap, ExpressionAttributeValueMap, CreateTableInput, ScanInput } from 'aws-sdk/clients/dynamodb';
import type { AWSError } from 'aws-sdk';
import type { GenericOperationData, LibraryItemBookInfo, Profile } from '$lib/types';

// ENVIRONMENTAL VARIABLES
// = AWS Settings
// - AWS_REGION                     AWS region.             Default = local
// - AWS_ACCESS_KEY_ID              AWS Access Key ID.      Default = defaultId
// - AWS_SECRET_ACCESS_KEY          AWS Access Key Secret.  Default = defaultKey
// - AWS_DYNAMO_ENDPOINT            AWS Dynamo Endpoint.    Default = http://dynamodb:8000
//
// = Unabridged Settings
// - LIBRARY_DYNAMO_TABLE_NAME      Name of the library table.  Default = unabridged-library
// - PROFILES_DYNAMO_TABLE_NAME     Name of the profiles table. Default = unabridged-profiles
// - CREATE_TABLES                  Whether or not to create Dynamo Tables. 'true' = create

// Configure AWS for local use by default
AWS.config.update({
    region: process.env.AWS_REGION || 'local',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'defaultId',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'defaultKey'
    },
    dynamodb: {
        endpoint: process.env.AWS_DYNAMO_ENDPOINT || 'http://dynamodb:8000'
    }
});

// Used for interacting with DynamoDB Table items
const docClient = new AWS.DynamoDB.DocumentClient();

// Used for creating DynamoDB Tables
const dynamodb = new AWS.DynamoDB();

/**
 * Wrapper for interacting with DynamoDB Tables
 */
class Table <T = {[key: string]: any}>{
    public tableName: TableName;
    public hashKey: string;
    public sortKey?: string;
    private _initialized = false;

    constructor(tableName: TableName, hashKey: string, sortKey?: string) {
        this.tableName = tableName;
        this.hashKey = hashKey;
        this.sortKey = sortKey;
    }

    // Initialize this table by attempting to create it. If it already exists, do nothing
    public async initialize() {
        // TODO: Fix This!! Hack becuase process.env isnt getting set by the docker compose file
        if (true || process.env.CREATE_TABLES === 'true') {
            try {
                await this.createTable();
                console.log('Created ' + this.tableName + ' Dynamo Table');
            } catch (err) {
                if ((err as AWSError).code !== 'ResourceInUseException')
                    console.error(this.tableName + 'Init Error', err);
                else console.log(this.tableName + ' Exists');
            }
        }

        this._initialized = true;
        return this;
    }

    // Create this table based on the table name, hash key, and sort key. This only supports hash
    // and sort keys of type string.
    private async createTable() {

        const AttributeDefinitions = [{
            AttributeName: this.hashKey,
            AttributeType: "S"
        }];

        const KeySchema = [{
            AttributeName: this.hashKey,
            KeyType: "HASH"
        }];

        if (this.sortKey !== undefined) {
            AttributeDefinitions[1] = {
                AttributeName: this.sortKey,
                AttributeType: "S"
            }
            KeySchema[1] = {
                AttributeName: this.sortKey,
                KeyType: "RANGE"
            }
        }

        const params: CreateTableInput = {
            AttributeDefinitions,
            KeySchema,
            TableName: this.tableName,
            BillingMode: 'PAY_PER_REQUEST'
        };

        return dynamodb.createTable(params).promise();
    }

    // Ensure this table has been initialized
    private validate() {
        if (!this._initialized) throw Error(this.tableName + ' Table not initialized');
    }

    /**
     * Put the given item into the table
     */
    public async put(item: T) {
        this.validate();

        const params: PutItemInput = {
            TableName: this.tableName,
            Item: item as PutItemInputAttributeMap
        };

        return docClient.put(params).promise();
    }

    /**
     * Get the given item from the table
     */
    public async get(key: { [key: string] : any }): Promise<T> {
        this.validate();

        const params: GetItemInput = {
            TableName: this.tableName,
            Key: key as Key
        }

        const resp = await docClient.get(params).promise();
        return resp.Item as T;
    }

    /**
     * Delete the given item from the table
     */
    public async delete(key: Key) {
        this.validate();

        const params: DeleteItemInput = {
            TableName: this.tableName,
            Key: key
        }

        return docClient.delete(params).promise();
    }

    /**
     * Update the given item using the given options
     */
    public async update(key: { [key: string] : any }, options?: {
        updateExpression: UpdateExpression,
        conditionExpression: ConditionExpression
        expressionAttributeNames: ExpressionAttributeNameMap,
        expressionAttributeValues: ExpressionAttributeValueMap
    }) {
        this.validate();

        const params: UpdateItemInput = {
            TableName: this.tableName,
            Key: key as Key,
            UpdateExpression: options?.updateExpression, //'set #a = :x + :y',
            ConditionExpression: options?.conditionExpression, //'#a < :MAX',
            ExpressionAttributeNames: options?.expressionAttributeNames, //{'#a' : 'Sum'},
            ExpressionAttributeValues: options?.expressionAttributeValues, //{ ':x' : 20, ':y' : 45, ':MAX' : 100 }
            ReturnValues: 'ALL_NEW'
        }

        const resp = await docClient.update(params).promise()

        // Grab the attributes value out of the response
        if ('Attributes' in resp) return resp.Attributes as T;
        else return undefined;
    }

    /**
     * Update the given item using the given options
     */
    public async scan() {
        this.validate();

        const params: ScanInput = {
            TableName: this.tableName,
            Limit: 10
        }

        const resp = await docClient.scan(params).promise()

        // Grab the attributes value out of the response
        if ('Items' in resp) return resp.Items as T[];
        else return undefined;
    }
}

export const libraryTable = await new Table<LibraryItemBookInfo>(process.env.LIBRARY_DYNAMO_TABLE_NAME || 'unabridged-library', 'asin').initialize();
export const profilesTable = await new Table<Profile>(process.env.PROFILES_DYNAMO_TABLE_NAME || 'unabridged-profiles', 'name').initialize();
export const operationStore: { [key: string]: GenericOperationData} = {};