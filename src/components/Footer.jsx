import { useI18n } from '../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-night/10 bg-surface text-night/60">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-6 px-6 py-12 text-sm md:flex-row md:justify-between">
        <span className="flex items-center gap-2 text-night">
          <span className="h-2 w-2 rounded-full bg-ruby" /> Ruby
        </span>
        <nav className="flex gap-6">
          <a href="/blog/" className="transition-colors hover:text-night">{t('footer.blog')}</a>
          <a href="/privacy.html" className="transition-colors hover:text-night">{t('footer.privacy')}</a>
          <a href="/terms.html" className="transition-colors hover:text-night">{t('footer.terms')}</a>
          <a href="mailto:hello@getruby.io" className="transition-colors hover:text-night">{t('footer.contact')}</a>
        </nav>
        <span className="text-night/40">© 2026 Ruby</span>
      </div>
    </footer>
  )
}
