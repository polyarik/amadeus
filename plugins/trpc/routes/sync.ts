import { any, array, number, object, string } from "superstruct";
import { observable } from "@trpc/server/observable";
import { info, procedure, router } from "../plugin";

export const sync = router({
  push: procedure.input(array(any())).mutation(async ({ input, ctx }) => {
    return ctx.persistence().merge(input).then();
  }),
  pull: procedure
    .input(object({ version: number(), client: string() }))
    .subscription(({ input, ctx }) =>
      observable<unknown>(({ next }) => {
        info(`${ctx.name} subscribed to database changes.`);
        const promise = ctx.persistence().subscribe(["*"], next, input).then();
        return async () => {
          info(`${ctx.name} unsubscribed from database changes.`);
          (await promise)();
        };
      })
    ),
});
