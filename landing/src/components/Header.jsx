export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
          <span
            className="inline-block h-2 w-2 rounded-full bg-ruby"
            style={{ boxShadow: '0 0 10px 2px var(--ruby-glow)' }}
          />
          Ruby
        </a>
        <nav className="flex items-center gap-7 text-sm">
          <a href="#how" className="hidden text-muted transition-colors hover:text-ink sm:inline">
            How it works
          </a>
          <a
            href="#demo"
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-night transition-opacity hover:opacity-90"
          >
            Book a demo
          </a>
        </nav>
      </div>
    </header>
  )
}
