/** True when Clerk env is set (middleware + auth pages rely on this). */
export function isClerkConfigured() {
  const pub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sec = process.env.CLERK_SECRET_KEY;
  return (
    typeof pub === "string" &&
    pub.trim().length > 0 &&
    typeof sec === "string" &&
    sec.trim().length > 0
  );
}
