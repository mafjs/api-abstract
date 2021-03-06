var path = require('path');

var _ = require('lodash');
var uuid = require('uuid');

var Abstract = require('./BaseAbstract');

var Chain = require('maf-chain');


class ApiAbstract extends Abstract {

    /**
     * @constructor
     * @param {Object} models
     * @param {Object} api
     * @param {String} modelName
     */
    constructor (models, api, modelName) {
        super(models, api);

        this.entity = null;

        this.Error = this.Error.extendCodes({

        });

        this._modelName = modelName;

        this._creationSchema = null;
        this._modificationSchema = null;

        this._systemFields = ['_id'];

    }

    /**
     * create new document
     *
     * @param {Object} data
     * @param {Object} options
     * @return {Promise}
     */
    create (data, options) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':create');

            timer.data = {
                data: data,
                options: options
            };

            this._validate(data, this._creationSchema(), options)
            .then((data) => {

                // TODO make options flag
                if (!data.id) {
                    data.id = uuid.v4();
                }

                data.creationDate = this._isoDate();
                data.creationTimestamp = this._time();
                data.modificationDate = null;
                data.modificationTimestamp = null;

                return this._model().insertOne(data);
            })
            .then((doc) => {
                timer.stop();
                resolve(doc);
            })
            .catch((error) => {
                timer.error(error);

                var ModelError = this._model().Error;

                if (ModelError.is(ModelError.CODES.ALREADY_EXISTS, error)) {
                    reject(
                        this.Error.createError(this.Error.CODES.ALREADY_EXISTS, error)
                        .bind({id: data.id})
                    );
                } else {
                    reject(this.Error.ensureError(error));
                }

            });

        });

    }

    /**
     * search documents
     *
     * @param {Object} filters
     * @param {Object} fields
     * @return {Chain}
     */
    find (filters, fields) {

        var timer = this._createTimer(this.entity + ':find');

        timer.data = {filters: filters, fields};

        var chain = new Chain(['sort', 'limit', 'skip']);

        chain.onExec((data) => {

            timer.data.params = data;

            return new Promise((resolve, reject) => {

                this._model().find(filters, fields)
                    .mapToChain(data)
                    .exec()
                    .then((result) => {
                        timer.stop();
                        resolve(result);
                    })
                    .catch((error) => {
                        timer.error(error);
                        reject(error);
                    });

            });

        });

        return chain;
    }

    /**
     * search one document
     *
     * @param {Object} filters
     * @param {Object} fields
     * @return {Chain}
     */
    findOne (filters, fields) {

        var timer = this._createTimer(this.entity + ':findOne');

        timer.data = {
            filters: filters,
            fields: fields
        };

        var chain = new Chain(['sort', 'limit', 'skip']);

        chain.onExec((options) => {
            timer.data.options = options;

            return new Promise((resolve, reject) => {

                options.fields = fields;

                this._model().findOne(filters, options)
                    .then((result) => {
                        timer.stop();
                        resolve(result);
                    })
                    .catch((error) => {
                        timer.error(error);
                        reject(error);
                    });

            });

        });

        return chain;

    }

    /**
     * get document by name
     *
     * @param {String} name
     * @param {Array} fields
     * @return {Promise}
     */
    getByName (name, fields) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':getByName');

            timer.data = {
                name: name,
                fields: fields
            };

            this.findOne({name: name}, fields).exec()
                .then((result) => {
                    timer.stop();
                    resolve(result);
                })
                .catch((error) => {
                    timer.error(error);
                    reject(error);
                });
        });

    }

    /**
     * check doc by name and throw NOT_FOUND if not exists
     *
     * @param {String} name
     * @param {Array} fields
     * @return {Promise}
     */
    getExistingByName (name, fields) {

        return new Promise((resolve, reject) => {
            this.getByName(name, fields)
                .then((result) => {
                    if (!result) {
                        return reject(new this.Error(this.Error.CODES.NOT_FOUND));
                    }

                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });

    }

    /**
     * get existsing doc by name and clear system fields
     *
     * @param {String} name
     * @param {Array} fields
     * @return {Promise}
     */
    getClearExistingByName (name, fields) {
        return this.getExistingByName(name, fields)
            .then((result) => {
                return this.clearSystemFields(result);
            });
    }

    /**
     * get document by name
     *
     * @param {*} id
     * @param {Array} fields
     * @return {Promise}
     */
    getById (id, fields) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':getById');

            timer.data = {
                id: id,
                fields: fields
            };

            this.findOne({_id: id}, fields).exec()
                .then((result) => {
                    timer.stop();
                    resolve(result);
                })
                .catch((error) => {
                    timer.error(error);
                    reject(error);
                });

        });

    }

    /**
     * get doc by id and throw NOT_FOUND if not exists
     *
     * @param {*} id
     * @param {Array} fields
     * @return {Promise}
     */
    getExistingById (id, fields) {

        return new Promise((resolve, reject) => {
            this.getById(id, fields)
                .then((result) => {
                    if (!result) {
                        return reject(new this.Error(this.Error.CODES.NOT_FOUND));
                    }

                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });

    }

    /**
     * get existsing doc by id and clear system fields
     *
     * @param {String} id
     * @param {Array} fields
     * @return {Promise}
     */
    getClearExistingById (id, fields) {
        return this.getExistingById(id, fields)
            .then((result) => {
                return this.clearSystemFields(result);
            });
    }

    /**
     * update document by name
     *
     * @param {String} name
     * @param {Object} data
     * @return {Promise}
     */
    updateByName (name, data) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':updateByName');

            timer.data = {
                name: name,
                data: data
            };

            var validData, doc;

            this._validate(data, this._modificationSchema())
            .then((data) => {

                if (this._isEmptyData(data)) {
                    return reject(new this.Error(this.Error.CODES.INVALID_DATA));
                }

                validData = data;

                return this._model().findOne({
                    name: name
                });
            })
            .then((_doc) => {

                doc = _doc;

                if (!doc) {
                    return reject(
                        new this.Error(this.Error.CODES.NOT_FOUND)
                    );
                }

                validData.modificationDate = this._isoDate();
                validData.modificationTimestamp = this._time();

                return this._model().update(
                    {
                        name: name
                    },
                    {
                        '$set': validData
                    }
                );

            })
            .then(() => {
                timer.stop();

                var updated = _.defaultsDeep(_.cloneDeep(validData), doc);
                resolve({
                    original: doc,
                    updated: updated
                });
            })
            .catch((error) => {
                timer.error(error);
                reject(error);
            });

        });

    }

    /**
     * update document by id
     *
     * @param {String} id
     * @param {Object} data
     * @return {Promise}
     */
    updateById (id, data) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':updateById');

            timer.data = {
                id: id,
                data: data
            };

            var validData, doc;

            this._validate(data, this._modificationSchema())
            .then((data) => {

                if (this._isEmptyData(data)) {
                    return reject(new this.Error(this.Error.CODES.INVALID_DATA, 'empty data'));
                }

                validData = data;

                return this._model().findOne({
                    _id: id
                });
            })
            .then((_doc) => {

                doc = _doc;

                if (!doc) {
                    return reject(
                        new this.Error(this.Error.CODES.NOT_FOUND)
                    );
                }

                validData.modificationDate = this._isoDate();
                validData.modificationTimestamp = this._time();

                return this._model().update(
                    {
                        _id: id
                    },
                    {
                        '$set': validData
                    }
                );

            })
            .then(() => {
                timer.stop();
                var updated = _.defaultsDeep(_.cloneDeep(validData), doc);
                resolve({
                    original: doc,
                    updated: updated
                });
            })
            .catch((error) => {
                timer.error(error);
                reject(error);
            });

        });

    }

    /**
     * set api entity name
     *
     * @private
     * @param {String} name
     */
    _setEntityName (name) {
        this.entity = name;
        this.Error = this.Error.createWithEntityName(name);
    }

    /**
     * get api model
     *
     * @private
     * @return {Object}
     */
    _model () {

        if (!this._modelName) {
            throw new this.Error(this.Error.CODES.NO_MODEL_NAME);
        }

        var model = null;

        // if service locator
        if (this._models && typeof this._models.get === 'function') {
            model = this._models.get(this._modelName);
        } else if (this._models[this._modelName]) {
            model = this._models[this._modelName];
        }

        if (!model) {
            throw this.Error.createError(this.Error.CODES.NO_MODEL)
                .bind({name: this._modelName});
        }

        return model;
    }

}

module.exports = ApiAbstract;
