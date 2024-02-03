import StormDB, { DefaultTransformers, JsonFile, Transformer } from "@nlfmt/stormdb";
import { z } from "zod";

// a custom class that needs to be serialized
class SomeClass {
  constructor(public name: string, public info: string) {}
}

const SomeClassTransformer = new Transformer(
  SomeClass,
  // Here you can define how your class will be saved in json
  (obj) => [obj.name, obj.info],
  // And here how to turn the json back into your class
  ([name, info]) => new SomeClass(name, info)
)

// By default, StormDB uses the DefaultTransformers, which can transform Maps, Sets, Dates, and Buffers
const storage = new JsonFile("db.json", {
    transformers: [...DefaultTransformers, SomeClassTransformer]
});

const db = StormDB({
  user: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    someClass: z.instanceof(SomeClass),
  })
}, { storage });


async function main() {
  const user = await db.user.create({
    name: "John",
    email: "john@mail.com",
    someClass: new SomeClass("test", "info"),
  });
}

main();
