import {
  editMessageCaption,
  sendChatAction,
  sendMessage,
  sendAudio,
} from "./methods";
import { async, first, map, Pool, take } from "@amadeus-music/core";
import { desource, info, persistence, pool } from "../plugin";
import type { TrackDetails } from "@amadeus-music/protocol";
import { bright, reset } from "@amadeus-music/util/color";
import { Message, Queue, Replier } from "../types/reply";
import { pretty } from "@amadeus-music/util/object";
import { format } from "@amadeus-music/protocol";
import { menu, markdown } from "./markup";
import { sendPage } from "./pages";

function notifier(chat: number) {
  return () => sendChatAction(chat, "upload_voice").catch(() => {});
}

function paramify(params: Record<string, any>) {
  const map: Record<string, string> = {
    mode: "parse_mode",
    to: "reply_to_message_id",
    markup: "reply_markup",
  };
  const mapped: Record<string, any> = {};
  for (const key in params) {
    if (key in params && params[key] !== undefined) {
      mapped[map[key] || key] = params[key];
    }
  }
  return mapped;
}

function* queue(
  this: { signal: AbortSignal },
  pool: Pool<Replier, any>,
  notifier: () => void,
  name: string,
  tracks: TrackDetails[]
) {
  let done = false;
  const ping = (notifier(), setInterval(notifier, 3000));
  this.signal.addEventListener("abort", () => clearInterval(ping));
  const promises: Promise<any>[] = [];
  for (const track of tracks) {
    const url = yield* async(first(desource(track.source)));
    info(`Sending "${format(track)}" to ${bright}${name}${reset}...`);
    promises.push(
      take(
        pool({
          audio: url,
          title: track.title,
          thumb: JSON.parse(track.album.art)?.[0],
          performer: track.artists.map((x: any) => x.title).join(", "),
          markup: menu(track.id),
          mode: markdown(),
        })
      ).then((x) => (setTimeout(() => done || notifier(), 10), x))
    );
  }
  yield* yield* async(
    Promise.allSettled(promises).then((x) =>
      x.map((x) => (x.status === "rejected" ? 0 : +x.value))
    )
  );
  done = true;
}

function* reply(chat: number, params: Message) {
  const { result } = yield* "audio" in params
    ? sendAudio(chat, params)
    : "page" in params
    ? sendPage(chat, params)
    : sendMessage(chat, params);

  yield result.message_id;
}

function replier(chat: number, name: string, group = true) {
  const target = pool<Replier>(`upload/${chat}`, {
    rate: group ? 20 : 60,
    concurrency: 3,
  });
  if (!target.status().listeners.size) target(reply.bind(null, chat));

  return function* (message: Message | TrackDetails[]) {
    let ids: number[] = [];
    if (Array.isArray(message)) {
      const send = pool<Queue>(`queue/${chat}`, { concurrency: 1 });
      if (!send.status().listeners.size) {
        send(function (tracks: TrackDetails[]) {
          return queue.bind(this)(target, notifier(chat), name, tracks);
        });
      }

      yield* async(persistence().push(message));
      return yield* map(send(message), function* (x) {
        return x;
      });
    }

    ids = yield* map(target(message), function* (x) {
      return x;
    });
    if (!ids.length) {
      throw new Error(`Failed to send message: ${pretty(message)}`);
    }
    return ids;
  };
}

function editor(chat: number) {
  return function* (message: number, params: Message) {
    yield* editMessageCaption(chat, message, params);
  };
}

export { replier, editor, paramify };
