'use strict';

const { v4: uuidv4 } = require('uuid');

const prefixed = (prefix) => `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

module.exports = {
  eventId:  () => prefixed('evt'),
  tierId:   () => prefixed('tier'),
  orderId:  () => prefixed('ord'),
  ticketId: () => prefixed('tkt'),
};
