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
}

interface LoginData {
  auth_token: string;
  nick: string;
}

interface Room {
  id: number;
  name: string;
}

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
  return proxyRequest<LoginData>({ action: 'login', ra, password: senha });
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
    const data = await proxyRequest<Task[]>({ action: 'tasks', token, url });
    return data.map(task => ({
      ...task,
      token,
      room: task.publication_target,
      type: taskFilter
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
  });

  const roomUserJsonString = JSON.stringify(data);
  const idMatches = roomUserJsonString.match(/"id"\s*:\s*(\d+)(?!\d)/g) || [];
  idMatches.forEach(m => {
    const match = m.match(/\d+/);
    if (match) {
      const id = match[0];
      if (id && !roomIdToNameMap.has(id) && !uniqueTargets.has(id)) {
        uniqueTargets.add(id);
      }
    }
  });

  const targetsArray = Array.from(uniqueTargets);
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

async function pollJobStatus(jobId: string, maxAttempts = 60): Promise<{ success: boolean; message?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const result = await proxyRequest<any>({ action: 'status', jobId });
      if (result.status === 'completed' || result.success === true) return { success: true };
      if (result.status === 'failed' || result.error) return { success: false, message: result.error || result.message || 'Falha' };
    } catch {
      // continue polling
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

      const result = await proxyRequest<any>({
        action: 'complete',
        id: task.id,
        token: task.token,
        room: task.room,
        score: task.score || 100,
        isDraft,
        minTime,
        maxTime,
      });

      if (result.job_id || result.jobId || result.id) {
        const jobId = result.job_id || result.jobId || result.id;
        onProgress(`Processando: ${task.title.substring(0, 25)}...`, 'info');
        const jobResult = await pollJobStatus(jobId);
        if (jobResult.success) {
          successCount++;
          onProgress(`Concluído: ${task.title.substring(0, 25)}`, 'success');
        } else {
          errorCount++;
          onProgress(`Erro: ${task.title.substring(0, 20)}... - ${jobResult.message}`, 'error');
        }
      } else if (result.success) {
        successCount++;
        onProgress(`Concluído: ${task.title.substring(0, 25)}`, 'success');
      } else {
        errorCount++;
        onProgress(`Erro ao enviar '${task.title.substring(0, 20)}...'`, 'error');
      }
    } catch {
      errorCount++;
      onProgress(`Erro ao enviar '${task.title.substring(0, 20)}...'`, 'error');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success: successCount, error: errorCount };
}
