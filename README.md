# Storm DB
A **S**imple **T**ypescript **ORM** for NodeJS. Supports custom class serialization and deserialization, advanced querying, and more.


## Quickstart
1. Install the package `npm install @nlfmt/stormdb`
2. Initialize the database
```ts
import StormDB, { z } from '@nlfmt/stormdb';

const userModel = z.object({
  name: z.string(),
  age: z.number(),
});

const db = StormDB({ user: userModel }, { storage: "db.json" });
```
3. Use the querying API
```ts
// Add a user
let usr = db.user.create({ name: "John", age: 20 });

// Get a user
usr = db.user.findById(usr._id);
usr = db.user.find({ name: "John" });

// Update a user
usr = db.user.updateById(usr._id, { age: 21 });
usr = db.user.update({ name: "John" }, { age: 21 });

// Delete a user
db.user.deleteById(usr._id);
```
## Examples
For more examples, check out the `examples` folder.