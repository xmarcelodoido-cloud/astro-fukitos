import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BanInfo {
  isBanned: boolean;
  reason?: string;
  bannedAt?: string;
}

export const useBanCheck = () => {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkBan = useCallback(async (ra: string): Promise<BanInfo> => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('banned_students')
        .select('reason, banned_at')
        .eq('ra', ra)
        .maybeSingle();

      if (error) {
        console.error('Error checking ban status:', error);
        return { isBanned: false };
      }

      const info: BanInfo = data
        ? { isBanned: true, reason: data.reason, bannedAt: data.banned_at }
        : { isBanned: false };

      setBanInfo(info);
      return info;
    } catch (error) {
      console.error('Error checking ban:', error);
      return { isBanned: false };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearBanInfo = useCallback(() => {
    setBanInfo(null);
  }, []);

  return { banInfo, isChecking, checkBan, clearBanInfo };
};
