import recall, { report } from "..";

describe("recall", () => {
  it("caches success", () => {
    let calls = 0;
    const hi = recall(() => {
      ++calls;
      return {};
    });
    expect(hi()).toBe(hi());
    expect(calls).toBe(1);
  });

  it("caches failures", () => {
    let calls = 0;
    const eeek = recall(() => {
      ++calls;
      throw new Error("well that was expected");
    });
    expect(eeek).toThrowError("well that was expected");
    expect(eeek).toThrowError("well that was expected");
    expect(calls).toBe(1);
  });

  it("collects multiple errors with report", () => {
    const anAttempt = recall(() => {
      report(new Error("already going badly"));
      report(new Error("we can still try"));
      report(new Error("to go on"));
      return "and we made it";
    });
    expect(anAttempt).not.toThrow();
    expect(anAttempt.getResult()).toMatchInlineSnapshot(`
      Object {
        "data": "and we made it",
        "errors": Array [
          [Error: already going badly],
          [Error: we can still try],
          [Error: to go on],
        ],
        "exit": "return",
      }
    `);
  });

  it('caches results based on the arguments', () => {
    const a = 'a'
    const b = 'b'
    const c = 'c'
    let calls = 0
    const join = recall((...args: any[]) => {
      ++calls
      return args.join(', ')
    })
    expect(join(a, b, c)).toBe('a, b, c')
    expect(join(a, b, c)).toBe('a, b, c')
    expect(join(b, a, c)).toBe('b, a, c')
    expect(join(a, c, a, b)).toBe('a, c, a, b')
    expect(join(a, c, a, b)).toBe('a, c, a, b')
    expect(calls).toBe(3)
  })

  it('caches results based on argument identity', () => {
    const getStatus = recall(world => world.status)
    const world = { status: 'good' }
    expect(getStatus(world)).toBe('good')
    world.status = 'bad'
    // we're still living in the past
    expect(getStatus(world)).toBe('good')
  })

  it('is itself recalled', () => {
    const fn = () => {}
    expect(recall(fn)).toBe(recall(fn))
  })
});