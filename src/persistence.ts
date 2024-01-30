import { accessSync, constants, promises as fs } from "fs";
import { DefaultTransformers, ObjectId, Transformer } from "./utils";
import { DB, JSONValue } from "./types";

/** Represents an implementation to persist the DB data */
export interface DBPersistence {
    /**
     * Read from persistence implementation and return the DB data
     * @returns The DB data
     * @throws Error if the data could not be read
     */
    read(): Promise<DB>;
    /**
     * Write the DB data to the persistence implementation
     * @param data The DB data
     * @throws Error if the data could not be written
     */
    write(data: DB): Promise<void>;
}

/** Represents a location to save data, e.g. a file */
export interface SaveLocation<T> {
    save(data: T): Promise<void>;
    load(): Promise<T>;
}
export type FileSaveLocationOptions = { createIfNotExists?: boolean };

/** Save data to a file */
export class FileSaveLocation implements SaveLocation<string> {
    private file: string;
    private options: FileSaveLocationOptions;

    constructor(file: string, options: FileSaveLocationOptions = { createIfNotExists: true }) {
        this.file = file;
        this.options = options;

        try {
            accessSync(this.file, constants.F_OK);
        } catch (e) {
            if (this.options.createIfNotExists) fs.writeFile(this.file, "");
            else throw new Error(`File ${this.file} does not exist`);
        }
    }

    async save(data: string) {
        await fs.writeFile(
            this.file,
            data
        );
    }

    async load() {
        return await fs.readFile(this.file, "utf-8");
    }
}

export type JsonFileOptions = { transformers?: Transformer<any, any>[] };

export class JsonFile implements DBPersistence {
    private options: Required<JsonFileOptions>;
    private saveLoc: SaveLocation<any>;

    constructor(
        saveLocation: SaveLocation<any> | string,
        options?: JsonFileOptions
    ) {
        this.options = {
            transformers: options?.transformers ?? DefaultTransformers
        };
        this.saveLoc =
            typeof saveLocation === "string"
                ? new FileSaveLocation(saveLocation)
                : saveLocation;
    }

    /**
     * Read the database from the file
     * @throws {Error} If the file contains invalid json
     */
    async read() {
        const txt = await this.saveLoc.load();
        try {
            return JSON.parse(
                txt,
                this.reviver.bind(this)
            ) as DB;
        } catch (e) {
            this.saveLoc.save("{}");
            return {};
        }
    }

    async write(data: DB) {
        await this.saveLoc.save(
            JSON.stringify(data, this.replacer.bind(this))
        );
    }

    /** Reviver function for JSON.parse */
    private reviver(k: any, value: JSONValue): any {
        if (k === "_id" && typeof value === "string") return new ObjectId(value);

        if (typeof value !== "object" || !value || Array.isArray(value))
            return value;
        if (!("$oid" in value && "$ov" in value)) return value;

        const transformer = this.options.transformers.find(
            (tr) => tr.$type === value.$oid
        );
        if (!transformer) return value;

        return transformer.deserialize(value.$ov);
    }

    /** Replacer function for JSON.stringify */
    private replacer(k: any, value: unknown): any {
        if (k === "_id" && value instanceof ObjectId) return value.toString();
        
        if (typeof value !== "object" || !value) return value;
        const transformer = this.options.transformers.find(
            (tr) => value.constructor?.name === tr.$type
        );

        if (!transformer) return value;

        return {
            $oid: transformer.$type,
            $ov: transformer.serialize(value)
        };
    }
}

export class Memory implements DBPersistence {
    async read() {
        return {};
    }
    async write(data: DB) { }
}
