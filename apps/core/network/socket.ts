import { WebSocket, createWebSocketStream, type RawData } from "ws";
import { merge, pick } from "@amadeus-music/util/object";
import type { Context } from "../plugin/types";
import type { Struct } from "superstruct";
import { async, context } from "libfun";
import { pools } from "../event/pool";
import { Writable } from "stream";
import { promisify } from "util";

type ConnectOptions = {
  baseURL?: string | string[];
};

function connect(this: Context, url = "", options: ConnectOptions = {}) {
  const group = this?.group || context.group;
  const ctx: any = group ? pools.contexts.get(group) || {} : {};
  if (typeof ctx.fetch === "object") options = merge(ctx.connect, options);

  const target = new URL(url, pick(options.baseURL));
  const socket = new WebSocket(target);
  const connected = promisify(socket.on.bind(socket))("open");

  return {
    socket,
    *send(data: Buffer | Record<string, any> | ReadableStream | string) {
      yield* async(connected);
      if (
        typeof data === "object" &&
        !(data instanceof Buffer) &&
        !(data instanceof ReadableStream)
      ) {
        data = JSON.stringify(data);
      }

      yield* async(
        new Promise<void>((resolve, reject) => {
          if (data instanceof ReadableStream) {
            const stream = Writable.toWeb(createWebSocketStream(socket));
            data.pipeTo(stream, { preventClose: true }).then(resolve, reject);
          } else {
            socket.send(data as any, (err) => (err ? reject(err) : resolve()));
          }
        })
      );
    },
    *recv<T = void, S = never>(as?: Struct<T, S>, until?: Struct<any, any>) {
      yield* async(connected);
      return yield* async(
        new Promise<T extends void ? RawData : T>((resolve, reject) => {
          if (!as) {
            socket.once("message", (data) => {
              try {
                resolve(data as any);
              } catch (err) {
                reject(err);
              }
            });
          } else {
            socket.on("message", function handler(data) {
              try {
                const parsed = JSON.parse(data.toString());
                if (as.is(parsed)) {
                  socket.off("message", handler);
                  resolve(parsed as any);
                }
                if (until?.is(parsed)) {
                  new Error("Until condition is reached!", { cause: parsed });
                }
              } catch (err) {
                socket.off("message", handler);
                reject(err);
              }
            });
          }
        })
      );
    },
    *close() {
      socket.close();
      yield* async(promisify(socket.on.bind(socket))("close").catch(() => {}));
    },
  };
}

export type { ConnectOptions };
export { connect };