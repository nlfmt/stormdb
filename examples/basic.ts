import StormDB, {
  $btwn,
  $regex,
  DocType,
  $contains,
  $push,
  InDocType,
} from "@nlfmt/stormdb"

// example using valibot
import * as v from "valibot"

const userModel = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  age: v.number(),
  hobbies: v.optional(v.array(v.string()), [])
})

// same example using zod, comment out the above import and uncomment this one to use
// import { z } from "zod"

// const userModel = z.object({
//   name: z.string().min(1),
//   age: z.number(),
//   hobbies: z.array(z.string()).optional().default([]),
// })

type User = DocType<typeof userModel>

const db = StormDB(
  { user: userModel },
  {
    storage: "db.json",
  }
)

async function main() {
  // Add a user
  const usr = await db.user.create({
    name: "John",
    age: 20,
  })
  const usr2 = await db.user.create({
    name: "James",
    age: 20,
    hobbies: ["coding"],
  })

  // Get all users
  let users = await db.user.findMany()
  console.log(users)

  // Get a user by id
  const user = await db.user.findById(usr._id)

  // Advanced querying using a FindQuery
  users = await db.user.findMany({
    age: a => a > 18,
    name: n => n.startsWith("J"),
    hobbies: $contains("coding"),
  })

  // Using builtin query functions
  users = await db.user.findMany({
    age: $btwn(18, 21),
    name: $regex(/^J/),
  })

  // Update a user
  const update = await db.user.updateById(usr._id, {
    age: 21,
    name: oldName => oldName + " Doe",
    hobbies: $push("coding"),
  })
  console.log("updated:", update)

  // Delete a user
  console.log(await db.user.deleteById(usr._id))

  await db.$disconnect()
}

main()
