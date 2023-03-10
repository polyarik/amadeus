import {
  assign,
  boolean,
  Infer,
  integer,
  nullable,
  number,
  object,
  string,
} from "superstruct";
import {
  album,
  artist,
  playlist,
  track,
  unique,
} from "@amadeus-music/protocol";
import { primary, crr, ordered, index, type Database } from "crstore";

const id = integer;

const tracks = assign(unique(track), object({ album: id() }));
crr(tracks);
index(tracks, "album");
primary(tracks, "id");

const albums = unique(album);
crr(albums);
primary(albums, "id");

const artists = unique(artist);
crr(artists);
primary(artists, "id");

const attribution = object({
  track: id(),
  artist: id(),
});
crr(attribution);
index(attribution, "artist");
primary(attribution, "track", "artist");

const playlists = assign(unique(playlist), object({ order: string() }));
crr(playlists);
primary(playlists, "id");
ordered(playlists, "order");
index(playlists, "order", "id");

const library = object({
  id: id(),
  playlist: id(),
  track: id(),
  date: integer(),
  order: string(),
});
crr(library);
primary(library, "id");
index(library, "track");
index(library, "playlist");
index(library, "order", "id");
ordered(library, "order", "playlist");

const feed = object({
  id: id(),
  type: number(),
  track: id(),
});
crr(feed);
primary(feed, "id");
index(feed, "type");

const playback = object({
  id: id(),
  track: id(),
  device: string(),
  progress: number(),
  order: string(),
  hidden: boolean(),
});
crr(playback);
primary(playback, "id");
index(playback, "device");
index(playback, "order", "id");
ordered(playback, "order", "device");

const following = object({
  artist: id(),
  seen: nullable(id()),
});
crr(following);
primary(following, "artist", "seen");

const settings = object({
  key: string(),
  value: string(),
});
crr(settings);
index(settings, "value");
primary(settings, "key");

const history = object({
  query: string(),
  date: integer(),
});
index(history, "date");
primary(history, "query");

export type DB = Database<Infer<typeof schema>>;
export const schema = object({
  tracks,
  albums,
  attribution,
  artists,
  library,
  feed,
  playlists,
  playback,
  following,
  settings,
  history,
});
