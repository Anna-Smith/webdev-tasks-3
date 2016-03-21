'use strict';

const flow = require('../lib/flow');
const assert = require('assert');
const mocha = require('mocha');
const sinon = require('sinon');
const chai = require('chai');
chai.should();
const Args = require('args-js');
const _ = require('lodash');

const minDelay = 100;
const maxDelay = 400;


describe('Flow', function () {
    describe('serial', function () {
        it('should call callback when the functions are not passed', function () {
            const callback = sinon.spy();
            flow.serial([], callback);
            assert(callback.calledWith(null, null));
        });
        it('should serial call each function once', function (done) {
            const fn1 = sinon.spy(createAsyncFunc({data: 1}));
            const fn2 = sinon.spy(createAsyncFunc());
            const callback = () => {
                assert(fn1.calledOnce, 'fn1 called once');
                assert(fn2.calledOnce, 'fn2 called once');
                assert(fn2.calledAfter(fn1), 'fn2 called after fn1');
                done();
            };
            flow.serial([fn1, fn2], callback);
        });
        it('should call callback after functions', function (done) {
            const fn1 = createAsyncFunc({data: 1});
            const fn2 = sinon.spy(createAsyncFunc());
            const callback = sinon.spy(() => {
                assert(callback.calledOnce, 'callback called once');
                assert(callback.calledAfter(fn2), 'callback called after fn2');
                done();
            });
            flow.serial([fn1, fn2], callback);
        });
        it('should pass result of the function to the next', function (done) {
            const fn1 = createAsyncFunc({data: 1});
            const fn2 = sinon.spy(createAsyncFunc());
            const callback = () => {
                assert(fn2.calledWith(1), 'fn2 gets result');
                done();
            };
            flow.serial([fn1, fn2], callback);
        });
        it('should call callback with the result', function (done) {
            const fn1 = createAsyncFunc({data: 1});
            const fn2 = createAsyncFunc();
            const callback = sinon.spy(() => {
                assert(callback.calledWith(null, 1), 'callback gets result');
                done();
            });
            flow.serial([fn1, fn2], callback);
        });
        it('should stop the execution of the functions if an error occurs', function (done) {
            const fn1 = createAsyncFunc({error: new Error('err'), data: 1});
            const fn2 = sinon.spy(createAsyncFunc());
            const callback = () => {
                assert(fn2.callCount.should.equal(0), 'fn2 never called');
                done();
            };
            flow.serial([fn1, fn2], callback);
        });
        it('should call callback with an error', function (done) {
            const fn1 = createAsyncFunc({error: new Error('err'), data: 1});
            const fn2 = createAsyncFunc();
            const callback = sinon.spy(() => {
                assert(callback.calledWith(Error('err')), 'callback called with error');
                done();
            });
            flow.serial([fn1, fn2], callback);
        });
    });
    describe('parallel', function () {
        it('should call callback when the functions are not passed', function () {
            const callback = sinon.spy();
            flow.parallel([], callback);
            assert(callback.calledOnce, 'callback called');
            assert(callback.calledWith(null, []), 'callback called with no error and [] data');
        });
        it('should call each function once', function (done) {
            const fn1 = sinon.spy(createAsyncFunc({data: 1}));
            const fn2 = sinon.spy(createAsyncFunc({data: 2}));
            const callback = () => {
                assert(fn1.calledOnce, 'fn1 called once');
                assert(fn2.calledOnce, 'fn2 called once');
                done();
            };
            flow.parallel([fn1, fn2], callback);
        });
        it('should parallel call functions', function (done) {
            const fn1 = sinon.spy(createAsyncFunc({data: 1}));
            const fn2 = sinon.spy(createAsyncFunc({data: 2}));
            const callback = () => {
                done();
            };
            flow.parallel([fn1, fn2], callback);
            if (!callback.called) {
                assert(fn1.called, 'fn1 called');
                assert(fn2.called, 'fn2 called');
            }
        });
        it('should call callback after functions', function (done) {
            const fn1 = sinon.spy(createAsyncFunc({data: 1}));
            const fn2 = sinon.spy(createAsyncFunc({data: 2}));
            const callback = sinon.spy(() => {
                assert(callback.calledOnce, 'callback called once');
                assert(callback.calledAfter(fn1), 'callback called after fn1');
                assert(callback.calledAfter(fn2), 'callback called after fn2');
                done();
            });
            flow.parallel([fn1, fn2], callback);
        });
        it('should call callback with the result of the functions', function (done) {
            const fn1 = createAsyncFunc({data: 1});
            const fn2 = createAsyncFunc({data: 2});
            const callback = sinon.spy(() => {
                assert(callback.calledWith(null, [1, 2]), 'callback called with data');
                done();
            });
            flow.parallel([fn1, fn2], callback);
        });
        it('should call callback with an error', function (done) {
            const fn1 = createAsyncFunc({data: 'some data 1'});
            const fn2 = createAsyncFunc({data: 'some data 2', error: new Error('err')});
            const callback = sinon.spy(() => {
                assert(callback.calledWith(Error('err'), []), 'callback called with error');
                done();
            });
            flow.parallel([fn1, fn2], callback);
        });
    });
    describe('map', function () {
        it('should call callback when the values are not passed', function (done) {
            const fn = sinon.spy();
            const callback = sinon.spy();
            flow.map([], fn, callback);
            assert(callback.calledOnce, 'callback called once');
            assert(callback.calledWith(null, []), 'callback called with null error and [] data');
            assert(fn.callCount.should.equal(0), 'fn shouldn\'t be called');
            done();
        });
        it('should call function with each value', function (done) {
            const fn = sinon.spy(createAsyncFunc());
            const callback = () => {
                assert(fn.calledThrice, 'fn called thrice');
                assert(fn.firstCall.calledWith(1), 'fn called with first value');
                assert(fn.secondCall.calledWith(2), 'fn called with second value');
                assert(fn.thirdCall.calledWith(3), 'fn called with third value');
                done();
            };
            flow.map([1, 2, 3], fn, callback);
        });
        it('should call callback after function', function (done) {
            const fn = createAsyncFunc();
            const callback = sinon.spy(() => {
                assert(callback.calledOnce, 'callback called once');
                done();
            });
            flow.map([1, 2, 3], fn, callback);
        });
        it('should call callback with the result', function (done) {
            const fn = createAsyncFunc();
            const callback = sinon.spy(() => {
                assert(callback.calledWith(null, [1, 2, 3]), 'callback called with results');
                done();
            });
            flow.map([1, 2, 3], fn, callback);
        });
        it('should call callback with an error', function (done) {
            const fn = createAsyncFunc({failedValue: 2, error: new Error('err')});
            const callback = sinon.spy(() => {
                assert(callback.calledOnce, 'callback called once');
                assert(callback.calledWith(Error('err'), []), 'callback called with error');
                done();
            });
            flow.map([1, 2, 3], fn, callback);
        });
    });
});

function createAsyncFunc() {
    const args = Args([
        {delay: Args.INT | Args.Optional, _default: _.random(minDelay, maxDelay)},
        {error: Args.ANY | Args.Optional, _default: null},
        {data: Args.ANY | Args.Optional},
        {failedValue: Args.ANY | Args.Optional}
    ], arguments);
    if (args.data) {
        return (cb) => {
            setTimeout(cb, args.delay, args.error, args.data);
        };
    } else if (args.failedValue) {
        return (value, cb) => {
            if (value === args.failedValue) {
                setTimeout(cb, args.delay, args.error, value);
            } else {
                setTimeout(cb, args.delay, null, value);
            }
        };
    } else {
        return (data, cb) => {
            setTimeout(cb, args.delay, args.error, data);
        };
    }
}
