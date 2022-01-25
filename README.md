# recall

`recall` takes a function and returns a memoized version:

```typescript
import recall from '@protoplasm/recall'

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

## `report`ing errors and messages

`recall`ed functions can call `report` to report messages. messages can be anything.

to get the full report log, call `getResult` on a `recall`'d function:

```typescript
import recall, {report} from '@protoplasm/recall'

const anAttempt = recall(() => {
  report("trying stuff...");
  report(new Error("oh no"));
  report(new Error("some problems happened"));
  return "but we made it";
})
expect(anAttempt).not.toThrow()
expect([...anAttempt.getResult().errors()])
```

`getResult` will always return a `Result`, calling the underlying function to compute it if necessary. if the underlying function throws, the result will not have `data` and will have `exit: "throw"`.

### parent calls contain their child's logs

when one `recall`'d function calls another, messages from the child's log
show up in the parent:

```typescript
const parent = recall(() => child())
const child = recall(() => report('waaaaahhhh!'))
expect([...parent.getResult().log])
  .toEqual(['waaaaahhhh!'])
```

### ...unless they use `getResult` to swallow it

the above is not true if the parent calls the child with `.getResult`—like a `try`/`catch`,
`getResult` swallows the log into the returned result:

```typescript
const parent = recall(() => child.getResult());
const child = recall(() => report("waaaaahhhh!"));
expect([...parent.getResult().log]).toEqual([]);
```

the parent can get the log-joining behavior back by calling `report` on the `result.log`:

```typescript
const parent = recall(() => {
  const result = child.getResult()
  report(result.log)
})
const child = recall(() => report("waaaaahhhh!"));
expect([...parent.getResult().log]).toEqual(["waaaaahhhh!"]);
```

(this will deeply report all descendant logs)

## soft querying the cache

`getExisting` functions just like `getResult`, only it will return `undefined` rather than calling the underlying if no entry for the arguments exists in the cache.

## recipes

### `recall` memoizes pure functions

the simplest case:

```typescript
const sum = recall((ary: number[]) => ary.reduce((a, b) => a + b))
const a = [1, 2, 3, 4]
sum(a)
sum(a) // cache hit
```

### `recall` composite keys

you can use `recall` as a composite key map:

```typescript
const song = recall((artist: string, title: string) => new Song(artist, title))
const coversOf = recall((song: Song) => [])
coversOf(song("Cher", "Believe")).push(song("Okay Kaya", "Believe"))
coversOf(song("Cher", "Believe")).find(song("Okay Kaya", "Believe"))
```

### `recall` a cache

recall can accept async functions. it simply caches the promise result:

```typescript
const textOf = recall(async (url: string) => await (await fetch(url)).response.text)
const result = await textOf("https://...)
```