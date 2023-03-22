import { type } from "os";
import type { ObjectId, Transformer } from "./utils";
import type z from "zod";

export type Predicate<T> = (value: T) => boolean;

/** Convert a model type to a query type, so arrays can be queried with $contains and $is */
export type FindQuery<T> =
    | Partial<{
          [K in keyof T]:  // If its a sub-object then recurse
            (T[K] extends object
                ? FindQuery<T[K]>
                : T[K]
            ) | Predicate<T[K]>
      }>
    | Predicate<T>;

export type UpdateFn<T> = (doc: T) => T;

export type UpdateQuery<T> =
    | Partial<{
          [K in keyof T]:
              | (T[K] extends object ? UpdateQuery<T[K]> : T[K])
              | UpdateFn<T[K]>;
      }>
    | UpdateFn<T>;

/** Turn ZodSchema ModelDef to actual types using z.infer */
export type InferModelDef<ModelDef extends Record<string, z.ZodSchema<any>>> = {
    [K in keyof ModelDef]: z.infer<ModelDef[K]> & { _id: ObjectId };
};

export interface DBDocument {
    _id: ObjectId;
    [key: string]: any;
}

export type Model = z.ZodSchema<any>;

/** Represents a value that can be serialized to JSON by default */
export type JSONValue =
    | null
    | boolean
    | number
    | string
    | JSONValue[]
    | { [key: string]: JSONValue };

/**
 * Options for the DBManager
 * @param transformers A map of class names to their transformers
 */
export type DBManagerOptions = {
    transformers: Transformer<any, any>[];
};
