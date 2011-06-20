/**
 * Storage Extension Wrapper.
 * @class StorageEx Storage Extension Wrapper.
 * @param {Storage} [storage=localStorage] storage object. The localStorage is used when not specified. 
 * @see http://d.hatena.ne.jp/Jxck/20100821/1282412125
 */
function StorageEx(storage) {
    this.storage = storage || (function() { return this.localStorage; })();
}
(function() {
    var proto = StorageEx.prototype;
    //== API ==//
    proto.constructor = StorageEx;
    proto.get = get;
    proto.set = set;
    proto.remove = remove;
    proto.clear = clear;
    proto.each = each;
    proto.toObject = toObject;
    proto.toString = toString;
    proto.__defineGetter__('length', function() { return this.storage.length; });
    //== implementation ==//
    /**
     * get storage item.
     * @param {String} key item key.
     * return {Object} item value.
     */
    function get(key) {
        return JSON.parse(this.storage.getItem(key), json_reviver);
    }
    /**
     * set storage item.
     * @param {String} key item key.
     * @param {Object} value item value.
     */
    function set(key, value) {
        this.storage.setItem(key, JSON.stringify(value));
    }
    /**
     * remove storage item.
     * @param {String} key item key.
     */
    function remove(key) {
        this.storage.removeItem(key);
    }
    /**
     * clear all storage data.
     */
    function clear() {
        this.storage.clear();
    }
    /**
     * iterate storage items.
     * @param {Function} func Function to execute for each element.
     * @param {Object} [thisObject] Object to use as this when executing func.
     */
    function each(func, thisObject) {
        var storage = this.storage;
        for (var i = 0, len = storage.length; i < len; i++) {
            var k = storage.key(i);
            func.call(thisObject, k, this.get(k));
        }
    }
    /**
     * convert storage data to object.
     * @return {Object} storage data.
     */
    function toObject() {
        var obj = {};
        this.each(function(k, v) {
            this[k] = v;
        }, obj);
        return obj;
    }
    /**
     * convert storage data to string.
     * @return {String} storage data(JSON).
     */
    function toString() {
        return JSON.stringify(this.toObject());
    }
    /**
     * Reviver to revive Date object.
     * @private
     * @param {String} key JSON property name.
     * @param {Object} value JSON parsed object.
     * @return {Object} revived object.
     * @see https://github.com/douglascrockford/JSON-js
     */
    function json_reviver(key, value) {
        var a;
        if (typeof value === 'string') {
            a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
            if (a) {
                return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
            }
        }
        return value;
    }
})();
