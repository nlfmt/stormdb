import DBManager, { PublicDBMembers, DBOptions } from "./DBManager";
import DBQueryClient from "./DBQueryClient";
import z from "zod";

export * from "./persistence";
import {
    DB, DBDocument, Model,
    UpdateFn, UpdateQuery, FindQuery,
    Predicate,
    JSONValue,
    NoId, WithId,
    inferIn, inferOut
} from "./types";
export * from "./utils";
export * from "./ops";
export {
    DB, DBOptions, DBDocument, Model,
    UpdateFn, UpdateQuery, FindQuery,
    Predicate,
    JSONValue,
    NoId, WithId,
    inferOut as DocType,
    inferIn as InDocType
};

/**
 * Create a new StormDB client
 * @param path The path to the database file
 * @param models A map of model names to their schemas
 * @returns A DB Client that can be used to query the database
 */
export default function StormDB<ModelDef extends Record<string, Model>>(
    models: ModelDef,
    options?: Partial<DBOptions>
) {
    const manager = new DBManager(models, options);

    // Using a proxy we can map model names to query clients
    return new Proxy(manager, {
        get(manager, prop) {
            prop = String(prop);

            // If the property is a model name, return a query client for that model
            if (prop in models) return manager.getQueryClient(prop as string);
            // If the property is a method of the manager, return that method
            else if (prop in manager)
                return manager[prop as keyof typeof manager];
            else throw new Error(`Unknown property ${prop} in DBClient`);
        }
    }) as {
        [K in keyof ModelDef]: DBQueryClient<ModelDef, K>;
    } & Pick<DBManager<ModelDef>, PublicDBMembers>;
}
