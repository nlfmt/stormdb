import type { ObjectId } from "./utils";
import type z from "zod";

export type Flatten<T> = T extends object ? { [K in keyof T]: T[K] } : T;
export type StartsWith<
    T extends string,
    Start extends string
> = T extends `${Start}${string}` ? T : never;


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

    export type NoId<T> = Omit<T, "_id">;
export type WithId<T> = T & { _id: ObjectId };

/** Infers the type you need to input when creating a document of model type T */
export type inferIn<T extends z.ZodSchema<any>> = z.input<T>;
/** Infers the type you get when querying a document of model type T */
export type inferOut<T extends z.ZodSchema<any>> = WithId<z.output<T>>;

export type ToInDoc<D extends Record<string, z.ZodSchema<any>>, M extends keyof D> = {
    [K in keyof D]: inferIn<D[K]>;
}[M];

export type ToOutDoc<D extends Record<string, z.ZodSchema<any>>, M extends keyof D> = {
    [K in keyof D]: inferOut<D[K]>;
}[M];

export type DB = {
    [key: string]: Record<string, DBDocument> | undefined;
};