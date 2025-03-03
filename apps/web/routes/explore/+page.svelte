<script lang="ts">
  import {
    Button,
    Portal,
    Header,
    Topbar,
    Group,
    Input,
    Panel,
    Icon,
    When,
  } from "@amadeus-music/ui";
  import { albums, artists, history, search as query, tracks } from "$lib/data";
  import type { Artist, Album, Track } from "@amadeus-music/protocol";
  import { debounce } from "@amadeus-music/util/async";
  import { navigating, page } from "$app/stores";
  import { search, streams } from "$lib/trpc";
  import { multistream } from "$lib/stream";
  import Overview from "./overview.svelte";
  import History from "./history.svelte";
  import Tracks from "./tracks.svelte";

  let type = 0;

  const types = ["tracks", "artists", "albums"] as const;
  const log = debounce((x: string) => history.log(x), 2000);
  const estimate = ~~((globalThis.innerHeight / 56) * 2.5);
  const remote = multistream(
    { tracks: search.tracks, artists: search.artists, albums: search.albums },
    streams.next,
    types[type]
  );

  $: navigate($page.url.hash.slice(1));
  $: if (!$navigating) {
    globalThis.history?.replaceState(null, "", `#${types[type]}/${$query}`);
  }

  $: remote.choose(types[type]);
  $: remote.update($query ? { query: $query, page: estimate } : null);

  let localTracks: Track[] = [];
  let localAlbums: Album[] = [];
  let localArtists: Artist[] = [];
  $: tracks.search($query).then((x) => (localTracks = x));
  $: albums.search($query).then((x) => (localAlbums = x));
  $: artists.search($query).then((x) => (localArtists = x));

  $: log($query);

  function navigate(hash: string) {
    const parts = decodeURIComponent(hash).split("/");
    if (parts.length < 2) return;
    type = types.indexOf(parts[0] as (typeof types)[number]);
    if (!~type) type = 0;
    if ($query !== parts[1]) $query = parts[1];
  }
</script>

<Topbar title="Explore">
  <Header xl indent>Explore</Header>
</Topbar>

{#if $query}
  {#if $remote.type === "tracks"}
    <Tracks remote={$remote.data} local={localTracks} on:end={remote.next} />
  {:else if $remote.type === "artists"}
    <Overview
      style="artist"
      remote={$remote.data}
      local={localArtists}
      on:end={remote.next}
    />
  {:else if $remote.type === "albums"}
    <Overview
      style="album"
      remote={$remote.data}
      local={localAlbums}
      on:end={remote.next}
    />
  {/if}
{:else}
  <History type={types[type]} />
{/if}

<Portal to="bottom">
  <Panel>
    <When not sm>
      <Input bind:value={$query} stretch resettable placeholder="Search">
        <Icon name="search" />
      </Input>
    </When>
    <Group size={3} stretch bind:value={type}>
      <Button id="tracks">Tracks</Button>
      <Button id="artists">Artists</Button>
      <Button id="albums">Albums</Button>
    </Group>
  </Panel>
</Portal>

<svelte:head>
  <title>{$query || "Explore"} - Amadeus</title>
</svelte:head>
