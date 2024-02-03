---
"@nlfmt/stormdb": major
---

Polish Querying API, improve performance

- Make querying API asynchronous
- Use shorter keys instead of uuids
- Switch to objects to store data, so id lookups are in constant time
- Add examples for serialization
- Bump and clean dependencies

To migrate from older versions, youll have to use the async APIs whenever calling querying functions.
