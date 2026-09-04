import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_OPERATOR_NAME,
  PRIVACY_POSTAL_ADDRESS,
} from "../../lib/privacy-contact";
import styles from "./styles.module.css";

export const meta = () => [
  { title: "Privacy Policy — Shomer Shabbat" },
  {
    name: "description",
    content:
      "How Shomer Shabbat collects, uses, and deletes Shopify shop data.",
  },
];

export default function Privacy() {
  return (
    <main className={styles.page} dir="ltr" lang="en">
      <article className={styles.article}>
        <p className={styles.kicker}>Shomer Shabbat</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: 4 September 2026</p>
        <p>
          This page describes how {PRIVACY_OPERATOR_NAME} (“we”) handles data
          when a merchant installs the Shomer Shabbat Shopify app. It is written
          for the Shopify App Store listing. It is not legal advice.
        </p>

        <h2>Who this applies to</h2>
        <p>
          Merchants who install the app. Storefront visitors are not asked to
          create an account, submit a form, or give us personal details.
        </p>

        <h2>What we collect through Shopify APIs</h2>
        <p>
          The app uses the <code>read_themes</code> access scope. After a
          merchant installs, Shopify gives us an offline session for that shop.
          We store:
        </p>
        <ul>
          <li>The shop domain (for example, example.myshopify.com)</li>
          <li>The access token and related session fields Shopify provides</li>
          <li>
            Whether the Shomer Shabbat theme embed is on, by reading the
            published theme’s settings (theme name and embed on/off)
          </li>
        </ul>
        <p>
          We do not read orders, customers, products, checkout, or payment data.
        </p>

        <h2>What the merchant enters</h2>
        <p>In the app settings we store only:</p>
        <ul>
          <li>Closure mode: Shabbat only, or Shabbat and Jewish holidays</li>
          <li>The Israeli city chosen for candle-lighting and Havdalah times</li>
        </ul>
        <p>
          Closed-page text, colors, logo, and background images are saved in the
          merchant’s Shopify theme, not in our database.
        </p>

        <h2>Storefront visitors</h2>
        <p>
          The storefront script asks our app whether the shop is closed, then
          shows the closed page if it is. That request includes the shop
          domain. We do not ask visitors for names, emails, or payment details.
          We do not drop advertising or analytics cookies for this purpose.
        </p>

        <h2>How we use the data</h2>
        <p>We use this data only to run the app:</p>
        <ul>
          <li>Keep the merchant signed in to the embedded admin</li>
          <li>Apply the chosen city and closure mode</li>
          <li>Load Shabbat and holiday times from Hebcal</li>
          <li>Show whether the theme embed is enabled</li>
          <li>Show the closed page on the storefront when the shop is closed</li>
        </ul>
        <p>We do not sell this data or use it for advertising.</p>

        <h2>Third parties</h2>
        <ul>
          <li>
            Shopify — install, sessions, webhooks, and theme files
          </li>
          <li>
            Hebcal — calendar and candle-lighting times for the selected city
            (we send the city geoname id, not merchant or customer names)
          </li>
          <li>Vercel — hosts the app</li>
          <li>Turso — hosts the app database</li>
        </ul>
        <p>
          Data may be processed outside the merchant’s country, depending on
          those providers.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Shop session and settings stay while the app is installed. When the
          merchant uninstalls, or when Shopify sends a shop/redact webhook, we
          delete that shop’s session and settings from our database.
        </p>
        <p>
          We do not store customer personal data outside Shopify. Customer
          data-request and customer-redact webhooks therefore have nothing extra
          to return or erase.
        </p>

        <h2>Contact</h2>
        {PRIVACY_CONTACT_EMAIL ? (
          <p>
            Questions about this policy:{" "}
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>
              {PRIVACY_CONTACT_EMAIL}
            </a>
            {PRIVACY_OPERATOR_NAME ? ` (${PRIVACY_OPERATOR_NAME})` : ""}.
          </p>
        ) : (
          <p>
            A contact email will be listed here before the app is submitted to
            the Shopify App Store.
          </p>
        )}
        {PRIVACY_POSTAL_ADDRESS ? <p>{PRIVACY_POSTAL_ADDRESS}</p> : null}
      </article>
    </main>
  );
}
