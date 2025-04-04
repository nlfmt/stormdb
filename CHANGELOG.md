# @nlfmt/stormdb

## 2.0.0

### Major Changes

- 366e2b7: Allow multiple validation libraries using typeschema

  This release adds the capabilities to use any validation library to define schemas in StormDB with the help of the typeschema library, an abstraction over the most common validation libraries

## 1.0.0

### Major Changes

- 8d2999a: Polish Querying API, improve performance

  - Make querying API asynchronous
  - Use shorter keys instead of uuids
  - Switch to objects to store data, so id lookups are in constant time
  - Add examples for serialization
  - Bump and clean dependencies

  To migrate from older versions, youll have to use the async APIs whenever calling querying functions.

## 0.1.2

### Patch Changes

- 8aeab1b: fix wrong files field in package.json and move public access to config file

## 0.1.1

### Patch Changes

- 4903478: set access to public to fix publish error

## 0.1.0

### Minor Changes

- 059309e: add complex model example, more built-in update operations
