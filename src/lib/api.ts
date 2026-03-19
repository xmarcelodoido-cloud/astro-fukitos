const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-catalyst`;

export interface Task {
  id: number;
  title: string;
  token: string;
  room: string;
  type: string;
  publication_target: string;
  room_info?: {
    name: string;
  };
  score?: number;
  // Keep full task data for Catalyst payload
  _rawData?: Record<string, any>;
}

interface LoginData {
  auth_token: string;
  nick: string;
  external_id?: string;
}

interface Room {
  id: number;
  name: string;
}

// Store session data for Catalyst calls
let sessionData: {
  token: string;
  nick: string;
  targets: string[];
} | null = null;

async function proxyRequest<T>(payload: object): Promise<T> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Proxy error: ${errorText}`);
  }

  const data = await response.json();
  if (data.success === false && data.error) {
    throw new Error(data.error);
  }
  return data as T;
}

export async function login(ra: string, senha: string): Promise<LoginData> {
  const result = await proxyRequest<LoginData>({ action: 'login', ra, password: senha });
  // Store session info
  sessionData = {
    token: result.auth_token,
    nick: result.nick,
    targets: [],
  };
  return result;
}

async function fetchTasks(token: string, targetPublications: string[], taskFilter: string): Promise<Task[]> {
  const params: Record<string, string | number | boolean> = {
    limit: 100,
    offset: 0,
    with_answer: true,
    with_apply_moment: true,
  };

  if (taskFilter === 'expired') {
    params.expired_only = true;
    params.filter_expired = false;
    params.is_exam = false;
    params.is_essay = false;
  } else {
    params.expired_only = false;
    params.filter_expired = true;
    params.is_exam = false;
    params.is_essay = false;
  }

  const statusParams = `answer_statuses=${encodeURIComponent('pending')}&answer_statuses=${encodeURIComponent('draft')}`;
  const targetParams = targetPublications.map(target => `publication_target=${encodeURIComponent(target)}`).join('&');
  const paramsString = Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&');

  const url = `/tms/task/todo?${paramsString}&${targetParams}&${statusParams}`;

  try {
    const data = await proxyRequest<any[]>({ action: 'tasks', token, url });
    return data.map(task => ({
      ...task,
      token,
      room: task.publication_target,
      type: taskFilter,
      _rawData: task, // Keep full task data for Catalyst
    }));
  } catch {
    return [];
  }
}

export async function fetchUserTasks(token: string, userNick: string, taskFilter: string): Promise<Task[]> {
  const data = await proxyRequest<{ rooms: Room[] }>({ action: 'rooms', token });

  if (!data.rooms || data.rooms.length === 0) {
    throw new Error('Nenhuma sala encontrada');
  }

  const uniqueTargets = new Set<string>();
  const roomIdToNameMap = new Map<string, string>();
  const firstRoomName = data.rooms[0].name;

  data.rooms.forEach(room => {
    uniqueTargets.add(room.name);
    roomIdToNameMap.set(room.id.toString(), room.name);
    if (userNick) {
      uniqueTargets.add(`${room.name}:${userNick}`);
    }
    // Add numeric IDs (3-4 digits)
    const idStr = room.id.toString();
    if (/^\d{3,4}$/.test(idStr)) {
      uniqueTargets.add(idStr);
    }
  });

  const roomUserJsonString = JSON.stringify(data);
  const idMatches = roomUserJsonString.match(/"id"\s*:\s*(\d{3,4})(?!\d)/g) || [];
  idMatches.forEach(m => {
    const match = m.match(/\d+/);
    if (match) uniqueTargets.add(match[0]);
  });

  const targetsArray = Array.from(uniqueTargets);
  
  // Store targets for Catalyst calls
  if (sessionData) {
    sessionData.targets = targetsArray;
  }

  const allFetchedTasks = await fetchTasks(token, targetsArray, taskFilter);

  return allFetchedTasks.map(task => {
    let effectiveRoom: string | null = null;

    if (task.room_info?.name) {
      effectiveRoom = task.room_info.name;
    } else {
      const pubTarget = task.publication_target;
      if (roomIdToNameMap.has(pubTarget)) {
        effectiveRoom = roomIdToNameMap.get(pubTarget) || null;
      } else if (typeof pubTarget === 'string' && pubTarget.includes(':')) {
        effectiveRoom = pubTarget.split(':')[0];
      } else if (typeof pubTarget === 'string' && pubTarget.startsWith('r')) {
        effectiveRoom = pubTarget;
      }
    }

    if (!effectiveRoom || !effectiveRoom.startsWith('r')) {
      effectiveRoom = firstRoomName;
    }

    return { ...task, token, room: effectiveRoom, type: taskFilter };
  });
}

function parseEstimatedMinutes(message?: string): number {
  if (!message) return 2;
  const m = message.match(/~?\s*(\d+)\s*min/i);
  if (m) return Math.max(1, parseInt(m[1]));
  const s = message.match(/~?\s*(\d+)\s*s(?:ec)?/i);
  if (s) return Math.max(1, Math.ceil(parseInt(s[1]) / 60));
  return 2;
}

async function pollJobStatus(jobId: string, maxAttempts = 60): Promise<{ success: boolean; message?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      const result = await proxyRequest<any>({ action: 'status', jobId });
      // Status uses Portuguese: 'pendente' | 'concluido' | 'erro'
      if (result.status === 'concluido') return { success: true };
      if (result.status === 'erro') return { success: false, message: result.message || 'Erro no processamento' };
      // 'pendente' = still processing, continue polling
    } catch {
      // continue polling on network error
    }
  }
  return { success: false, message: 'Tempo limite excedido' };
}

export async function processTasks(
  tasks: Task[],
  isDraft: boolean,
  minTime: number,
  maxTime: number,
  onProgress: (message: string, type: 'info' | 'success' | 'error') => void
): Promise<{ success: number; error: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const task of tasks) {
    try {
      onProgress(`Enviando: ${task.title.substring(0, 25)}...`, 'info');

      // Send with exact Catalyst payload format
      const result = await proxyRequest<any>({
        action: 'complete',
        taskData: task._rawData || task,
        token: task.token,
        publicationTargets: sessionData?.targets || [],
        room: task.room,
        minTime,
        maxTime,
        isDraft,
        userNick: sessionData?.nick || '',
      });

      if (result?.success) {
        const estimatedMin = parseEstimatedMinutes(result.message);
        const taskId = String(result._taskId || task.id);
        
        // Get job_id from response (job_ids map)
        const jobId = result.job_ids?.[taskId] || null;
        
        if (jobId) {
          onProgress(`Processando: ${task.title.substring(0, 25)}... (~${estimatedMin} min)`, 'info');
          const jobResult = await pollJobStatus(jobId);
          if (jobResult.success) {
            successCount++;
            onProgress(`Concluído: ${task.title.substring(0, 25)}`, 'success');
          } else {
            errorCount++;
            onProgress(`Erro: ${task.title.substring(0, 20)}... - ${jobResult.message}`, 'error');
          }
        } else {
          // No job_id but success = completed immediately
          successCount++;
          onProgress(`Concluído: ${task.title.substring(0, 25)}`, 'success');
        }
      } else {
        errorCount++;
        const errMsg = result?.message || result?.error || 'Resposta inválida';
        onProgress(`Erro: ${task.title.substring(0, 20)}... - ${errMsg}`, 'error');
      }
    } catch (err: any) {
      errorCount++;
      onProgress(`Erro ao enviar '${task.title.substring(0, 20)}...' - ${err.message || ''}`, 'error');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success: successCount, error: errorCount };
}
