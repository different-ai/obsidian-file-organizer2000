import * as React from "react";
import { ErrorBox } from "./error-box";
import { EmptyState } from "./empty-state";
import FileOrganizer from "../../../../index";

interface LicenseValidatorProps {
  authToken: string;
  onValidationComplete: () => void;
  plugin: FileOrganizer;
}

export const LicenseValidator: React.FC<LicenseValidatorProps> = ({
  authToken,
  onValidationComplete,
  plugin,
}) => {
  const [isValidating, setIsValidating] = React.useState(true);
  const [licenseError, setLicenseError] = React.useState<string | null>(null);

  const validateLicense = React.useCallback(async () => {
    try {
      setIsValidating(true);
      setLicenseError(null);
      
      // should be replaced with a hardcoded value
      const response = await fetch(`${plugin.getServerUrl()}/api/check-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        setLicenseError(data.error || "Invalid license key");
      } else if (data.message !== "Valid key") {
        setLicenseError("Invalid license key response");
      } else {
        onValidationComplete();
      }
    } catch (err) {
      setLicenseError("Failed to validate license key");
    } finally {
      setIsValidating(false);
    }
  }, [authToken, onValidationComplete]);

  React.useEffect(() => {
    validateLicense();
  }, [validateLicense]);



  if (licenseError) {
    return (
      <ErrorBox
        message={`License key error: ${licenseError}`}
        description="Please check your license key in the plugin settings."
        actionButton={
          <div className="flex gap-2">
            <button
              onClick={validateLicense}
              className="px-3 py-1.5  rounded hover:opacity-90 transition-opacity duration-200"
            >
              Retry
            </button>
            <button
              onClick={() => {
                // Open Obsidian settings and navigate to plugin settings
                plugin.app.setting.open();
                plugin.app.setting.openTabById("fileorganizer2000");
              }}
              className="px-3 py-1.5 bg-[--interactive-accent] text-[--text-on-accent] rounded hover:bg-[--interactive-accent-hover] transition-colors duration-200"
            >
              Open Settings
            </button>
          </div>
        }
      />
    );
  }

  return null;
};
