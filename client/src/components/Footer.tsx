import { MapPin, Phone, Mail } from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/102194369_padded_logo_59e28746.png";

interface FooterProps {
  settings?: Record<string, string>;
}

export function Footer({ settings = {} }: FooterProps) {
  const companyName = settings.company_name || "Design Your Price";
  const companyLocation = settings.company_location || "Orem, Utah";
  const companyPhone = settings.company_phone || "Contact Us for a Quote";
  const companyEmail = settings.company_email || "info@designyourprice.com";
  const footerDescription = settings.footer_description || "Utah's trusted Tanzite stone decking specialists. We provide professional installation of Rainier and Appalachian collection stone decking for residential and commercial projects.";

  return (
    <footer className="bg-charcoal text-warm-cream/80 print:hidden">
      <div className="container py-10 lg:py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Company */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src={LOGO_URL}
                alt={companyName}
                className="w-10 h-10 rounded-lg"
              />
              <h3 className="text-xl text-white font-display">{companyName}</h3>
            </div>
            <p className="text-sm font-body leading-relaxed mb-4">
              {footerDescription}
            </p>
            <div className="space-y-2 text-sm font-body">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-canyon-light shrink-0" />
                {companyLocation}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-canyon-light shrink-0" />
                {companyPhone}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-canyon-light shrink-0" />
                {companyEmail}
              </p>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-base text-white font-body font-semibold mb-3">
              Tanzite Collections
            </h4>
            <ul className="space-y-2 text-sm font-body">
              <li>Rainier Collection — Waterproof Stone Decking</li>
              <li>Appalachian Collection — Hidden Fastener System</li>
              <li>Edge Finishing & Bullnose Options</li>
              <li>Stair Treads & Risers</li>
              <li>Accessories & Hardware</li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-base text-white font-body font-semibold mb-3">
              Our Services
            </h4>
            <ul className="space-y-2 text-sm font-body">
              <li>Free Project Estimates</li>
              <li>Professional Installation</li>
              <li>Deck Resurfacing</li>
              <li>Patio & Walkway Installation</li>
              <li>Serving All of Utah</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-body text-warm-cream/50">
            &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>
          <p className="text-xs font-body text-warm-cream/50">
            Tanzite StoneDecks is a registered trademark of Tanzite International.
            Pricing subject to change.
          </p>
        </div>
      </div>
    </footer>
  );
}
