import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WarningInfo {
  id: string;
  hasWarning: boolean;
  reason?: string;
  warnedAt?: string;
  acknowledged?: boolean;
}

export const useWarningCheck = () => {
  const [warningInfo, setWarningInfo] = useState<WarningInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkWarning = useCallback(async (ra: string): Promise<WarningInfo> => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('student_warnings')
        .select('id, reason, warned_at, acknowledged')
        .eq('ra', ra)
        .eq('acknowledged', false)
        .order('warned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking warning status:', error);
        return { id: '', hasWarning: false };
      }

      const info: WarningInfo = data
        ? { 
            id: data.id,
            hasWarning: true, 
            reason: data.reason, 
            warnedAt: data.warned_at,
            acknowledged: data.acknowledged
          }
        : { id: '', hasWarning: false };

      setWarningInfo(info);
      return info;
    } catch (error) {
      console.error('Error checking warning:', error);
      return { id: '', hasWarning: false };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const acknowledgeWarning = useCallback(async (warningId: string, ra: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('acknowledge_warning', {
        warning_id: warningId,
        student_ra: ra
      });

      if (error) {
        console.error('Error acknowledging warning:', error);
        return false;
      }

      if (data) {
        setWarningInfo(null);
      }
      return data as boolean;
    } catch (error) {
      console.error('Error acknowledging warning:', error);
      return false;
    }
  }, []);

  const clearWarningInfo = useCallback(() => {
    setWarningInfo(null);
  }, []);

  return { warningInfo, isChecking, checkWarning, acknowledgeWarning, clearWarningInfo };
};
