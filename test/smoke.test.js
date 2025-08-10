const test = require("node:test");
const assert = require("node:assert");

const app = require("../src/server");

test("a aplicação carrega", () => {
  assert.ok(app);
});
