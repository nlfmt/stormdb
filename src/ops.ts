import { Predicate } from "./types";
import { deepCompare } from "./utils";

type HasIncludes = { includes: (...args: any[]) => boolean };

export const $btwn =
    (min: number, max: number, exclusive = false) =>
    (v: number) =>
        exclusive ? v >= min && v <= max : v > min && v < max;

export const $gt = (v: number) => (src: number) => src > v;
export const $gte = (v: number) => (src: number) => src >= v;
export const $lt = (v: number) => (src: number) => src < v;
export const $lte = (v: number) => (src: number) => src <= v;

export const $eq = <T>(v: T) => (src: T) => deepCompare(src, v);
export const $neq = <T>(v: T) => (src: T) => !deepCompare(src, v);


export const $in = (v: any) => (src: HasIncludes) => src.includes(v);
export const $nin = (v: any) => (src: HasIncludes) => !src.includes(v);
export const $all = (...v: any[]) => (src: HasIncludes) => v.every((e) => src.includes(e));

export const $regex = (v: RegExp) => (src: string) => v.test(src);

export const $and = <T>(a: Predicate<T>, b: Predicate<T>) => (src: T) => a(src) && b(src);
export const $or = <T>(a: Predicate<T>, b: Predicate<T>) => (src: T) => a(src) || b(src);
export const $not = <T>(a: Predicate<T>) => (src: T) => !a(src);
export const $nor = <T>(a: Predicate<T>, b: Predicate<T>) => (src: T) => !a(src) && !b(src);