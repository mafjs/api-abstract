'use strict';

var mafError = require('maf-error');

var ErrorCodes = {
    NO_SYSTEM_FIELDS: 'no system fields',
    ALREADY_EXISTS: 'document already exists',
    NOT_FOUND: 'not found',
    INVALID_DATA: 'invalid data',
    FORBIDDEN: 'forbidden',
    NO_MODEL_NAME: 'no model name in constructor',
    NO_MODEL: 'no model with name = %name%'
};

var ApiError = mafError.create('ApiError', ErrorCodes);

ApiError.createWithEntityName = function (entity) {

    var errorClass = mafError.create(entity + 'ApiError', ErrorCodes);

    errorClass.prototype.entity = entity;

    return errorClass;
};

module.exports = ApiError;
