import { redirect } from "react-router";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function Index() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>שומר שבת</h1>
        <p className={styles.text}>
          סגירה אוטומטית של החנות בשבת וחגים לפי זמני הדלקת נרות והבדלה.
        </p>
        <p className={styles.hint}>
          פתחו את האפליקציה מתוך ניהול החנות ב-Shopify.
        </p>
        <p className={styles.hint}>
          <a href="/privacy">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}
