# Storm DB
A **S**imple **T**ypescript **ORM** for NodeJS. Supports custom class serialization and deserialization, advanced querying, and more. \

## Disclaimer
### Pros
StormDB is a good choice for projects, that need a simple typesafe database, that works out of the box. \
Since all the data is stored in JSON (or a format of your choice), you dont have to set up anything like a server. \
StormDB can be used in any project you wish, as it is very lightweight.

### Cons
StormDB is **NOT** a good choice to store large amounts of data, as it loads the entire database into memory. \
It is also not suitable for applications that need very fast data access. Even though StormDB is quite fast, as the data is stored in memory, \
it doesnt do any querying optimizations, like indexing. \


## Quickstart
1. Install the package `npm install @nlfmt/stormdb`
2. Initialize the database
```ts
import StormDB from '@nlfmt/stormdb';
import { z } from 'zod';

const userModel = z.object({
  name: z.string(),
  age: z.number(),
});

const db = StormDB({ user: userModel }, { storage: "db.json" });
```
3. Use the querying API
```ts
// Add a user
let usr = await db.user.create({ name: "John", age: 20 });

// Get a user
usr = await db.user.findById(usr._id);
usr = await db.user.find({ name: "John" });

// Update a user
usr = await db.user.updateById(usr._id, { age: 21 });
usr = await db.user.update({ name: "John" }, { age: 21 });

// Delete a user
await db.user.deleteById(usr._id);
```
## Examples
For more examples, check out the `examples` folder.