import z from "zod";
import type DBManager from "./DBManager";
import { ObjectId, deepCompare } from "./utils";
import type { FindQuery, Flatten, Predicate, UpdateQuery, WithId } from "./types";

type QueryPart = Record<string | number | symbol, any>;
type DocPart = Record<string | number | symbol, any>;
type DBValue = number | bigint | string | boolean | null | object | undefined;

/** A class that handles all queries for a specific model */
export default class DBQueryClient<
    D extends Record<string, z.ZodSchema<any>>,
    M extends keyof D,
    InDoc extends z.input<D[M]> = Flatten<z.input<D[M]>>,
    _Doc extends z.output<D[M]> = Flatten<z.output<D[M]>>,
    Doc = Flatten<WithId<_Doc>>,
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
    async create(obj: InDoc): Promise<Doc> {
        await this.db.$ready;
        // check if the object is valid
        const res = this.schema.safeParse(obj);
        if (!res.success) throw res.error

        // insert the object
        const id = new ObjectId();
        this.docs[id.id] = res.data as _Doc;

        // save the database
        this.db.requestSave();

        return this.getDoc(id.id)!;
    }

    /**
     * Find a document by its id
     * @param id The id of the document to find
     * @returns The document if found, null otherwise
     */
    async findById(id: ObjectId): Promise<Doc | null> {
        await this.db.$ready;
        return this.getDoc(id.id);
    }

    /**
     * Find a document by a query
     * @param query The query to find the document by
     * @returns The document if found, null otherwise
     */
    async find(where: FindQuery<_Doc>): Promise<Doc | null> {
        await this.db.$ready;

        for (const id in this.docs) {
            if (this.matchQuery(this.docs[id]!, where)) return this.getDoc(id);
        }
        return null;
    }

    /**
     * Find multiple documents by a query
     * @param query The query to find the documents by
     * @returns An array of documents that match the query
     */
    async findMany(where: FindQuery<_Doc> = {}): Promise<Doc[]> {
        await this.db.$ready;
        const ids = this.getMatchingIds(where);
        return ids.map(id => this.getDoc(id)!);
    }

    /**
     * Update a document in the database by its id
     * @param id The id of the document to update
     * @param to The UpdateQuery to update the document with
     * @returns The updated document or null if the document wasn't found
     */
    async updateById(id: ObjectId, to: UpdateQuery<Doc>): Promise<Doc | null> {
        await this.db.$ready;
        let doc = this.docs[id.id]
        if (!doc) return null;

        this.updateDoc(doc, to);

        this.db.requestSave();
        return this.getDoc(id.id);
    }

    /**
     * Update a document in the database
     * @param id The id of the document to update
     * @param obj The object to update the document with
     * @returns The updated document or null if the object is invalid
     * or the document was not found
     */
    async update(where: FindQuery<Doc>, to: UpdateQuery<Doc>): Promise<Doc | null> {
        await this.db.$ready;
        
        const id = this.getMatchingId(where);
        if (!id) return null;
        this.updateDoc(this.docs[id]!, to);

        this.db.requestSave();
        return this.getDoc(id);
    }

    /**
     * Update multiple documents in the database
     * @param where The query to find the documents to update
     * @param to The UpdateQuery to update the documents with
     * @returns An array of the updated documents
     */
    async updateMany(where: FindQuery<_Doc>, to: UpdateQuery<Doc>): Promise<Doc[]> {
        await this.db.$ready;
        const ids = this.getMatchingIds(where);

        for (const id of ids) this.updateDoc(this.docs[id]!, to);

        this.db.requestSave();
        return ids.map(id => this.getDoc(id)!);
    }

    /**
     * Delete a document from the database
     * @param id The id of the document to delete
     * @returns True if the document was deleted, false otherwise
     */
    async deleteById(id: ObjectId): Promise<boolean> {
        await this.db.$ready;
        if (!(id.id in this.docs)) return false;

        delete this.docs[id.id];

        this.db.requestSave();
        return true;
    }

    async delete(where: FindQuery<Doc>): Promise<boolean> {
        await this.db.$ready;
        const id = this.getMatchingId(where);
        if (!id) return false;

        delete this.docs[id];

        this.db.requestSave();
        return true;
    }

    /**
     * Delete multiple documents from the database
     * @param where The query to find the documents to delete
     * @returns The number of documents deleted
     */
    async deleteMany(where: FindQuery<_Doc> = {}): Promise<number> {
        await this.db.$ready;
        const ids = this.getMatchingIds(where);

        if (ids.length === 0) return 0;

        for (const id of ids) {
            delete this.docs[id];
        }

        this.db.requestSave();
        return ids.length;
    }

    private getDoc(id: string): Doc | null {
        const doc = structuredClone(this.docs[id]);
        if (!doc) return null
        doc._id = new ObjectId(id)
        return doc
    }

    private getMatchingId(where: FindQuery<Doc>): string | null {
        return Object.keys(this.docs).find(
            (id) => this.matchQuery(this.docs[id]!, where)
        ) ?? null
    }

    private getMatchingIds(where: FindQuery<_Doc>): string[] {
        const ids: string[] = [];
        for (const id in this.docs) {
            if (this.matchQuery(this.docs[id]!, where)) ids.push(id);
        }
        return ids;
    }

    /** The Array of documents for this model */
    private get docs(): Record<string, _Doc> {
        return (this.db.data[this.mdl] ?? {}) as Record<string, _Doc>;
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
