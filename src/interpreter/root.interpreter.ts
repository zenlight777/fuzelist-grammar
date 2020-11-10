import { NodeType } from "lezer";
import { IInterpreter } from "@dev4light/lezer-editor-common";

export class RootInterpreter implements IInterpreter {

    evaluate(node: NodeType, input: string, args: any[]): any {
        return (context) => {
            return "SUCCESS! " + node.name;
        }
    }
}

// function getBuiltin(name, context) {
//     return builtins[name];
// }

function getFromContext(variable, context) {

    if (variable in context) {
        return context[variable];
    }

    return null;
}

function extractValue(context, prop, _target) {

    const target = _target(context);

    if (!Array.isArray(target)) {
        throw new Error(`Cannot extract ${prop} from ${target}`);
    }

    return target.map(t => (
        { [prop]: t }
    ));
}

function compareBetween(context, _left, _start, _end) {

    const left = _left(context);

    const start = _start(context);
    const end = _end(context);

    return Math.min(start, end) <= left && left <= Math.max(start, end) ? (context.__extractLeft ? left : true) : false;
}

function compareIn(context, _left, _tests) {

    const left = _left(context);

    const tests = _tests(context);

    return (Array.isArray(tests) ? tests : [tests]).some(
        test => compareValOrFn(test, left)
    ) ? (context.__extractLeft ? left : true) : false;
}

function compareValOrFn(valOrFn, expr) {

    if (typeof valOrFn === 'function') {
        return valOrFn(() => expr);
    }

    return valOrFn === expr;
}

interface RangeArray<T> extends Array<T> {
    __isRange: boolean
};

function range(size: number, startAt = 0, direction = 1) {

    const r = Array.from(Array(size).keys()).map(i => i * direction + startAt) as RangeArray<number>;

    r.__isRange = true;

    return r;
}

function createRange(start, end) {

    if (typeof start === 'number' && typeof end === 'number') {

        const steps = Math.max(start, end) - Math.min(start, end);

        return range(steps + 1, start, end < start ? -1 : 1);
    }

    throw new Error('unsupported range');
}

function cartesianProduct(arrays: number[][]) {

    const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
    const cartesian = (a?, b?, ...c) => (b ? cartesian(f(a, b), ...c) : a);

    return cartesian(...arrays);
}


function coalecenseTypes(a, b) {

    if (!b) {
        return a.type;
    }

    if (a.type === b.type) {
        return a.type;
    }

    return 'any';
}

function tag(fn, type) {

    fn.type = type;

    fn.toString = function () {
        return `TaggedFunction[${type}] ${Function.prototype.toString.call(fn)}`;
    };

    return fn;
}

function combineResult(result, match) {

    if (!result) {
        return match;
    }

    return result;
}

function isTruthy(obj) {
    return obj !== false && obj !== null;
}

function Test(type) {
    return `Test<${type}>`;
}

function createInterval(start, startValue, endValue, end) {

    const inclusiveStart = start === '[';
    const inclusiveEnd = end === ']';

    return new Interval(startValue, endValue, inclusiveStart, inclusiveEnd);
}

function Interval(startValue, endValue, inclusiveStart, inclusiveEnd) {

    const direction = Math.sign(endValue - startValue);

    const rangeStart = (inclusiveStart ? 0 : direction * 0.000001) + startValue;
    const rangeEnd = (inclusiveEnd ? 0 : -direction * 0.000001) + endValue;

    const realStart = Math.min(rangeStart, rangeEnd);
    const realEnd = Math.max(rangeStart, rangeEnd);

    this.includes = (value) => {
        return realStart <= value && value <= realEnd;
    };
}