import React, { useState, useEffect, useCallback } from 'react';
import { UsageStats } from '../../components/usage-stats';
import { TopUpCredits } from './top-up-credits';
import { logger } from '../../services/logger';
import FileOrganizer from '../../index';

interface AccountDataProps {
  plugin: FileOrganizer;
  onLicenseKeyChange: (key: string) => void;
}

interface UsageData {
  tokenUsage: number;
  maxTokenUsage: number;
  subscriptionStatus: string;
  currentPlan: string;
}

export const AccountData: React.FC<AccountDataProps> = ({ plugin, onLicenseKeyChange }) => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsageData = useCallback(async () => {
    try {
      // Check if we have a Clerk token or API key
      if (!plugin.settings.CLERK_SESSION_TOKEN && !plugin.settings.API_KEY) {
        setLoading(false);
        return;
      }
      
      // Determine which authentication method to use
      const authHeader = plugin.settings.CLERK_SESSION_TOKEN
        ? `Bearer ${plugin.settings.CLERK_SESSION_TOKEN}`
        : `Bearer ${plugin.settings.API_KEY}`;

      const response = await fetch(`${plugin.getServerUrl()}/api/usage`, {
        headers: {
          Authorization: authHeader,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch usage data');
      
      const data = await response.json();
      setUsageData(data);
    } catch (error) {
      logger.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [plugin]);

  useEffect(() => {
    fetchUsageData();

    const intervalId = setInterval(fetchUsageData, 3000);

    return () => clearInterval(intervalId);
  }, [fetchUsageData]);

  if (!plugin.settings.API_KEY && !plugin.settings.CLERK_SESSION_TOKEN) {
    return (
      <div className="bg-[--background-primary-alt] p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2 mt-0">Get Started</h3>
        <p className="text-[--text-muted] mb-4">
          Choose how you'd like to start using Note Companion:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Create Account Option */}
          <div className="bg-[--background-primary] p-4 rounded-lg border border-[--background-modifier-border] flex flex-col">
            <div className="flex-1">
              <h4 className="font-medium mb-2 mt-0">Create Account</h4>
              <p className="text-[--text-muted] text-sm">
                Get early access to new features and manage your credits from a dashboard.
              </p>
            </div>
            <div 
              onClick={() => window.open(plugin.getServerUrl(), '_blank')}
              className="mt-4 cursor-pointer bg-[--interactive-accent] text-[--text-on-accent] px-4 py-2 rounded hover:bg-[--interactive-accent-hover] transition-colors text-center font-medium"
            >
              Create Account
            </div>
          </div>

          {/* Quick Top-up Option */}
          <div className="bg-[--background-primary] p-4 rounded-lg border border-[--background-modifier-border] flex flex-col">
            <div className="flex-1">
              <h4 className="font-medium mb-2 mt-0">Quick Top-up</h4>
              <p className="text-[--text-muted] text-sm">
                Start immediately with a one-time credit purchase. No account needed.
              </p>
            </div>
            <div className="mt-4">
              <TopUpCredits 
                plugin={plugin} 
                onLicenseKeyChange={onLicenseKeyChange} 
              />
            </div>
          </div>
        </div>

        <div className="text-[--text-muted] text-sm">
          <p className="mb-2">
            💡 <strong>Pro tip:</strong> Creating an account gives you access to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Early access to new features</li>
            <li>Credit management dashboard</li>
            <li>Priority support</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {usageData && (
        <>
          <UsageStats usageData={usageData} />
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 mt-0">Need more credits?</h3>
            <TopUpCredits plugin={plugin} onLicenseKeyChange={onLicenseKeyChange} />
          </div>
        </>
      )}
    </div>
  );
};    