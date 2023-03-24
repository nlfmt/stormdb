import StormDB, { DBPersistence, FileSaveLocation, JsonFile, SaveLocation, z } from '@nlfmt/stormdb';

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

// You can define your own DBPersistence class or switch out the SaveLocation of the JsonFile
class MySaveLocation implements SaveLocation<string> {
    async save(data: string) {
        console.log('Saving data:', data);
    }

    async load() {
        return '{}';
    }
}

// This example class is basically the implementation of the default storage: `Memory`.
class MyPersistence implements DBPersistence {
    async read() {
        return {};
    }

    async write(data: any) {
        console.log('Writing data:', data);
    }
}