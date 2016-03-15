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
            flowTest(done, 'serial', ['assert(fn1.calledOnce, "fn1 called once");',
                'assert(fn2.calledOnce, "fn2 called once");',
                'assert(fn2.calledAfter(fn1), "fn2 called after fn1");']);
        });
        it('should call callback after functions', function (done) {
            flowTest(done, 'serial', ['assert(callback.calledOnce, "callback called once");',
                'assert(callback.calledAfter(fn2), "callback called after fn2");']);
        });
        it('should pass result of the function to the next', function (done) {
            flowTest(done, 'serial', ['assert(fn2.calledWith(1), "fn2 gets result");']);
        });
        it('should call callback with the result', function (done) {
            flowTest(done, 'serial',
                ['assert(callback.calledWith(null, 1), "callback gets result");']);
        });
        it('should stop the execution of the functions if an error occurs', function (done) {
            flowTest(done, 'serial', ['assert(fn2.callCount.should.equal(0), "fn2 never called");'],
                new Error('err'));
        });
        it('should call callback with an error', function (done) {
            flowTest(done, 'serial',
                ['assert(callback.calledWith(Error("err")), "callback called with error");'],
                new Error('err'));
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
            flowTest(done, 'parallel', ['assert(fn1.calledOnce, "fn1 called once");',
                'assert(fn2.calledOnce, "fn2 called once");']);
        });
        it('should call callback after functions', function (done) {
            flowTest(done, 'parallel', ['assert(callback.calledOnce, "callback called once");',
                'assert(callback.calledAfter(fn1), "callback called after fn1");',
                'assert(callback.calledAfter(fn2), "callback called after fn2");']);
        });
        it('should call callback with the result of the functions', function (done) {
            flowTest(done, 'parallel',
                ['assert(callback.calledWith(null, [1, 2]), "callback called with data");']);
        });
        it('should call callback with an error', function (done) {
            flowTest(done, 'parallel',
                ['assert(callback.calledWith(Error("err"), []), "callback called with error");'],
                new Error('err'));
        });
    });
    describe('map', function () {
        it('should call callback when the values are not passed', function () {
            const fn = sinon.spy();
            const callback = sinon.spy();
            flow.map([], fn, callback);
            assert(callback.calledOnce, 'callback called once');
            assert(callback.calledWith(null, []), 'callback called with null error and [] data');
            assert(fn.callCount.should.equal(0), 'fn shouldn\'t be called');
        });
        it('should call function with each value', function (done) {
            flowTest(done, 'map', ['assert(fn.calledThrice, "fn called thrice");',
                'assert(fn.firstCall.calledWith(1), "fn called with first value");',
                'assert(fn.secondCall.calledWith(2), "fn called with second value");',
                'assert(fn.thirdCall.calledWith(3), "fn called with third value");']);
        });
        it('should call callback after function', function (done) {
            flowTest(done, 'map', ['assert(callback.calledOnce, "callback called once");']);
        });
        it('should call callback with the result', function (done) {
            flowTest(done, 'map',
                ['assert(callback.calledWith(null, [1, 2, 3]), "callback called with results");']);
        });
        it('should call callback with an error', function (done) {
            flowTest(done, 'map', ['assert(callback.calledOnce, "callback called once");',
                    'assert(callback.calledWith(Error("err"), []), "callback called with error");'],
                new Error('err'));
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
        //serial or parallel
        return (cb) => {
            setTimeout(cb, args.delay, args.error, args.data);
        };
    } else if (args.failedValue) {
        //map
        return (value, cb) => {
            if (value === args.failedValue) {
                setTimeout(cb, args.delay, args.error, value);
            } else {
                setTimeout(cb, args.delay, null, value);
            }
        };
    } else {
        //serial or map
        return (data, cb) => {
            setTimeout(cb, args.delay, args.error, data);
        };
    }
}

function flowTest(done, testFunc, asserts, error) {
    error = error || null;
    const callback = sinon.spy(() => {
        asserts.forEach(assertStr => {
            eval(assertStr);
        });
        done();
    });
    let fn1;
    let fn2;
    switch (testFunc) {
        case 'serial':
            fn1 = sinon.spy(createAsyncFunc({data: 1, error: error}));
            fn2 = sinon.spy(createAsyncFunc());
            flow.serial([fn1, fn2], callback);
            break;
        case 'parallel':
            fn1 = sinon.spy(createAsyncFunc({data: 1}));
            fn2 = sinon.spy(createAsyncFunc({data: 2, error: error}));
            flow.parallel([fn1, fn2], callback);
            break;
        case 'map':
            const fn = sinon.spy(createAsyncFunc({failedValue: 2, error: error}));
            flow.map([1, 2, 3], fn, callback);
            break;
    }
}
