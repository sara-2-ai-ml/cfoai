import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-12 text-white">
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-accent">CFOai</p>
      <SignUp
        signInUrl="/sign-in"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#101114] border border-white/10 shadow-xl"
          }
        }}
      />
    </main>
  );
}
