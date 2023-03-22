import { promises as fs, constants as fsConstants } from "fs";
import z from "zod";

import { ObjectIdTransformer } from "./utils";
import DBQueryClient from "./DBQueryClient";

import { DBDocument, DBManagerOptions, JSONValue } from "./types";

type DB = {
    [key: string]: DBDocument[] | undefined;
};

export type PublicDBMembers = "$ready" | "$save" | "$disconnect";

export default class DBManager<
    ModelDef extends Record<string, z.ZodSchema<any>>
> {
    path: string;
    data: DB = {};
    models: ModelDef;
    options: DBManagerOptions;

    saveTimeout: NodeJS.Timeout | null = null;

    /**
     * Promise that resolves when the database is ready to be used \
     * Data written to the db before this resolves will be lost
     */
    $ready: Promise<void>;

    /** Stores a map of model names to their query clients to
     * prevent multiple instances of the same model's query client */
    queryClients: Map<keyof ModelDef, DBQueryClient<ModelDef, keyof ModelDef>> =
        new Map();

    constructor(path: string, models: ModelDef, options: DBManagerOptions) {
        this.path = path;
        this.models = models;
        this.options = options;
        this.options.transformers.push(ObjectIdTransformer);

        this.$ready = this.loadFromFile();
    }

    getQueryClient(model: string) {
        if (!this.queryClients.has(model))
            this.queryClients.set(model, new DBQueryClient(this, model));
        return this.queryClients.get(model);
    }

    /** Reviver function for JSON.parse */
    private reviver(k: any, value: JSONValue): any {
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
    private replacer(k: any, value: any): any {
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

    private async loadFromFile() {
        try {
            await fs.access(this.path, fsConstants.R_OK | fsConstants.W_OK);
            this.data = JSON.parse(
                await fs.readFile(this.path, "utf-8"),
                this.reviver.bind(this)
            ) as DB;

            // Validate the data
            for (const model in this.models) {
                const modelSchema = this.models[model];
                const modelData = this.data[model];
                if (!modelData || !Array.isArray(modelData))
                    throw new Error(`Invalid data for model ${model}`);
            }
        } catch (e) {
            this.data = {};
            for (const model in this.models) {
                this.data[model] = [];
            }
            await this.$save();
        }
    }

    requestSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.$save();
        }, 1000);
    }

    // publicly available methods

    /**
     * Save the database to disk \
     * You probably dont need to call this, as its is called automatically
     * when the data changes or the database disconnects, but you can if you want to
     * make sure the current state is written to disk.
     */
    async $save() {
        const serialized = JSON.stringify(this.data, this.replacer.bind(this));
        await fs.writeFile(this.path, serialized);
    }

    /**
     * Disconnect from the database and save it to disk
     */
    async $disconnect() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        await this.$save();
    }
}
