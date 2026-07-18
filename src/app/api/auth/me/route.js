import { withRoute } from "@/lib/api";

export const GET = withRoute({}, async ({ user }) => {
  return {
    user,
  };
});
