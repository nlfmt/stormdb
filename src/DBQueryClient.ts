import z from "zod";
import type DBManager from "./DBManager";
import { ObjectId, deepCompare } from "./utils";
import { FindQuery, InferModelDef, Predicate, UpdateQuery } from "./types";


type QueryPart = Record<string | number | symbol, any>;
type DocPart = Record<string | number | symbol, any>;
type DBValue = number | bigint | string | boolean | null | object | undefined;


/** A class that handles all queries for a specific model */
export default class DBQueryClient<
    D extends Record<string, z.ZodSchema<any>>,
    M extends keyof D
> {
    /** The name of the model this query client is for */
    private mdl: M;
    /** The database manager */
    private db: DBManager<D>;

    /**
     * Create a new query client
     * @param db The database manager
     * @param model The name of the model this query client is for
     */
    constructor(db: DBManager<D>, model: M) {
        this.mdl = model;
        this.db = db;
    }

    /**
     * Create a new document and insert it into the database
     * @param obj The object to insert into the database
     * @returns The inserted document or null if the object is invalid
     */
    create(obj: Omit<InferModelDef<D>[M], "_id">): InferModelDef<D>[M] | null {
        const { mdl } = this;
        const modelSchema = this.db.models[mdl];

        // check if the object is valid
        try {
            modelSchema.parse(obj);
        } catch (err) {
            console.error(err);
            return null;
        }

        // insert the object
        const newObj = { ...obj, _id: new ObjectId() };
        this.db.data[mdl]?.push(newObj);

        // save the database
        this.db.requestSave();

        return newObj;
    }

    /**
     * Find a document by its id
     * @param id The id of the document to find
     * @returns The document if found, null otherwise
     */
    findById(id: ObjectId): InferModelDef<D>[M] | null {
        const entry = this.db.data[this.mdl]?.find((e) => e._id.equals(id));
        return entry ?? null;
    }

    /**
     * Find a document by a query
     * @param query The query to find the document by
     * @returns The document if found, null otherwise
     */
    find(where: FindQuery<InferModelDef<D>[M]>): InferModelDef<D>[M] | null {
        const doc = this.db.data[this.mdl]?.find((d) =>
            this.matchQuery(d, where)
        );

        return doc ?? null;
    }

    /**
     * Find multiple documents by a query
     * @param query The query to find the documents by
     * @returns An array of documents that match the query
     */
    findMany(where: FindQuery<InferModelDef<D>[M]> = {}): InferModelDef<D>[M][] {
        const docs = this.db.data[this.mdl]?.filter((d) =>
            this.matchQuery(d, where)
        );

        return docs ?? [];
    }

    // TODO: implement & document
    updateById(
        id: ObjectId,
        to: UpdateQuery<InferModelDef<D>[M]>
    ): InferModelDef<D>[M] | null {
        
        return null;
    }

    
    /**
     * Update a document in the database
     * @param id The id of the document to update
     * @param obj The object to update the document with
     * @returns The updated document or null if the object is invalid
     * or the document was not found
     */
    // TODO: implement
    update(
        where: FindQuery<InferModelDef<D>[M]>,
        to: UpdateQuery<InferModelDef<D>[M]>
    ): InferModelDef<D>[M] | null {
        return null;
    }

    // TODO: implement & document
    updateMany(
        where: FindQuery<InferModelDef<D>[M]> = {},
        to: UpdateQuery<InferModelDef<D>[M]>
    ): InferModelDef<D>[M][] {
        const { mdl } = this;

        return [];
    }



    /**
     * Delete a document from the database
     * @param id The id of the document to delete
     * @returns True if the document was deleted, false otherwise
     */
    deleteById(id: ObjectId): boolean {
        const { mdl } = this;

        const idx = this.db.data[this.mdl]?.findIndex((e) => e._id.equals(id));
        if (!idx || idx === -1) return false;

        this.db.data[mdl]?.splice(idx, 1);

        this.db.requestSave();
        return true;
    }

    delete(where: FindQuery<InferModelDef<D>[M]>): boolean {
        const { mdl } = this;

        const idx = this.db.data[this.mdl]?.findIndex((e) =>
            this.matchQuery(e, where)
        );
        if (!idx || idx === -1) return false;

        this.db.data[mdl]?.splice(idx, 1);

        this.db.requestSave();
        return true;
    }

    /**
     * Delete multiple documents from the database
     * @param where The query to find the documents to delete
     * @returns The number of documents deleted
     */
    deleteMany(where: FindQuery<InferModelDef<D>[M]> = {}): number {
        const { mdl } = this;

        const idxs = this.db.data[this.mdl]?.reduce<number[]>((acc, e, i) => {
            if (this.matchQuery(e, where)) acc.push(i);
            return acc;
        }, []);

        if (!idxs || idxs.length === 0) return 0;

        for (const idx of idxs) {
            this.db.data[mdl]?.splice(idx, 1);
        }

        this.db.requestSave();
        return idxs.length;
    }

    /**
     * Check if a document matches a query
     * @param doc The document to check
     * @param query The query to check the document against
     * @returns True if the document matches the query, false otherwise
     */
    private matchQuery(doc: DocPart, query: QueryPart): boolean {
        /*
         * Go through every key in the query part and assure the corresponding key in the doc part matches
         * if the value of the query's key is an object, recurse, if it is a predicate function,
         * call it with the value of the doc's key and return the result
         * if the value of the query's key is not an object, compare the two values with deepCompare
         */

        for (const key in query) {
            const queryValue = query[key] as DBValue | Predicate<any>;
            if (queryValue === undefined) continue;
            const docValue = doc[key] as DBValue;

            if (
                typeof queryValue === "object" &&
                typeof docValue === "object" &&
                queryValue !== null &&
                docValue !== null
            ) {
                if (!this.matchQuery(docValue, queryValue)) return false;
            } else if (typeof queryValue === "function") {
                if (!queryValue(docValue)) return false;
            } else {
                if (!deepCompare(docValue, queryValue)) return false;
            }
        }
        return true;
    }
}
