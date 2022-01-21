# recall

`recall` takes a function and returns a memoized version:

```typescript
import recall from '@queerviolet/recall'

let calls = 0;
const hi = recall(() => {
  ++calls
  return { hello: 'world' }
})

expect(hi()).toBe(hi())
expect(calls).toBe(1)
```

`recall`ed functions cache both normal and exceptional return paths. if the underlying function throws the first time it's called for a set of arguments, it will always throw the same error when invoked again.

arguments are shallowly compared by `===`. there is no way to change this.

## multiple errors

`recall`ed functions can report errors while also returning data. these errors can be obtained with `getResult`:

```typescript
import recall, {report} from '@queerviolet/recall'

const anAttempt = recall(() => {
  report(new Error("already going badly"));
  report(new Error("we can still try"));
  report(new Error("to go on"));
  return "and we made it";
})
expect(anAttempt).not.toThrow()
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
`)
```

`getResult` will always return a `Result`, calling the underlying function to compute it if necessary. if the underlying function throws, the result will not have `data` and will have `exit: "throw"`.

## soft querying the cache

`getExisting` functions just like `getResult`, only it will return `undefined` rather than calling the underlying if no entry for the arguments exists in the cache.