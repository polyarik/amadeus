import {
  identify,
  merge,
  uniquify,
  type Uniqueified,
} from "@amadeus-music/protocol";
import { debounce, lock } from "@amadeus-music/util/throttle";
import { combine } from "@amadeus-music/util/object";

function page<T extends Record<string, any>>(
  number: number,
  groups: string[],
  completed: Set<number>,
  options: PaginationOptions<T>
) {
  const { wait, resolve } = lock();
  const progress = groups.map(() => new Set());
  const map = new Map<number, T>();
  const convert = uniquify as any;
  const size = options.page;
  const items: T[] = [];

  const params = { compare: options.compare, map, identify, convert, merge };

  return {
    number,
    append(id: number, batch: T[]) {
      if (this.satisfied(id)) {
        return progress.map((_, i) => (i === id ? batch : []));
      }

      batch.forEach((x) => progress[id].add(identify(x)));
      combine(items, batch, params);
      if (this.progress >= 1) resolve();
      const overshoot = items.splice(size);
      return progress.map((x) => overshoot.filter((y) => x.has(identify(y))));
    },
    satisfied(id: number) {
      return progress[id].size >= size || completed.has(id);
    },
    get items() {
      return items as Uniqueified<T>[];
    },
    get progress() {
      const part = 1 / progress.length;
      return progress.reduce(
        (acc, x, id) =>
          acc + (this.satisfied(id) ? part : part * (x.size / size)),
        0
      );
    },
    get loaded() {
      if (this.progress >= 1) return Promise.resolve();
      return wait();
    },
  };
}

function pages<T extends Record<string, any>>(
  groups: string[],
  options: PaginationOptions<T>
) {
  const completed = new Set<number>();
  const pages = [page(0, groups, completed, options)];
  let selected = 0;

  const { resolve, wait } = lock();
  const create = (number: number) => page(number, groups, completed, options);
  const last = () => pages.findIndex((x) => x.progress < 1);
  const updater = lock();
  const refresh = debounce(updater.resolve, 1);
  let active = true;

  return {
    async append(id: number, batch: T[], number = last()) {
      if (!batch.length) return;
      if (!pages[number]) pages[number] = create(number);
      pages[number].append(id, batch).forEach((batch, id) => {
        this.append(id, batch, number + 1);
      });

      if (number === selected) refresh();
      while (pages[selected].satisfied(id)) await wait();
    },
    next() {
      if (pages[selected].progress < 1) return false;
      if (
        completed.size >= groups.length &&
        !pages[selected + 1]?.items.length
      ) {
        return false;
      }
      selected++;
      if (!pages[selected]) pages[selected] = create(selected);
      else refresh();
      if (pages[selected].progress < 1) resolve();
      return true;
    },
    prev() {
      if (selected <= 0) return false;
      selected--;
      if (!pages[selected]) pages[selected] = create(selected);
      refresh();
      if (pages[selected].progress < 1) resolve();
      return true;
    },
    close() {
      if (!active) return;
      active = false;
      refresh();
      options.controller?.abort();
    },
    complete(id: number) {
      const changed = !pages[selected].satisfied(id);
      completed.add(id);
      if (changed) refresh();
    },
    get pages() {
      return pages;
    },
    get current() {
      return pages[selected];
    },
    async *values() {
      while (active) {
        if (selected || pages[selected].progress) {
          yield {
            ...pages[selected],
            ...this,
          } as Page<T>;
        }
        await updater.wait();
      }
    },
  };
}

type PaginationOptions<T> = {
  compare?: (a: T, b: T) => number;
  controller?: AbortController;
  page: number;
};

type Page<T> = {
  pages: ReturnType<typeof page>[];
  items: Uniqueified<T>[];
  loaded: Promise<void>;
  progress: number;
  number: number;

  next(): boolean;
  prev(): boolean;
  close(): void;
};

export { pages, type Page };
