[![Build Status](https://travis-ci.org/thaliproject/node_acl_pouchdb.png)](https://travis-ci.org/thaliproject/node_acl_pouchdb)
[![GitHub version](http://img.shields.io/github/tag/thaliproject/node_acl_pouchdb.svg)](https://github.com/thaliproject/node_acl_pouchdb)
[![NPM version](http://img.shields.io/npm/v/node_acl_pouchdb.svg)](https://npmjs.org/package/node_acl_pouchdb)
[![Downloads](http://img.shields.io/npm/dm/node_acl_pouchdb.svg)](https://npmjs.org/package/node_acl_pouchdb)

# LevelUp adapter for ACL #

This project is an adapter for [PouchDB](http://pouchdb.com/) library for the [NODE ACL](https://github.com/OptimalBits/node_acl) project.

## Installation ##

```bash
$ npm install node_acl_pouchdb
```

## Usage ##

You can get started by simply creating a new PouchDB instance with the backing store of your choice, whether it is remote, local, WebSQL, [SQLite](http://sqlite.org/), or [LevelDB](https://github.com/google/leveldb).  LevelDB is the default with node.js, so you can use [MemDOWN](https://github.com/rvagg/node-memdown) for an in memory solution such as the following:

```js
// PouchDB
var PouchDB = require('pouchdb');
var memdown = require('memdown');
var db = new PouchDB('acl', {db : memdown});

var Acl = require('node_acl_pouchdb');

var acl = new Acl(new Acl.pouchdbBackend(db, 'acl'));

// guest is allowed to view blogs
acl.allow('guest', 'blogs', 'view', function (err) {
  if (err) { throw err; }

  // Add a user to guest
  acl.addUserRoles('joed', 'guest', function (err) {
    if (err) { throw err; }

    // Check whether user joed can view blogs
    acl.isAllowed('joed', 'blogs', 'view', function(err, result) {
      if (err) { throw err; }

      console.log('User joed is allowed to view blogs? ', result);
  });
});
// => User joed is allowed to view blogs? true
```

## Known Issues ##

Currently, due to sequencing issues within the NODE ACL project, the batch processing of allowing resources is not supported, such as the following:

```js
acl.allow(
  [
    {
      roles: 'fumanchu',
      allows: [
        {resources: 'blogs', permissions: 'get'},
        {resources: ['forums','news'], permissions: ['get','put','delete']},
        {resources: ['/path/file/file1.txt', '/path/file/file2.txt'], permissions: ['get','put','delete']}
      ]
    }
  ],
  function (err) {
    if (err) { throw err; }
  }
);
```

Instead, the nested approach is the only approach which works.
```js
acl.allow('fumanchu', ['blogs'], ['get'], function (err) {
  if (err) { throw err; }

  acl.allow('fumanchu', ['forums', 'news'], ['get', 'put', 'delete'], function (err) {
    if (err) { throw err; }

    acl.allow('fumanchu', ['/path/file/file1.txt', '/path/file/file2.txt'], ['get', 'put', 'delete'], function (err) {
      if (err) { throw err; }
    })
  });
});
```

This can be of course alleviated by such modules as [async](https://github.com/caolan/async).

```js
var async = require('async');

async.series([
  function (cb) {
    acl.allow('fumanchu', ['blogs'], ['get'], cb);
  },
  function (cb) {
    acl.allow('fumanchu', ['forums', 'news'], ['get', 'put', 'delete'], cb);
  },
  function (cb) {
    acl.allow('fumanchu', ['/path/file/file1.txt', '/path/file/file2.txt'], ['get', 'put', 'delete'], cb);
  }
], function (err) {
  if (err) { throw err; }
});
```

Or even [RxJS](https://github.com/Reactive-Extensions/RxJS).
```js
var Rx = require('rx');

var allow = Rx.Observable.fromNodeCallback(acl.allow, acl);

var source = Rx.Observable.concat(
  allow('fumanchu', ['blogs'], ['get']),
  allow('fumanchu', ['forums', 'news'], ['get', 'put', 'delete']),
  allow('fumanchu', ['/path/file/file1.txt', '/path/file/file2.txt'], ['get', 'put', 'delete'])
);

source.subscribe(
  function () { /* Nothing to see here */ },
  function (err) { console.log(err); },
  function () { console.log('done'); }
)
```

## License ##

The MIT License (MIT)

Copyright (c) 2015 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
