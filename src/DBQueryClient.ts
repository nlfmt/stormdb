import z from "zod";
import type DBManager from "./DBManager";
import { ObjectId, deepCompare } from "./utils";
import { FindQuery, Predicate, ToInDoc, ToOutDoc, UpdateQuery } from "./types";

type QueryPart = Record<string | number | symbol, any>;
type DocPart = Record<string | number | symbol, any>;
type DBValue = number | bigint | string | boolean | null | object | undefined;
type Flatten<T> = T extends object ? { [K in keyof T]: T[K] } : T;

/** A class that handles all queries for a specific model */
export default class DBQueryClient<
    D extends Record<string, z.ZodSchema<any>>,
    M extends keyof D,
    InDoc extends z.input<D[M]> & { _id: ObjectId } = Flatten<ToInDoc<D, M>>,
    Doc extends z.input<D[M]> & { _id: ObjectId } = Flatten<ToOutDoc<D, M>>
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
    async create(obj: InDoc): Promise<Flatten<Doc>> {
        await this.db.$ready;
        // check if the object is valid
        const res = this.schema.safeParse(obj);
        if (!res.success) throw res.error

        // insert the object
        const newObj = { ...res.data, _id: new ObjectId() } as Doc;
        this.docs.push(newObj);

        // save the database
        this.db.requestSave();

        return newObj;
    }

    /**
     * Find a document by its id
     * @param id The id of the document to find
     * @returns The document if found, null otherwise
     */
    async findById(id: ObjectId): Promise<Readonly<Doc> | null> {
        await this.db.$ready;
        const doc = this.docs.find((e) => e._id.equals(id));
        return doc ?? null;
    }

    /**
     * Find a document by a query
     * @param query The query to find the document by
     * @returns The document if found, null otherwise
     */
    async find(where: FindQuery<Doc>): Promise<Readonly<Doc> | null> {
        await this.db.$ready;
        const doc = this.docs.find((d) => this.matchQuery(d, where));
        return doc ?? null;
    }

    /**
     * Find multiple documents by a query
     * @param query The query to find the documents by
     * @returns An array of documents that match the query
     */
    async findMany(where: FindQuery<Doc> = {}): Promise<Readonly<Doc>[]> {
        const docs = this.docs.filter((d) => this.matchQuery(d, where));
        return docs ?? [];
    }

    /**
     * Update a document in the database by its id
     * @param id The id of the document to update
     * @param to The UpdateQuery to update the document with
     * @returns The updated document or null if the document wasn't found
     */
    async updateById(id: ObjectId, to: UpdateQuery<Doc>): Promise<Readonly<Doc> | null> {
        let doc = this.docs.find((e) => e._id.equals(id));
        if (!doc) return null;

        doc = this.updateDoc(doc, to);

        this.db.requestSave();
        return doc ?? null;
    }

    /**
     * Update a document in the database
     * @param id The id of the document to update
     * @param obj The object to update the document with
     * @returns The updated document or null if the object is invalid
     * or the document was not found
     */
    async update(where: FindQuery<Doc>, to: UpdateQuery<Doc>): Promise<Readonly<Doc> | null> {
        let doc = this.docs.find((e) => this.matchQuery(e, where));
        if (!doc) return null;

        doc = this.updateDoc(doc, to);

        this.db.requestSave();
        return doc ?? null;
    }

    /**
     * Update multiple documents in the database
     * @param where The query to find the documents to update
     * @param to The UpdateQuery to update the documents with
     * @returns An array of the updated documents
     */
    async updateMany(where: FindQuery<Doc>, to: UpdateQuery<Doc>): Promise<Readonly<Doc>[]> {
        const docs = this.docs.filter((d) => this.matchQuery(d, where));

        for (const doc of docs) this.updateDoc(doc, to);

        this.db.requestSave();
        return docs ?? [];
    }

    /**
     * Delete a document from the database
     * @param id The id of the document to delete
     * @returns True if the document was deleted, false otherwise
     */
    async deleteById(id: ObjectId): Promise<boolean> {
        const idx = this.docs.findIndex((e) => e._id.equals(id));
        if (!idx || idx === -1) return false;

        this.docs.splice(idx, 1);

        this.db.requestSave();
        return true;
    }

    async delete(where: FindQuery<Doc>): Promise<boolean> {
        const idx = this.docs.findIndex((e) => this.matchQuery(e, where));
        if (!idx || idx === -1) return false;

        this.docs.splice(idx, 1);

        this.db.requestSave();
        return true;
    }

    /**
     * Delete multiple documents from the database
     * @param where The query to find the documents to delete
     * @returns The number of documents deleted
     */
    async deleteMany(where: FindQuery<Doc> = {}): Promise<number> {
        const idxs = this.docs.reduce<number[]>((acc, e, i) => {
            if (this.matchQuery(e, where)) acc.push(i);
            return acc;
        }, []);

        if (!idxs || idxs.length === 0) return 0;

        for (const idx of idxs) {
            this.docs.splice(idx, 1);
        }

        this.db.requestSave();
        return idxs.length;
    }

    /** The Array of documents for this model */
    private get docs(): Doc[] {
        return (this.db.data[this.mdl] ?? []) as Doc[];
    }

    /** The Zod Schema for this Model */
    private get schema(): D[M] {
        return this.db.models[this.mdl];
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

    /**
     * Update a document with an update query
     * @param doc The document to update
     * @param to The update query to update the document with
     */
    private updateDoc(doc: DocPart, to: UpdateQuery<DocPart>): any {
        /*
         * Check if to is an update function, if so, replace the doc with the result of the function
         * otherwise, go through every key in the update query and update the corresponding key in the doc
         * if the value is an object, recurse
         */

        if (typeof to === "function") {
            const newDoc = to(doc);
            if (newDoc) {
                // FIXME: probably redundant
                for (const key in newDoc) {
                    doc[key] = newDoc[key];
                }
            }
        } else {
            for (const key in to) {
                const updateValue = to[key] as DBValue | UpdateQuery<DBValue>;
                if (updateValue === undefined) continue;
                const docValue = doc[key] as DBValue;

                if (
                    typeof updateValue === "object" &&
                    typeof docValue === "object" &&
                    updateValue !== null &&
                    docValue !== null
                ) {
                    this.updateDoc(docValue, updateValue);
                } else if (typeof updateValue === "function") {
                    doc[key] = updateValue(docValue);
                } else {
                    doc[key] = updateValue;
                }
            }
        }
        return doc;
    }
}
