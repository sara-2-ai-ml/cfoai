import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6 text-white">
      <p className="mb-2 text-sm tracking-[0.2em] text-[#8B5CF6]">CFOai</p>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-3 max-w-md text-center text-sm text-white/60">
        Use Clerk to access the dashboard. Create an account if you don&apos;t have one yet.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/sign-in">
          <Button size="lg">Sign in with Clerk</Button>
        </Link>
        <Link href="/sign-up">
          <Button size="lg" variant="secondary" className="border border-white/20 bg-transparent">
            Sign up
          </Button>
        </Link>
      </div>
      <Link href="/" className="mt-8 text-sm text-white/45 underline-offset-4 hover:text-[#A78BFA] hover:underline">
        Back to home
      </Link>
    </main>
  );
}
