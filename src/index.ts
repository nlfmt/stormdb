import DBQueryClient from "./DBQueryClient";
import DBManager, { PublicDBMembers } from "./DBManager";
import z from "zod";

import { ObjectId, Transformer } from "./utils";
import type {
    DBDocument,
    DBManagerOptions as DBOptions,
    JSONValue,
    FindQuery,
    Predicate,
    UpdateFn,
    UpdateQuery,
    Model,
    ToInDoc,
    ToOutDoc,
} from "./types";
export {
    ObjectId,
    DBDocument,
    JSONValue,
    Transformer,
    DBOptions as DBManagerOptions,
    FindQuery,
    Predicate,
    UpdateFn,
    UpdateQuery,
    Model,
    ToOutDoc as infer,
    ToInDoc as inferIn,
    z
};
export * from "./ops";

/**
 * Create a new JsonDB client
 * @param path The path to the database file
 * @param models A map of model names to their schemas
 * @returns A DB Client that can be used to query the database
 */
export default function JsonDB<
    ModelDef extends Record<string, Model>
>(
    path: string,
    models: ModelDef,
    options: DBOptions = {
        transformers: []
    },
) {
    const manager = new DBManager(path, models, options);

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
    }) as unknown as {
        [K in keyof ModelDef]: DBQueryClient<ModelDef, K>;
    } & Pick<DBManager<ModelDef>, PublicDBMembers>;
}
