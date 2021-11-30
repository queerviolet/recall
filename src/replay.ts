import recall from './recall'

type ResultOf<I extends Iterator<any>> = I extends Iterator<infer T, infer R> ? IteratorResult<T, R> : never

export const replay = recall(
  function replay<F extends (...args: any) => Iterator<any, any, undefined>>(fn: F): F {
    const f = recall(fn)
    const record = recall(<I extends Iterator<any>>(_iter: I) => [] as ResultOf<I>[])

    return call as any as F

    function call(this: ThisParameterType<F>, ...args: Parameters<F>): ReturnType<F> {
      type T = ResultOf<ReturnType<F>>

      const underlying = f.apply(this, args)
      const log = record(underlying)
      let index = 0
      let done: IteratorReturnResult<T> | null = null
      const iter: ReturnType<F> = {
        next(): IteratorResult<T> {
          if (done) return done
          if (index < log.length) return checkDone(log[index++])
          const item = underlying.next()
          log.push(item)
          ++index
          return checkDone(item)
        },

        [Symbol.iterator]() { return this }
      } as ReturnType<F>

      return iter

      function checkDone(result: IteratorResult<T>) {
        if (result.done) done = result
        return result
      }
    }
  }
)

export default replay
