import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Services", href: "#features" },
    { label: "Integrations", href: "#integrations" },
    { label: "Resources", href: "#resources" },
    { label: "Dashboard", href: "/dashboard" }
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Careers", href: "#" }
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" }
  ]
};

export default function LandingFooter() {
  return (
    <footer className="border-t border-[#C7D2FE]/30 bg-[#EEF2FF]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="font-display inline-flex items-baseline text-lg font-semibold tracking-tight"
            >
              <span className="text-[#1E1B4B]">CFO</span>
              <span className="text-[#4361EE]">ai</span>
              <span className="text-[#1E1B4B]/70">.</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#3F3D56]/70">
              Financial report intelligence for CFOs, investors, and analysts. Upload, ask, and get
              cited answers in seconds.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1E1B4B]/40">{title}</p>
              <ul className="mt-4 space-y-3">
                {links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[#3F3D56]/70 transition-colors hover:text-[#4361EE]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#C7D2FE]/25 pt-8 text-xs text-[#3F3D56]/50 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} CFOai. All rights reserved.</p>
          <p className="text-[#3F3D56]/40">Built for serious financial workflows.</p>
        </div>
      </div>
    </footer>
  );
}
