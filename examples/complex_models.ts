import StormDB, { DocType } from "@nlfmt/stormdb"
import { z } from "zod"

const userModel = z.object({
  name: z.string().default("new user"),
  hobbies: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional().default(""),
    })
  ),
  isAdmin: z.boolean().default(false),
  test: z.object({
    deeply: z.object({
      nested: z.object({
        value: z.string().default(""),
      }),
    }),
  }),
  tuple: z.tuple([z.string(), z.number()]),
  union: z.union([z.string(), z.number()]),
})
type User = DocType<typeof userModel>

const db = StormDB({ user: userModel })

async function main() {
  // You will get exact intellisense for the user model
  const usr = db.user.create({
    hobbies: [{ name: "Coding", description: "controlling computers" }],
    test: { deeply: { nested: { value: "test" } } },
    tuple: ["test", 1],
    union: "test",
  })

  // Try it yourself! Type 'usr.' and hit ctrl+space to see what is available
  usr

  db.$disconnect()
}

main()
