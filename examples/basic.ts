import StormDB, { z, $btwn, $regex, DocType, $contains, $push } from '@nlfmt/stormdb';

const userModel = z.object({
  name: z.string().nonempty(),
  age: z.number(),
  hobbies: z.array(z.string()).optional().default([]),
});
type User = DocType<typeof userModel>;

const db = StormDB({ user: userModel }, {
    storage: "db.json"
});

db.$ready.then(() => {
    // Add a user
    const usr: User = db.user.create({
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
        hobbies: $contains("coding"),
    });

    // Using builtin query functions
    users = db.user.findMany({
        age: $btwn(18, 21),
        name: $regex(/^J/),
    });

    // Update a user
    db.user.updateById(usr._id, {
        age: 21,
        name: oldName => oldName + " Doe",
        hobbies: $push("coding"),
    });

    // Delete a user
    console.log(db.user.deleteById(usr._id));

    db.$disconnect();
});