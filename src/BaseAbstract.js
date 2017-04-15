'use strict';

var path = require('path');

var joi = require('joi');
var _ = require('lodash');
var uuid = require('uuid');

var ApiError = require(path.join(__dirname, 'Error'));

var DebugTimer = require(path.join(__dirname, 'Debug', 'Timer'));

class BaseAbstract {

    /**
     * @constructor
     * @param  {Object} models
     * @param  {Object} api
     */
    constructor (models, api) {
        this._models = models;
        this._api = api;
        this._systemFields = null;

        this.Error = ApiError;

        this._creationSchema = null;
        this._modificationSchema = null;

        this._debug = null;
    }

    /**
     * set debug object
     *
     * @param {Request/Debug} debug
     */
    setDebug (debug) {
        this._debug = debug;
    }

    /**
     * get creation schema
     *
     * @return {Object}
     */
    getCreationSchema () {
        return _.cloneDeep(this._creationSchema);
    }

    /**
     * get modification schema
     *
     * @return {Object}
     */
    getModificationSchema () {
        return _.cloneDeep(this._modificationSchema);
    }

    /**
     * validate creation data by schema
     *
     * @param {Object} data
     * @param {Object} options
     * @return {Promise}
     */
    _validateCreation (data, options) {
        return this._validate(data, this._creationSchema, options);
    }

    /**
     * validate modification data by schema
     *
     * @param {Object} data
     * @param {Object} options
     * @return {Promise}
     */
    _validateModification (data, options) {
        return this._validate(data, this._modificationSchema, options);
    }

    /**
     * get uuid
     *
     * @return {String}
     */
    _generateUuid () {
        return uuid.v4();
    }

    /**
     * get current timestamp
     *
     * @return {Number}
     */
    _time () {
        var date = new Date();
        return Math.round(date.getTime() / 1000);
    }

    /**
     * get current timestamp with microseconds
     *
     * @return {Number}
     */
    _microtime () {
        return (new Date()).getTime();
    }

    /**
     * get current date as ISOString
     *
     * @private
     * @return {String}
     */
    _isoDate () {
        return (new Date()).toISOString();
    }


    /**
     * validate data by schema
     *
     * using joi module
     *
     * @private
     * @param  {Object} data
     * @param  {Object} schema
     * @param  {Object} options
     * @return {Promise}
     */
    _validate (data, schema, options) {

        return new Promise((resolve, reject) => {

            if (!options) {
                options = {};
            }

            var joiOptions = {
                convert: true,
                abortEarly: false,
                allowUnknown: false
            };

            if (options.allowUnknown) {
                joiOptions.allowUnknown = options.allowUnknown;
            }

            joi.validate(data, schema, joiOptions, (err, data) => {

                if (err) {
                    var list = [];

                    _.each(err.details, function (e) {
                        list.push({message: e.message, path: e.path, type: e.type});
                    });

                    var e = new ApiError(this.Error.CODES.INVALID_DATA, err);
                    e.list = list;

                    reject(e);
                    return;
                }

                resolve(data);
            });
        });

    }

    /**
     * validate object by schema
     *
     * @param {Object} data
     * @param {Object} schema
     * @param {Object} options
     * @return {Object}
     */
    validate (data, schema, options) {
        return this._validate(data, schema, options);
    }

    /**
     * is empty data
     *
     * @private
     * @param  {Object}  data
     * @return {Boolean}
     */
    _isEmptyData (data) {
        if (!data) {
            return false;
        }

        return _.keys(data).length ? false : true;
    }

    /**
     * clear system fields in object or array
     *
     * @param {Object|Array} data
     * @return {Object|Array}
     */
    clearSystemFields (data) {
        if (data === null || typeof data === 'undefined') {
            return data;
        }

        if (!this._systemFields) {
            throw new this.Error(this.Error.CODES.NO_SYSTEM_FIELDS);
        }

        if (!this._systemFields) {
            return data;
        }

        if (Array.isArray(data)) {
            return this._clearSystemFieldsInArray(data);
        }

        return this._clearSystemFieldsInObject(data);

    }

    /**
     * clear system fields in object
     *
     * @private
     * @param {Object} data
     * @return {Object}
     */
    _clearSystemFieldsInObject (data) {
        if (!this._systemFields) {
            throw new this.Error(this.Error.CODES.NO_SYSTEM_FIELDS);
        }

        if (!this._systemFields) {
            return data;
        }

        return _.omit(data, this._systemFields);
    }

    /**
     * clear system fields for each item in array
     *
     * @private
     * @param {Array} array
     * @return {Array}
     */
    _clearSystemFieldsInArray (array) {
        if (!this._systemFields) {
            throw new this.Error(this.Error.CODES.NO_SYSTEM_FIELDS);
        }

        var result = [];

        for (var item of array) {
            result.push(this._clearSystemFieldsInObject(item));
        }

        return result;
    }

    /**
     * emit debug data
     *
     * @private
     * @param  {Object} data
     */
    _logDebug (data) {

        if (!this._debug || !this._debug.log) {
            return;
        }

        this._debug.log(data);
    }

    /**
     * create debug timer
     *
     * @private
     * @param  {String} name
     * @return {DebugTimer}
     */
    _createTimer (name) {
        var timer = new DebugTimer('api', name);

        timer.onStop((data) => {
            this._logDebug(data);
        });

        return timer;
    }

}

module.exports = BaseAbstract;
