'use strict';

const Args = require('args-js');

function serial(functions, callback) {
    var index = 0;
    var lastIndex = functions.length - 1;
    if (lastIndex >= 0) {
        functions[index](serialCallback);
    } else {
        callback(null, null);
    }

    function serialCallback(error, data) {
        if (!error && index !== lastIndex) {
            functions[++index](data, serialCallback);
        } else {
            callback(error, data);
        }
    }
}

function parallel() {
    const args = Args([
        {arr: Args.ARRAY | Args.Required},
        {func: Args.FUNCTION | Args.Optional},
        {callback: Args.FUNCTION | Args.Required}
    ], arguments);
    const arrLength = args.arr.length;
    let results = {length: arrLength};
    if (arrLength === 0) {
        args.callback(null, []);
    } else if (args.func) {
        args.arr.forEach(function (value, index) {
            args.func(value, parallelCallback(args.callback, results, index));
        });
    } else {
        args.arr.forEach(function (func, index) {
            func(parallelCallback(args.callback, results, index));
        });
    }
}

function parallelCallback(callback, results, index) {
    return function (error, data) {
        if (error) {
            callback(error, []);
        } else {
            results[String(index)] = data;
            if (Object.keys(results).length - 1 === results.length) {
                callback(error, Array.from(results, (v, k) => v));
            }
        }
    };
}

exports.serial = serial;
exports.parallel = parallel;
exports.map = parallel;
