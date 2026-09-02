import { MapPin, Phone, Settings } from "lucide-react";
import { motion } from "framer-motion";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/hero-banner-cYhm2o8M4K9nNSwiDhehg6.webp";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/102194369_padded_logo_59e28746.png";

interface HeroSectionProps {
  settings?: Record<string, string>;
  utahMarkupEnabled?: boolean;
  utahMarkupActive?: boolean;
  onUtahMarkupToggle?: () => void;
  builderPricingEnabled?: boolean;
  onBuilderToggle?: () => void;
  onLogoClick?: () => void;
}

export function HeroSection({ settings = {}, utahMarkupEnabled = false, utahMarkupActive = false, onUtahMarkupToggle, builderPricingEnabled = false, onBuilderToggle, onLogoClick }: HeroSectionProps) {

  const companyName = settings.company_name || "Design Your Price";
  const companyTagline = settings.company_tagline || "Decking Specialists";
  const companyLocation = settings.company_location || "Orem, Utah";
  const companyPhone = settings.company_phone || "Contact Us for a Quote";
  const heroTitle = settings.hero_title || "Premium Decking";
  const heroSubtitle = settings.hero_subtitle || "Cost Calculator";
  const heroDescription = settings.hero_description || "Get an instant estimate for your decking project. Choose from Tanzite stone, Resin Rock, Duradek vinyl, or Tiledek tile installations. Customize materials, colors, dimensions, and installation options to design your perfect outdoor space.";
  const heroBadges = settings.hero_badges
    ? settings.hero_badges.split(",").map(b => b.trim())
    : ["Tanzite Stone", "Resin Rock", "Duradek / Tiledek", "Instant Pricing", "Utah Installation"];

  return (
    <header className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="Stone deck overlooking Utah mountains"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/60 to-charcoal/30" />
      </div>

      {/* Content */}
      <div className="relative container py-8 sm:py-12 lg:py-16">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8 sm:mb-12"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onLogoClick}
              title="Switch to Design Package Calculator"
              className="group relative focus:outline-none"
            >
              <img
                src={LOGO_URL}
                alt={companyName}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-lg transition-transform ${onLogoClick ? 'cursor-pointer group-hover:scale-105' : ''}`}
              />
              {onLogoClick && (
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-warm-cream/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Design Package
                </span>
              )}
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
                {companyName}
              </h1>
              <p className="text-warm-cream/80 text-sm sm:text-base font-body mt-1">
                {companyTagline}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-warm-cream/90 text-sm font-body">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-canyon-light" />
              {companyLocation}
            </span>
            <span className="hidden sm:inline text-warm-cream/40">|</span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-canyon-light" />
              {companyPhone}
            </span>
            <span className="hidden sm:inline text-warm-cream/40">|</span>
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-canyon-light hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </a>
          </div>
        </motion.div>

        {/* Main hero text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-2xl"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
            {heroTitle}
            <br />
            <span className="text-canyon-light">{heroSubtitle}</span>
          </h2>
          <p className="text-warm-cream/80 text-base sm:text-lg font-body leading-relaxed max-w-xl">
            {heroDescription}
          </p>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-3 mt-6 sm:mt-8"
        >
          {heroBadges.map((badge) => {
            const isUtahBadge = badge.toLowerCase().includes("utah installation");
            const isBuilderTrigger = badge.toLowerCase().includes("rainier") || badge.toLowerCase().includes("appalachian");
            if (isUtahBadge && utahMarkupEnabled) {
              return (
                <button
                  key={badge}
                  onClick={onUtahMarkupToggle}
                  className={`px-3 py-1.5 rounded-sm backdrop-blur-sm text-xs sm:text-sm font-body font-medium border transition-colors cursor-pointer ${
                    utahMarkupActive
                      ? "bg-canyon/80 text-white border-canyon"
                      : "bg-white/10 text-warm-cream border-white/15 hover:bg-white/20"
                  }`}
                  title={utahMarkupActive ? "Click to remove Utah installation markup" : "Click to apply Utah installation markup"}
                >
                  {badge}
                </button>
              );
            }
            if (isBuilderTrigger) {
              return (
                <button
                  key={badge}
                  onClick={onBuilderToggle}
                  className={`px-3 py-1.5 rounded-sm backdrop-blur-sm text-xs sm:text-sm font-body font-medium border transition-colors cursor-pointer ${
                    builderPricingEnabled
                      ? "bg-amber-600/80 text-white border-amber-500"
                      : "bg-white/10 text-warm-cream border-white/15 hover:bg-white/20"
                  }`}
                >
                  {badge}
                </button>
              );
            }
            return (
              <span
                key={badge}
                className="px-3 py-1.5 rounded-sm bg-white/10 backdrop-blur-sm text-warm-cream text-xs sm:text-sm font-body font-medium border border-white/15"
              >
                {badge}
              </span>
            );
          })}
        </motion.div>
      </div>

      {/* Bottom edge: subtle stone-colored divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-6 sm:h-8 lg:h-10">
          <path d="M0 40V20C240 0 480 10 720 20C960 30 1200 0 1440 20V40H0Z" className="fill-warm-cream" />
        </svg>
      </div>


    </header>
  );
}
