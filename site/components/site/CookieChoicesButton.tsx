"use client";

import { openCookieConsent } from "@/components/site/CookieConsent";

/**
 * Reopens the consent panel from the footer.
 *
 * Mounted 18 Sep with analytics, because withdrawing has to be as easy as
 * agreeing and `openCookieConsent()` had no caller: once a visitor had chosen,
 * the panel never came back and the only way to change her mind was to clear
 * her browsing data. `/privacy` clause 08 promises she can change it, so the
 * promise needs a control.
 *
 * A button, not a link. It opens something on this page, and there is no /cookies
 * route for it to be a link to. It is the one item in this list that is not
 * navigation, so it borrows the rows' exact type and spacing rather than looking
 * like a control that wandered in.
 */
export function CookieChoicesButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieConsent} className={className}>
      Cookie choices
    </button>
  );
}
