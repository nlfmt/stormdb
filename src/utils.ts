import type { JSONValue } from "./types";
import { v4 as uuid } from "uuid";

export class ObjectId {
    id: string;
    constructor(id?: string) {
        if (id) {
            // Test if the string is a valid uuid
            if (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                    id
                )
            ) {
                this.id = id;
            } else throw new Error("Invalid ObjectId");
        } else this.id = uuid();
    }

    toString() {
        return this.id;
    }

    equals(other: ObjectId) {
        return this.id === other.id;
    }
}

/**
 * Deep compare two values
 * @param a
 * @param b
 * @returns True if the values are equal, false otherwise
 */
export function deepCompare(a: any, b: any): boolean {
    // TODO: change this to recursive compare?
    if (a === b) return true;
    return JSON.stringify(a) === JSON.stringify(b);
}

/** Represents a transformer that can serialize/deserialize a class instance to/from JSON */
export class Transformer<O, V extends JSONValue> {
    $type: string;
    serialize: (obj: O) => V;
    deserialize: (obj: V) => O;

    /**
     * Create a new transformer
     * @param cls The class type
     * @param serialize The function to serialize the object to JSON
     * @param deserialize The function to deserialize the object from JSON
     */
    constructor(
        cls: { new (...args: any[]): O },
        serialize: (obj: O) => V,
        deserialize: (obj: V) => O
    ) {
        this.$type = cls.name;
        this.serialize = serialize;
        this.deserialize = deserialize;
    }
}

export const ObjectIdTransformer = new Transformer(
    ObjectId,
    (obj) => obj.id,
    (obj) => new ObjectId(obj)
);

export const DateTransformer = new Transformer(
    Date,
    (obj) => obj.getTime(),
    (obj) => new Date(obj)
);

export const SetTransformer = new Transformer(
    Set,
    (obj) => Array.from(obj) as JSONValue[],
    (obj) => new Set(obj)
);

export const MapTransformer = new Transformer(
    Map,
    (obj) => Array.from(obj.entries()) as [string, JSONValue][],
    (obj) => new Map(obj)
);

export const DefaultTransformers = [
    ObjectIdTransformer,
    DateTransformer,
    SetTransformer,
    MapTransformer,
];
