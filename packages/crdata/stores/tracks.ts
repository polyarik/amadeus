import type { Album, Track, TrackBase } from "@amadeus-music/protocol";
import { resource, track, album, artist } from "../operations/cte";
import { sanitize } from "../operations/utils";
import type { DB } from "../data/schema";

export const tracks = ({ store }: DB) =>
  store(
    (db) =>
      db
        .with("resource", resource)
        .with("artist", artist)
        .with("album", album)
        .with("track", track)
        .selectFrom("library")
        .leftJoin("track", "track.id", "library.track")
        .select([
          "track.id",
          "track.title",
          "track.duration",
          "track.album",
          "track.artists",
          "track.sources",
          "library.id as entry",
          "library.date",
        ])
        .orderBy("library.date", "desc")
        .orderBy("library.id")
        .$castTo<Track & { entry: number; date: number }>(),
    {
      async edit(db, id: number, track: Partial<TrackBase & { album: Album }>) {
        const result = await db
          .updateTable("tracks")
          .where("id", "=", id)
          .set({ ...track, album: undefined })
          .returning("album")
          .executeTakeFirst();
        if (result?.album && track.album) {
          await db
            .updateTable("albums")
            .where("id", "=", result.album)
            .set(track.album)
            .execute();
        }
      },
      async search(db, query: string) {
        if (!query) return [];
        return db
          .with("resource", resource)
          .with("artist", artist)
          .with("album", album)
          .with("track", track)
          .selectFrom("tracks_fts" as any)
          .where("tracks_fts", "match", sanitize(query))
          .orderBy("rank")
          .innerJoin("track", "track.id", "rowid")
          .selectAll()
          .$castTo<Track>()
          .execute();
      },
      get(db, id: number) {
        return db
          .with("resource", resource)
          .with("artist", artist)
          .with("album", album)
          .with("track", track)
          .selectFrom("track")
          .selectAll()
          .where("id", "=", id)
          .$castTo<Track>()
          .executeTakeFirstOrThrow();
      },
    }
  );
