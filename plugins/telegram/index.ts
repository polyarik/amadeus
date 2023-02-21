import { bright, reset } from "@amadeus-music/util/color";
import { init, stop, info, fetch } from "./plugin";
import { secret, request } from "./api/update";
import { http } from "@amadeus-music/core";
import { icon } from "./api/markup";
import { me } from "./types/core";

init(function* ({ telegram: { token, webhook } }) {
  if (!token) throw "Please set a bot token!";
  this.fetch.baseURL = `https://api.telegram.org/bot${token}/`;
  if (!webhook) throw "Please set a webhook URL!";
  const url = new URL("/telegram", webhook);
  info("Setting up a webhook...");
  yield* fetch("setWebhook", {
    params: { url: url.toString(), secret_token: secret },
  }).text();
  info("Adjusting bot settings...");
  yield* fetch("setMyCommands", {
    params: { commands: JSON.stringify(commands) },
  }).text();

  this.state.me = (yield* fetch("getMe").as(me)).result;
  info(`Logged in as ${bright}@${this.state.me.username}${reset}!`);

  http().on("request", request);
});

stop(() => {
  http(false).off("request", request);
});

const commands = [
  {
    command: "cancel",
    description: `${icon.cancel} Stop pending uploads`,
  },
  {
    command: "history",
    description: `${icon.history} Show search history`,
  },
];

import.meta.glob("./handlers/*", { eager: true });
