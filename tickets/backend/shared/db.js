'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLES = {
  EVENTS: process.env.DYNAMODB_TABLE_EVENTS || 'nsmt-events',
  TIERS:   process.env.DYNAMODB_TABLE_TIERS   || 'nsmt-ticket-tiers',
  ORDERS:  process.env.DYNAMODB_TABLE_ORDERS  || 'nsmt-orders',
  TICKETS: process.env.DYNAMODB_TABLE_TICKETS || 'nsmt-tickets',
  ORGS:    process.env.DYNAMODB_TABLE_ORGS    || 'nsmt-orgs',
};

module.exports = { ddb, TABLES };
