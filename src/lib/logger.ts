import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type LogType = 'login' | 'task_completed' | 'task_failed' | 'inspect_attempt' | 'ban_attempt' | 'error';

export const logger = {
  async log(
    logType: LogType,
    ra?: string,
    studentName?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from('activity_logs').insert([{
        ra: ra ?? null,
        student_name: studentName ?? null,
        log_type: logType,
        details: details as Json ?? null,
        user_agent: navigator.userAgent,
      }]);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  },

  async logLogin(ra: string, studentName: string): Promise<void> {
    await this.log('login', ra, studentName, { action: 'user_login' });
  },

  async logTaskCompleted(ra: string, studentName: string, taskId: string, taskName: string): Promise<void> {
    await this.log('task_completed', ra, studentName, { taskId, taskName });
  },

  async logTaskFailed(ra: string, studentName: string, taskId: string, taskName: string, error: string): Promise<void> {
    await this.log('task_failed', ra, studentName, { taskId, taskName, error });
  },

  async logInspectAttempt(ra?: string, studentName?: string, method?: string): Promise<void> {
    await this.log('inspect_attempt', ra, studentName, { method });
  },

  async logError(ra?: string, studentName?: string, errorMessage?: string): Promise<void> {
    await this.log('error', ra, studentName, { errorMessage });
  },
};
