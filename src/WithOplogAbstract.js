var ApiAbstract = require('./Abstract');


class WithOpLogAbstract extends ApiAbstract {

    create (data, options) {

        return new Promise((resolve, reject) => {
            var timer = this._createTimer(this.entity + ':oplog:create');

            timer.data = {
                data: data,
                options: options
            };

            var doc = null;

            super.create(data, options)
                .then((_doc) => {
                    doc = _doc;

                    return this._models.get('oplog').insertOne({
                        creationDate: this._isoDate(),
                        creationTimestamp: this._time(),
                        entity: this.entity,
                        docId: doc.id,
                        action: 'create',
                        old: null,
                        new: data,
                    });
                })
                .then(() => {
                    timer.stop();

                    resolve(doc);
                })
                .catch((error) => {
                    timer.error(error);
                    reject(error);
                });
        });

    }

    updateByName (name, data) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':oplog:updateByName');

            timer.data = {
                name: name,
                data: data
            };

            var result = null;

            super.updateByName(name, data)
                .then((_result) => {
                    result = _result;

                    return this._models.get('oplog').insertOne({
                        creationDate: this._isoDate(),
                        creationTimestamp: this._time(),
                        entity: this.entity,
                        docId: result.original._id,
                        action: 'update',
                        old: result.original,
                        new: result.updated
                    });
                })
                .then(() => {
                    timer.stop();

                    resolve(result);
                })
                .catch((error) => {
                    timer.error(error);
                    reject(error);
                });
        });

    }

    updateById (id, data) {

        return new Promise((resolve, reject) => {

            var timer = this._createTimer(this.entity + ':oplog:updateById');

            timer.data = {
                id: id,
                data: data
            };

            var result = null;

            super.updateById(id, data)
                .then((_result) => {
                    result = _result;

                    return this._models.get('oplog').insertOne({
                        creationDate: this._isoDate(),
                        creationTimestamp: this._time(),
                        entity: this.entity,
                        docId: id,
                        action: 'update',
                        old: result.original,
                        new: result.updated
                    });
                })
                .then(() => {
                    timer.stop();

                    resolve(result);
                })
                .catch((error) => {
                    timer.error(error);
                    reject(error);
                });
        });

    }


}


module.exports = WithOpLogAbstract;
