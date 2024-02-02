import z from "zod";

import DBQueryClient from "./DBQueryClient";

import { DBPersistence, JsonFile, Memory } from "./persistence";
import type { DB, StartsWith } from "./types";

export type PublicDBMembers = StartsWith<keyof DBManager<any>, "$">;

/**
 * Options for the DBManager
 * @param transformers A map of class names to their transformers
 */
export type DBOptions = {
    /** How long to wait for additional changes before saving (milliseconds) */ 
    saveInterval: number;
    /** The persistence layer to use */
    storage: DBPersistence | string;
};

export default class DBManager<
    ModelDef extends Record<string, z.ZodSchema<any>>
> {
    data: DB = {};
    models: ModelDef;
    options: { saveInterval: number; storage: DBPersistence };

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

    constructor(models: ModelDef, options?: Partial<DBOptions>) {
        this.models = models;
        this.options = {
            saveInterval: options?.saveInterval ?? 1000 * 60,
            storage: options?.storage
                ? typeof options.storage === "string"
                    ? new JsonFile(options.storage)
                    : options.storage
                : new Memory()
        };

        this.$ready = this.init();
    }

    getQueryClient(model: string) {
        if (!this.queryClients.has(model))
            this.queryClients.set(model, new DBQueryClient(this, model));
        return this.queryClients.get(model);
    }

    private async init() {
        this.data = await this.options.storage.read();
        for (const model of Object.keys(this.models)) {
            if (model in this.data) continue;
            this.data[model] = {};
            this.requestSave();
        }

    }

    requestSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.$save();
        }, this.options.saveInterval);
    }

    // publicly available methods

    /**
     * Save the database to the persistence layer \
     * You probably dont need to call this, as it is called automatically
     * when the data changes or the database disconnects, but you can if you want to
     * make sure the current state is persisted
     */
    async $save() {
        await this.options.storage.write(this.data);
    }

    /** Disconnect from the database and save it to the persistence implementation */
    async $disconnect() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        await this.$save();
    }
}
