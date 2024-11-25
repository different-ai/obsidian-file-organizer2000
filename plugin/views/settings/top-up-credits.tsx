import { useState } from "react";
import { Button } from "../ai-chat/button";
import FileOrganizer from "../..";

export function TopUpCredits({
  plugin,
  onLicenseKeyChange,
}: {
  plugin: FileOrganizer;
  onLicenseKeyChange: (licenseKey: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${plugin.getServerUrl()}/api/top-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
      onLicenseKeyChange(data.licenseKey.key.key);
    } catch (error) {
      console.error("Top-up error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTopUp}
      disabled={loading}
      className="w-full"
    >
      {loading ? "Processing..." : "Top Up Credits (€15 for 5M)"}
    </Button>
  );
}
