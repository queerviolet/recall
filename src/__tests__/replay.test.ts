import { replay } from "../replay";

describe("replay", () => {
  it("recalls functions which return iterators", () => {
    let calls = 0;
    const items = replay(function* items() {
      ++calls;
      yield 1;
      yield 2;
      yield 3;
    });
    expect([...items()]).toEqual([...items()]);
    expect(calls).toBe(1);
    expect(items()).not.toBe(items());
  });

  it("lazily evaluates underlying iterator", () => {
    const log: string[] = [];
    const script = replay(function* script() {
      log.push("hello");
      yield 1;
      log.push("world");
      yield 2;
      log.push("goodbye");
      yield 3;
    });

    const a = script();
    const b = script();
    a.next();
    b.next();
    expect(log).toMatchInlineSnapshot(`
      Array [
        "hello",
      ]
    `);
    a.next();
    b.next();
    expect(log).toMatchInlineSnapshot(`
      Array [
        "hello",
        "world",
      ]
    `);
    a.next();
    a.next();
    b.next();
    b.next();
    expect(log).toMatchInlineSnapshot(`
      Array [
        "hello",
        "world",
        "goodbye",
      ]
    `);
  });
});
