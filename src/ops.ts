import { Predicate } from "./types"
import { deepCompare } from "./utils"

type HasIncludes = { includes: (...args: any[]) => boolean }

/** Checks if a number is between two other numbers */
export const $btwn = (min: number, max: number, inclusive = true) => {
  return (v: number) => inclusive ? v >= min && v <= max : v > min && v < max
}

/** greater than */
export const $gt = (v: number) => (src: number) => src > v
/** greater than or equal to */
export const $gte = (v: number) => (src: number) => src >= v
/** less than */
export const $lt = (v: number) => (src: number) => src < v
/** less than or equal to */
export const $lte = (v: number) => (src: number) => src <= v

/** equals */
export const $eq = <T>(v: T) => (src: T) => deepCompare(src, v)
/** not equals */
export const $neq = <T>(v: T) => (src: T) => !deepCompare(src, v)

/** Checks if a value is included in an array/string */
export const $in = <T>(v: HasIncludes) => (src: any) => v.includes(src)
/** Checks if a value is not included in an array/string */
export const $nin = <T>(v: HasIncludes) => (src: any) => !v.includes(src)
/** Checks if a string/array contains a value */
export const $contains = (v: any) => (src: HasIncludes) => src.includes(v)
/** Checks if all elements of `v` are in the array */
export const $all = (...v: any[]) => (src: HasIncludes) => v.every((e) => src.includes(e))

/** Checks if a string matches a regex */
export const $regex = (v: RegExp) => (src: string) => v.test(src)

export const $and = <T>(a: Predicate<T>, b: Predicate<T>) => (src: T) => a(src) && b(src)
export const $or = <T>(a: Predicate<T>, b: Predicate<T>) => (src: T) => a(src) || b(src)
export const $not = <T>(a: Predicate<T>) => (src: T) => !a(src)
export const $nor = <T>(a: Predicate<T>, b: Predicate<T>) => (src: T) => !a(src) && !b(src)

/** Add a value to the end of the array */
export const $push = <T>(...v: T[]) => (src: T[]) => { src.push(...v); return src }
/** Remove the last value of the array */
export const $pop = <T>(v: T) => (src: T[]) => { src.pop(); return src }
/** Remove the first value of the array */
export const $shift = <T>(v: T) => (src: T[]) => { src.shift(); return src }
/** Add a value to the beginning of the array */
export const $unshift = <T>(v: T) => (src: T[]) => { src.unshift(v); return src }

/** increment by a value */
export const $inc = (v: number) => (src: number) => src + v
/** decrement by a value */
export const $dec = (v: number) => (src: number) => src - v
/** multiply by a value */
export const $mul = (v: number) => (src: number) => src * v
/** divide by a value */
export const $div = (v: number) => (src: number) => src / v
/** modulo by a value */
export const $mod = (v: number) => (src: number) => src % v

/** replace part of a string */
export const $replace = (v: RegExp | string, replacer: string) => (src: string) => src.replace(v, replacer)