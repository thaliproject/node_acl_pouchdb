var Acl = require('../'), tests = require('./tests');

var PouchDB = require('pouchdb');
var memdown = require('memdown');
var db = new PouchDB('acl', {db : memdown});

describe('Levelup', function () {
  before(function () {
    this.backend = new Acl.pouchdbBackend(db, 'acl');
  });
  run();
});

function run() {
  Object.keys(tests).forEach(function (test) {
    tests[test]()
  })
}
