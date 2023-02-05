import type { TrackInfo, AlbumInfo, ArtistInfo } from "@amadeus-music/protocol";
import type { PaginationOptions } from "../data/pagination";
import type { Controls } from "../data/aggregate";
import type { BaseConfig } from "../data/config";
import { pools, type Pool } from "libfun";

const all = pools({ group: "core" });
const { pool } = all;

// Internal events
const log = pool<(text: string) => void>("log");
const aggregate = pool<
  (
    from: Pool<any, any>,
    args: any[],
    options: PaginationOptions<any>
  ) => Partial<Controls>
>("aggregate", {
  timeout: 1000 * 60 * 60,
});

// Plugin events
const init = pool<(config: BaseConfig) => void>("init");
const stop = pool("stop");

// Aggregator events
const search = pool<
  | ((type: "track", query: string) => TrackInfo)
  | ((type: "album", query: string) => AlbumInfo)
  | ((type: "artist", query: string) => ArtistInfo)
>("search");
const desource = pool<(sources: string[]) => string>("desource");
/// TODO:
//  Provider
//    - relate
//    - recognize
//  Preserver
//    - retrieve
//    - save
//    - modify
//    - delete
//  ???
//    - follow
//    - unfollow

export { log, init, stop, search, desource, aggregate };
export { all as pools, pool };
