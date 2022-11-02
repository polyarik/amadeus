import type {
  Extensions,
  Unwrapped,
  Transform,
  Wrappable,
  Promised,
  Thenable,
  Identity,
  Resolve,
  Wrapper,
  Wrapped,
  Reject,
  Monad,
  All,
} from "./monad.types";

const error = Symbol();
const state = Symbol();

function monad<F extends Transform = Identity>(
  transformer: Wrapper<F> = (value, fn) => fn(value),
  extensions: Extensions<F> = {}
) {
  const proto: Monad<unknown, [F]> = {
    then(resolve, reject): any {
      if (native(reject) && native(resolve)) {
        try {
          resolve(this.unwrap());
        } catch (message) {
          reject(message);
        }
        return create(this[state]);
      }

      return create(transform(this[state], resolve, reject, transformer));
    },
    catch(reject): any {
      return this.then((x) => x, reject);
    },
    unwrap(fallback) {
      return unwrap(this[state], fallback);
    },
    expose(): any {
      try {
        const data = unwrap(this[state]);
        if (thenable(data)) {
          return data.then(
            (x) => ({ data: x }),
            (e) => ({ error: errorify(e)[error] })
          );
        }
        return { data };
      } catch (reason) {
        return { error: errorify(reason)[error] };
      }
    },
    get [Symbol.toStringTag]() {
      return "Monad";
    },
  };

  const create = <T>(value: T): Monad<T, [F]> => {
    if (value && Object.getPrototypeOf(value) === extensions) {
      return value as any;
    }
    const instance = { [state]: value };
    return Object.setPrototypeOf(instance, extensions);
  };

  Object.setPrototypeOf(extensions, proto);
  return <T extends F["accept"]>(value: T) => create(value).then((x) => x);
}

function all<T extends readonly any[]>(values: T) {
  let container = monad()([] as any);
  let buffer: any[] = [];
  for (const value of values) {
    if (!thenable(value)) {
      buffer.push(value);
      continue;
    }

    const current = [...buffer];
    container = container.then((x) => value.then((y) => [...x, ...current, y]));
    buffer = [];
  }

  return container.then((x) => [...x, ...buffer]) as All<T>;
}

function unwrap<T, U = never, F extends Transform[] = [Identity]>(
  value: Monad<T, F> | Thenable<T> | T,
  fallback?: U
): Unwrapped<F, T> | Promised<F, U> {
  if (unwrappable(value)) value = value.unwrap(fallback) as any;
  if (thenable(value)) {
    value = value.then(
      (x) => unwrap(x, fallback) as any,
      (e) => {
        if (fallback !== undefined) return fallback;
        throw e;
      }
    ) as any;
  }

  if (invalid(value)) {
    if (fallback === undefined) throw value[error];
    return fallback as any;
  }
  return value as any;
}

function transform<T, F extends Transform = Identity>(
  value: T,
  resolve?: Resolve<T>,
  reject?: Reject,
  transformer: Wrapper<F> = (value, fn) => fn(value)
) {
  return apply(
    (value) => {
      if (invalid(value)) throw value[error];
      return resolve ? transformer(value, resolve as any) : value;
    },
    (reason) => {
      try {
        return reject ? transformer(reason, reject) : errorify(reason);
      } catch (reason) {
        return errorify(reason);
      }
    }
  )(value);
}

function apply<T, U, F extends Transform>(
  resolve: Resolve<Wrapped<[F], T>, U>,
  reject: Reject
) {
  return function next(value: any): any {
    if (thenable(value)) return value.then(next, reject);
    try {
      return resolve ? resolve(value) : value;
    } catch (reason) {
      return reject ? reject(reason) : reason;
    }
  };
}

function thenable<T = unknown>(value: any): value is Thenable<T> {
  return (
    value != null &&
    typeof value === "object" &&
    "then" in value &&
    typeof value["then"] === "function"
  );
}

function unwrappable<T = unknown>(value: any): value is Wrappable<T> {
  return (
    value != null &&
    typeof value === "object" &&
    "unwrap" in value &&
    typeof value["unwrap"] === "function"
  );
}

function invalid(value: any): value is { [error]: any } {
  return value != null && typeof value === "object" && error in value;
}

function native(fn: any, args = 1): fn is (...args: any[]) => void {
  if (typeof fn !== "function") return false;
  const signature = Function.prototype.toString.call(fn);
  return (
    signature === "function () { [native code] }" &&
    fn.length === args &&
    fn.name === ""
  );
}

function errorify(what: any): { [error]: Error } {
  if (invalid(what)) what = what[error];
  return { [error]: what instanceof Error ? what : new Error(what) };
}

export { monad, all, unwrap, transform, state };
export type { Transform as Monad };
