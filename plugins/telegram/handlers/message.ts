import { message, search, voice, info, post, persistence } from "../plugin";
import { bright, reset } from "@amadeus-music/util/color";
import { async, match } from "@amadeus-music/core";
import { paginate } from "../api/reply";
import { icon } from "../api/markup";

message(function* (text) {
  info(`${bright}${this.name}${reset} is searching for "${text}"...`);
  yield* async(persistence(this.user).log(text));

  const [message] = yield* this.reply({ text: icon.load });
  paginate([search, ["track", text]], {
    header: text,
    icon: icon.search,
    compare: match(text),
    chat: this.chat,
    message,
  });
});

voice((file) => {
  info("voice", file);
});

post((file, chat) => {
  info("post", file, chat);
});
