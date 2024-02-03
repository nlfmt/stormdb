import { z } from "zod"
import StormDB, { $contains, $div, ObjectId } from "@nlfmt/stormdb"

const db = StormDB(
  {
    user: z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
    shop: z.object({
      name: z.string().min(1),
      location: z.string().min(1),
      item: z.object({
        name: z.string().min(1),
        price: z.number().min(0),
        subitems: z.array(
          z.object({
            name: z.string().min(1),
            price: z.number().min(0),
          })
        ),
        info: z.object({
          description: z.string().min(1),
          rating: z.number().min(0).max(5),
          deep: z.object({
            nested: z.object({
              value: z.number(),
            }),
          }),
        }),
      }),
    }),
  },
  { storage: "db.json" }
)

class Timer {
  private $start: [number, number] | undefined
  private $label: string | undefined

  constructor() {
    this.$start = process.hrtime()
  }

  start(label: string = "") {
    this.$label = label
    this.$start = process.hrtime()
  }

  end() {
    const end = process.hrtime(this.$start)
    const msg = this.$label ? this.$label + ": " : ""
    console.log(msg, end[0] * 1000 + end[1] / 1e6, "ms")
  }
}

async function main() {
  const timer = new Timer()

  timer.start("DB ready")
  await db.$ready
  timer.end()

  timer.start("Create 1M users")
  // for (let i = 0; i < 1_000_000; i++) {
  //   await db.user.create({
  //     name: "DB User " + i,
  //     email: "dbuser" + i + "@mail.com",
  //   });
  // }
  timer.end()

  timer.start("Fetch user 9")
  console.log(await db.user.find({ name: "DB User 9" }))
  timer.end()
  timer.start("Fetch user 999")
  console.log(await db.user.find({ name: "DB User 999" }))
  timer.end()
  timer.start("Fetch user 99999")
  console.log(await db.user.find({ name: "DB User 99999" }))
  timer.end()
  timer.start("Fetch user 999999")
  console.log(await db.user.find({ name: "DB User 999999" }))
  timer.end()
  timer.start("Fetch user 999999 by ID")
  console.log(await db.user.findById(new ObjectId("fafcb21f9ef46d0f")))
  console.log(await db.user.findById(new ObjectId("fafcb21f9ef46d0f")))
  console.log(await db.user.findById(new ObjectId("fafcb21f9ef46d0f")))
  console.log(await db.user.findById(new ObjectId("fafcb21f9ef46d0f")))
  timer.end()

  // timer.start("Fetch user 999");
  // console.log(await db.user.findById(new ObjectId(999)));
  // timer.end();

  // timer.start("Fetch user 9999");
  // console.log(await db.user.findById(new ObjectId(9999)));
  // timer.end();

  // timer.start("Fetch user 999999");
  // console.log(await db.user.findById(new ObjectId(999999)));
  // timer.end();

  // const shop = await db.shop.create({
  //   name: "Shop",
  //   location: "Earth",
  //   item: {
  //     name: "Item",
  //     price: 10,
  //     subitems: [],
  //     info: {
  //       description: "This is an item",
  //       rating: 5,
  //       deep: {
  //         nested: {
  //           value: 10,
  //         },
  //       },
  //     },
  //   },
  // });

  // const upd = await db.shop.updateById(shop._id, {
  //   item: {
  //     info: {
  //       rating: $div(2),
  //       deep: {
  //         nested: v => ({ value: v.value + 10 }),
  //       },
  //     }
  //   },
  // });

  // console.log(shop, upd, shop.item.info.deep.nested.value, upd?.item.info.deep.nested.value);

  await db.$disconnect()
}

main()
