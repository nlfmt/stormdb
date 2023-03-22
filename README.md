# JSON DB
Simple but feature rich JSON database for NodeJS. Supports custom class serialization and deserialization, advanced querying, and more.


## Quickstart
1. Install the package `npm install @nlfmt/json-db`
2. Install zod `npm install zod`
3. Initialize the database
```ts
import JsonDB from '@nlfmt/json-db';
import z from 'zod';

const userModel = z.object({
  name: z.string().nonempty(),
  age: z.number().optional(),
});

const db = JsonDB("./db.json", { user: userModel });

db.$ready.then(() => {
    // Add a user
    const usr = db.user.create({
        name: "John",
        age: 20,
    });

    // Get all users
    const users = db.user.findMany();
    console.log(users);

    // Get a user by id
    const user = db.user.findById(usr._id);

    // Advanced querying using a FindQuery
    const users = db.user.findMany({
        age: a => a > 18,
        name: n => n.startsWith("J"),
    });

    // Update a user
    db.user.updateById(usr._id, {
        age: 21,
        name: oldName => oldName + " Doe",
    });

    // Delete a user
    db.user.deleteById(usr._id);

    db.$disconnect();
});
```

## Serializing custom classes
```ts
import JsonDB, { Transformer } from '@nlfmt/json-db';

class Test {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    greet() {
        console.log(`Hello, my name is ${this.name}`);
    }
}

const testTransformer = new Transformer(
    Test,
    (test: Test) => ({ name: test.name }),  // Serialize
    (data: any) => new Test(data.name),     // Deserialize
);

const db = JsonDb("./db.json", {/* models */}, { transformers: [testTransformer] });
```


