import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { clerkClient } from "@clerk/nextjs/server";

export const userRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const clerk_id = ctx.auth.userId;
    const does_exist = await ctx.db.user.findUnique({
      where: { clerk_id },
    });
    if (does_exist) {
      throw new Error("User already exists");
    }
    const clerkUser = await clerkClient.users.getUser(clerk_id);
    // eslint-disable-next-line no-var
    var newDbUser;
    try {
      newDbUser = await ctx.db.$transaction(
        async (db) => {
          const user = await db.user.create({
            data: {
              clerk_id,
              name: clerkUser.fullName ?? "",
              api_key: "",
              email: clerkUser.primaryEmailAddress?.emailAddress,
            },
          });
          await clerkClient.users.updateUser(clerk_id, {
            externalId: user.uuid,
          });

          return { ...user };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (e) {
      //There's an issue with this in that it says that the clerk_id already exists when doing db.user.create.
      //Its weird because if you try to read the user from the db, it doesn't exist.
      newDbUser = {};
      console.error("Caught error: ", e);
    }

    return newDbUser;
  }),
  get: protectedProcedure.query(async ({ ctx }) => {
    const clerk_id = ctx.auth.userId;
    const user = await ctx.db.user.findUnique({
      where: { clerk_id },
    });
    return user;
  }),
});
