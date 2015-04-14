var Rx = require('rx');
var _ = require('lodash');

function noop() { }

var hasOwnProperty = Object.prototype.hasOwnProperty;

function makeArray(item) {
  return Array.isArray(item) ? item : [item];
}

var PouchDBAdapter = {
  get: function (db, bucketKey) {
    return Rx.Observable.create(function (o) {
      db.get(bucketKey, function (err, doc) {
        if (err && err.status === 404) {
          o.onNext({'_id': bucketKey});
        } else if (err) {
          return o.onError(err);
        } else {
          o.onNext(doc);
        }
        o.onCompleted();
      });
    });
  },
  put: function (db, doc) {
    return Rx.Observable.create(function (o) {
      db.put(doc, function (err, response) {
        if (err) {
          o.onError(err);
        } else {
          o.onNext(response);
          o.onCompleted();
        }
      });
    });
  },
  del: function (db, doc) {
    return Rx.Observable.create(function (o) {
      db.remove(doc, function (err, response) {
        // Ignore previously deleted records with conflicts
        if (err && (err.status === 404 || err.status === 409)) {
          o.onNext(response);
        } else if (err) {
          return o.onError(err);
        } else {
          o.onNext(response);
        }
        o.onCompleted();
      })
    });
  }
}

function PouchDBBackend(db, prefix) {
  this.db = db;
  this.prefix = prefix || 'acl';
}

PouchDBBackend.prototype = {
  /**
   Begins a transaction
  */
  begin : function() {
    return [];
  },
  /**
     Ends a transaction (and executes it)
  */
  end : function(transaction, cb) {
    Rx.Observable.concat(transaction).subscribe(
      noop,
      cb,
      function () {
        cb(null);
      }
    );
  },
  /**
    Cleans the whole storage.
  */
  clean : function(cb) {
    cb(null);
  },
  /**
     Gets the contents at the bucket's key.
  */
  get : function(bucket, key, cb) {
    return PouchDBAdapter.get(this.db, this.bucketKey(bucket, key)).subscribe(
      function (doc) {
        cb(null, _.without(_.keys(doc), "_rev", "_id"));
      },
      cb
    );
  },
  /**
  * Returns the union of the values in the given keys.
  */
  union : function(bucket, keys, cb) {
    var db = this.db;

    return Rx.Observable
      .fromArray(this.bucketKey(bucket, keys))
      .concatMap(function (bk) { return PouchDBAdapter.get(db, bk); })
      .toArray()
      .subscribe(
        function (docs) {
          var keyArrays = [];
          docs.forEach(function(doc) {
            keyArrays.push.apply(keyArrays, _.keys(doc));
          });
          cb(null, _.without(_.union(keyArrays),"_rev","_id"));
        },
        cb
      );
  },
  /**
   * Adds values to a given key inside a bucket.
   */
  add : function(transaction, bucket, key, values) {
    var bk = this.bucketKey(bucket, key), valueArray = makeArray(values), db = this.db;

    transaction.push(
      PouchDBAdapter.get(db, bk)
        .concatMap(function (doc) {
          var newDoc = {};
          valueArray.forEach(function(value) { newDoc[value] = true; });
          return PouchDBAdapter.put(db, _.assign(newDoc, doc));
        })
    );
  },
  /**
   * Delete the given key(s) at the bucket
  */
  del : function(transaction, bucket, keys) {
    var keyArray = makeArray(keys), bks = this.bucketKey(bucket, keyArray), db = this.db;

    transaction.push(
      Rx.Observable
        .fromArray(bks)
        .concatMap(function (bk) {
          return PouchDBAdapter.get(db, bk);
        })
        .concatMap(function (doc) {
          return PouchDBAdapter.del(db, doc);
        })
    );
  },
  /**
   * Removes values from a given key inside a bucket.
   */
  remove : function(transaction, bucket, key, values){
    var db = this.db, valueArray = makeArray(values), bk = this.bucketKey(bucket, key);

    transaction.push(
      PouchDBAdapter.get(db, bk)
        .concatMap(function (doc) {
          return PouchDBAdapter.put(db, _.omit(doc, values));
        })
    );
  },
  //
  // Private methods
  //

  bucketKey : function(bucket, keys){
    if (Array.isArray(keys)) {
      return keys.map(function(key){
        return this.prefix+'_'+bucket+'@'+key;
      }, this);
    } else {
      return this.prefix+'_'+bucket+'@'+keys;
    }
  }
};

module.exports = PouchDBBackend;
