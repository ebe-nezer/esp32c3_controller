import * as updates from "expo-updates";
import { useEffect, useState } from "react";

export default function useUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        setChecking(true);
        const update = await updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
          setChecking(false);
          await updates.fetchUpdateAsync().then(() => {
            // Notify user of update and reload
            updates.reloadAsync();
          });
        } else {
          setUpdateAvailable(false);
          setChecking(false);
        }
      } catch (e) {
        setError(JSON.stringify(e));
        console.error("Error checking for updates:", e);
      } finally {
        setChecking(false);
      }
    };

    if (process.env.NODE_ENV !== "development") checkForUpdates();
  }, []);

  return { updateAvailable, checking, error };
}
