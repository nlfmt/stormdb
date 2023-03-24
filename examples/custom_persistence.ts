import StormDB, { FileSaveLocation, JsonFile, z } from '@nlfmt/stormdb';

const userModel = z.object({
    name: z.string().nonempty(),
    age: z.number(),
    hobbies: z.array(z.string()).optional().default([]),
});

const models = { user: userModel };

// This is what is actually happening when you pass a string to the storage option
const file = new FileSaveLocation('db.json', {
    createIfNotExists: true,
});
const storage = new JsonFile(file);
const db = StormDB(models, { storage });