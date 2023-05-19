import { Album, Artist, Track, identify } from "@amadeus-music/protocol";
import { afterAll, it } from "vitest";
import { connect } from "../data";
import { rm } from "fs/promises";
import { expect } from "vitest";

const { close, playlists, artists, library, tracks, albums } = connect({
  name: "library.test.db",
});

const makeArtist = (id: number): Artist => ({
  id: id,
  title: "artist" + id.toString(),
  sources: [id + "_0", id + "_1"],
  arts: [id + "_secondary", id + "_primary"],
  thumbnails: [null, id + "_primary"],
});

const makeAlbum = (id: number): Album => ({
  artists: [makeArtist(id), makeArtist(id + 50)],
  id: (id += 100),
  title: "album" + id.toString(),
  year: 2042,
  sources: [id + "_0", id + "_1"],
  arts: [id + "_secondary", id + "_primary"],
  thumbnails: [null, id + "_primary"],
});

const makeTrack = (id: number): Track => ({
  album: makeAlbum(id),
  artists: [makeArtist(id)],
  id: (id += 200),
  title: "track" + id.toString(),
  duration: 42 + id,
  sources: [id + "_0", id + "_1"],
});

it("pushes artists", async () => {
  expect(await artists).toHaveLength(0);
  await artists.push([makeArtist(0)]);
  expect(await artists).toHaveLength(1);
  expect((await artists)[0]).toMatchObject({
    ...makeArtist(0),
    arts: ["0_primary", "0_secondary"],
    thumbnails: ["0_primary", null],
    collection: { size: 0, duration: 0, tracks: [] },
  });
  await library.push([makeTrack(1), makeTrack(2)]);
  const results = await artists;
  expect(results).toHaveLength(3);
  expect(results[0]).toMatchObject({
    ...makeArtist(1),
    arts: ["1_primary", "1_secondary"],
    thumbnails: ["1_primary", null],
    collection: { size: 1, duration: 243, tracks: [expect.anything()] },
  });
  expect(results[1]).toMatchObject({
    ...makeArtist(2),
    arts: ["2_primary", "2_secondary"],
    thumbnails: ["2_primary", null],
    collection: { size: 1, duration: 244, tracks: [expect.anything()] },
  });
  expect(results[2]).toMatchObject({
    ...makeArtist(0),
    arts: ["0_primary", "0_secondary"],
    thumbnails: ["0_primary", null],
    collection: { size: 0, duration: 0, tracks: [] },
  });
  expect((await artists.search("ist2"))[0]).toMatchObject({
    ...makeArtist(2),
    arts: ["2_primary", "2_secondary"],
    thumbnails: ["2_primary", null],
  });
  expect(await artists.get(2)).toMatchObject({
    ...makeArtist(2),
    arts: ["2_primary", "2_secondary"],
    thumbnails: ["2_primary", null],
  });
});

it("pushes albums", async () => {
  expect(await albums).toHaveLength(2);
  await albums.push([makeAlbum(3)]);
  const results = await albums;
  expect(results[0]).toMatchObject({
    ...makeAlbum(1),
    arts: ["101_primary", "101_secondary"],
    thumbnails: ["101_primary", null],
    artists: [expect.anything()],
  });
  expect(results[1]).toMatchObject({
    ...makeAlbum(2),
    arts: ["102_primary", "102_secondary"],
    thumbnails: ["102_primary", null],
    artists: [expect.anything()],
  });
  expect(results[2]).toMatchObject({
    ...makeAlbum(3),
    arts: ["103_primary", "103_secondary"],
    thumbnails: ["103_primary", null],
    artists: [
      {
        ...makeArtist(3),
        arts: ["3_primary", "3_secondary"],
        thumbnails: ["3_primary", null],
      },
      {
        ...makeArtist(53),
        arts: ["53_primary", "53_secondary"],
        thumbnails: ["53_primary", null],
      },
    ],
  });
  expect(await albums.search("103")).toEqual([results[2]]);
  expect(await albums.get(103)).toEqual(results[2]);
});

it("pushes tracks", async () => {
  const t0 = makeTrack(0);
  await playlists.create({ title: "Test" });
  await library.push([t0], identify("Test"));
  expect(await library).toHaveLength(1);
  expect(await tracks.get(0)).toEqual(t0);
  expect(await playlists).toMatchObject([
    {
      id: identify("Test"),
      title: "Test",
      tracks: [t0],
    },
  ]);
  expect(await artists).toMatchObject([t0.artists[0]]);
});

it("deletes tracks", async () => {
  await library.push([makeTrack(1)], identify("Test"));
  const [{ tracks }] = await playlists;
  expect(tracks).toHaveLength(2);
  expect(await library).toHaveLength(2);
  await library.purge([tracks[0].entry]);
  expect(await library).toHaveLength(1);
  expect(await playlists).toHaveLength(1);
  expect((await playlists)[0].tracks).toHaveLength(1);
  expect(await artists).toHaveLength(1);
  await library.purge([tracks[1].entry]);
  expect(await library).toHaveLength(0);
  expect(await playlists).toHaveLength(1);
  expect((await playlists)[0].tracks).toHaveLength(0);
  expect(await artists).toHaveLength(0);
});

afterAll(async () => {
  close();
  await rm("./library.test.db");
});
