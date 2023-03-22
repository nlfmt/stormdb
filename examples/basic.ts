import JsonDB, { z, $btwn, $regex } from '@nlfmt/json-db';

const userModel = z.object({
  name: z.string().nonempty(),
  age: z.number(),
  hobbies: z.array(z.string()).optional().default([]),
});
type User = z.infer<typeof userModel>;

const db = JsonDB("./db.json", { user: userModel });

db.$ready.then(() => {
    // Add a user
    const usr = db.user.create({
        name: "John",
        age: 20,
    });

    // Get all users
    let users = db.user.findMany();
    console.log(users);

    // Get a user by id
    const user = db.user.findById(usr._id);

    // Advanced querying using a FindQuery
    users = db.user.findMany({
        age: a => a > 18,
        name: n => n.startsWith("J"),
    });

    // Using builtin query functions
    users = db.user.findMany({
        age: $btwn(18, 21),
        name: $regex(/^(J|D)/),
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