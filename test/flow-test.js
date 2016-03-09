'use strict';

const flow = require('../lib/flow');
const assert = require('assert');
const mocha = require('mocha');
const sinon = require('sinon');
const chai = require('chai');
const should = chai.should();

describe('Flow', function () {
    describe('serial', function () {
        it('should return callback with null error and data ' +
            'when the functions are not passed', function () {
            const callback = sinon.spy();
            flow.serial([], callback);
            assert(callback.calledWith(null, null));
        });
        it('should serial call each function once', function (done) {
            const result = serialTest(null, done);
            const fn1 = result.shift();
            const fn2 = result.shift();
            assert(fn1.calledOnce, 'fn1 called once');
            assert(fn2.calledOnce, 'fn2 called once');
            assert(fn2.calledAfter(fn1), 'fn2 called after fn1');
        });
        it('should call callback after functions once', function (done) {
            const result = serialTest(null, done);
            const callback = result.pop();
            const fn2 = result.pop();
            assert(callback.calledOnce, 'callback called once');
            assert(callback.calledAfter(fn2), 'callback called after fn2');
        });
        it('should pass result of the function to the next', function (done) {
            const result = serialTest(null, done);
            const callback = result.pop();
            const fn2 = result.pop();
            assert(fn2.calledWith('some data'), 'fn2 gets result');
            assert(callback.calledWith(null, 'some data'), 'callback gets result');
        });
        it('should stop the execution of the functions if an error occurs', function (done) {
            const fn2 = serialTest(new Error('err'), done)[1];
            assert(fn2.callCount.should.equal(0), 'fn2 never called');
        });
        it('should call callback with error if an error occurs', function (done) {
            const callback = serialTest(new Error('err'), done).pop();
            assert(callback.calledWith(Error('err')), 'callback called with error');
        });
    });
    describe('parallel', function () {
        it('should return callback with null error and empty array of data when the functions' +
            ' are not passed', function () {
            const callback = sinon.spy();
            flow.parallel([], callback);
            assert(callback.calledOnce, 'callback called');
            assert(callback.calledWith(null, []));
        });
        it('should call each function once', function (done) {
            const result = parallelTest(null, done);
            const fn1 = result.shift();
            const fn2 = result.shift();
            assert(fn1.calledOnce, 'fn1 called once');
            assert(fn2.calledOnce, 'fn2 called once');
        });
        it('should call callback after functions', function (done) {
            const result = parallelTest(null, done);
            const fn1 = result.shift();
            const fn2 = result.shift();
            const callback = result.pop();
            assert(callback.calledOnce, 'callback called once');
            assert(callback.calledAfter(fn1), 'callback called after fn1');
            assert(callback.calledAfter(fn2), 'callback called after fn2');
        });
        it('should call callback with the result of the functions', function (done) {
            const callback = parallelTest(null, done).pop();
            assert(callback.calledWith(null, ['some data1', 'some data2', 'some data3']),
                'callback called with data');
        });
        it('should call callback with an error and [] of data if an error occurs', function (done) {
            const callback = parallelTest(new Error('error2'), done).pop();
            assert(callback.calledWith(Error('error2'), []),
                'callback called with error');
        });
    });
    describe('map', function () {
        it('should return callback with null error and empty array of data when the values ' +
            'are not passed', function (done) {
            const fn = sinon.spy();
            const callback = sinon.spy();
            flow.map([], fn, callback);
            done();
            assert(callback.calledOnce, 'callback called once');
            assert(callback.calledWith(null, []), 'callback called with null error and [] data');
            assert(fn.callCount.should.equal(0), 'fn shouldn\'t be called');
        });
        it('should call function with each value', function (done) {
            const fn = mapTest(null, done).shift();
            assert(fn.calledThrice, 'fn called thrice');
            assert(fn.firstCall.calledWith(1), 'fn called with first value');
            assert(fn.secondCall.calledWith(2), 'fn called with second value');
            assert(fn.thirdCall.calledWith(3), 'fn called with third value');
        });
        it('should call callback after function', function (done) {
            const callback = mapTest(null, done).pop();
            assert(callback.calledOnce, 'callback called once');
        });
        it('should call callback with all results', function (done) {
            const callback = mapTest(null, done).pop();
            assert(callback.calledOnce, 'callback called once');
            assert(callback.calledWith(null, [1, 2, 3]), 'callback called with results');
        });
        it('should call callback with an error and [] of data if an error occurs', function (done) {
            const callback = mapTest(new Error('error2'), done).pop();
            assert(callback.calledWith(Error('error2'), []),
                'callback called with error');
        });
    });
});

function serialTest(error, done) {
    const fn1 = sinon.spy((next) => {
        next(error, 'some data');
    });
    const fn2 = sinon.spy((data, next) => {
        next(null, data);
    });
    const callback = sinon.spy();
    flow.serial([fn1, fn2], callback);
    done();
    return [fn1, fn2, callback];
}

function parallelTest(error, done) {
    const fn1 = sinon.spy((cb) => {
        cb(null, 'some data1');
    });
    const fn2 = sinon.spy((cb) => {
        cb(error, 'some data2');
    });
    const fn3 = sinon.spy((cb) => {
        cb(null, 'some data3');
    });
    const callback = sinon.spy();
    flow.parallel([fn1, fn2, fn3], callback);
    done();
    return [fn1, fn2, fn3, callback];
}

function mapTest(error, done) {
    const fn = sinon.spy((value, cb) => {
        if (value === 2 && error) {
            cb(error);
        } else {
            cb(null, value);
        }
    });
    const callback = sinon.spy();
    flow.map([1, 2, 3], fn, callback);
    done();
    return [fn, callback];
}