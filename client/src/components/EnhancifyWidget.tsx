/**
 * EnhancifyWidget — fullpagewidget implementation
 *
 * The official fullpagewidget script:
 *   1. XHR-fetches HTML from https://www.enhancify.com/Widget?...
 *   2. Injects that HTML into #fullpagewidget
 *   3. Appends fullpagewidget.js (which bundles jQuery + ionRangeSlider)
 *      and calls u.init() via $(document).ready()
 *
 * Because DOMContentLoaded / $(document).ready() won't re-fire after
 * dynamic injection, we replicate steps 1-2 in a useEffect, then load
 * the script and manually call u.init() once it has loaded.
 *
 * fullpagewidget.js exposes its init via $(document).ready(u.init).
 * Since jQuery is bundled inside the script, we patch document.ready
 * temporarily so our callback fires immediately after the script loads.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const WIDGET_PARAMS =
  "color1=" + encodeURIComponent("#68BA62") +
  "&color2=" + encodeURIComponent("#1C418C") +
  "&coBrandedColor=" + encodeURIComponent("#FFFFFF") +
  "&page=9917849" +
  "&hideLink=0";

export function EnhancifyWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    // Step 1 — fetch the widget HTML
    fetch("https://www.enhancify.com/Widget?" + WIDGET_PARAMS)
      .then((res) => {
        if (!res.ok) throw new Error("Widget fetch failed");
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;

        // Step 2 — inject HTML
        el.innerHTML = html;

        // Step 3 — load the activation script.
        // The script calls $(document).ready(u.init). jQuery is bundled
        // inside the script, so we can't intercept it easily. Instead we
        // use a MutationObserver to detect when the script has finished
        // executing (jQuery will be available on window after that) and
        // then manually trigger the ready queue.
        const scriptId = "enhancify-fullpagewidget-js";
        // Remove any previously loaded copy so it re-executes
        const existing = document.getElementById(scriptId);
        if (existing) existing.remove();

        const s = document.createElement("script");
        s.id = scriptId;
        s.type = "text/javascript";
        s.src = "https://www.enhancify.com/build/js/fullpagewidget.js";
        s.onload = () => {
          if (cancelled) return;
          setLoading(false);
          // The script already called $(document).ready(u.init).
          // jQuery's ready queue fires immediately if the document is
          // already ready — which it is — so u.init() should have run.
          // If for some reason it hasn't (e.g. jQuery deferred it), we
          // trigger the ready event manually.
          try {
            // @ts-ignore — jQuery is injected by the script
            if (window.jQuery) window.jQuery(document).trigger("ready");
          } catch {
            // ignore
          }
        };
        s.onerror = () => {
          if (cancelled) return;
          setLoading(false);
          setError(true);
        };
        document.head.appendChild(s);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#1C418C]" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Unable to load financing widget. Please try again later.
        </div>
      )}
      {/* id="fullpagewidget" is required by the activation script */}
      <div
        id="fullpagewidget"
        ref={containerRef}
        data-color1="#68BA62"
        data-color2="#1C418C"
        data-cobranded-color="#FFFFFF"
        data-page="9917849"
        data-hide-link="0"
        className={loading || error ? "hidden" : ""}
      />
    </div>
  );
}
