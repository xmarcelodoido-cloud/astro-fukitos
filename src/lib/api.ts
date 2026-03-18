const config = {
  API_BASE_URL: 'https://edusp.crimsonzerohub.xyz',
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  CATALYST_API_URL: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-catalyst`,
  STATUS_SERVER_URL: 'https://statusbis.biscurim.space'
};

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

function getDefaultHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
    'User-Agent': config.USER_AGENT,
    'Connection': 'keep-alive',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty'
  };
}

async function makeRequest<T>(url: string, method = 'GET', headers: Record<string, string> = {}, body: object | null = null): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { ...headers }
  };

  if (body !== null && body !== undefined && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} em ${method} ${url}: ${errorText}`);
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export async function login(ra: string, senha: string): Promise<LoginData> {
  const loginData = {
    realm: "edusp",
    platform: "webclient",
    id: ra,
    password: senha
  };

  const headers = {
    'Accept': 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
    'User-Agent': config.USER_AGENT,
    'Content-Type': 'application/json',
    'Referer': 'https://crimsonstrauss.xyz/',
    'Origin': 'https://crimsonstrauss.xyz',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Priority': 'u=0'
  };

  return makeRequest<LoginData>(`${config.API_BASE_URL}/registration/edusp`, 'POST', headers, loginData);
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

  const url = `${config.API_BASE_URL}/tms/task/todo?${paramsString}&${targetParams}&${statusParams}`;

  const headers = {
    ...getDefaultHeaders(),
    'x-api-key': token
  };

  try {
    const data = await makeRequest<Task[]>(url, 'GET', headers);
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
  const data = await makeRequest<{ rooms: Room[] }>(
    `${config.API_BASE_URL}/room/user?list_all=true&with_cards=true`,
    'GET',
    { ...getDefaultHeaders(), 'x-api-key': token }
  );

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
    let effectiveRoomForExecution: string | null = null;

    if (task.room_info && task.room_info.name) {
      effectiveRoomForExecution = task.room_info.name;
    } else {
      const pubTarget = task.publication_target;
      if (roomIdToNameMap.has(pubTarget)) {
        effectiveRoomForExecution = roomIdToNameMap.get(pubTarget) || null;
      } else if (typeof pubTarget === 'string' && pubTarget.includes(':')) {
        effectiveRoomForExecution = pubTarget.split(':')[0];
      } else if (typeof pubTarget === 'string' && pubTarget.startsWith('r')) {
        effectiveRoomForExecution = pubTarget;
      }
    }

    if (!effectiveRoomForExecution || !effectiveRoomForExecution.startsWith('r')) {
      effectiveRoomForExecution = firstRoomName;
    }

    return {
      ...task,
      token,
      room: effectiveRoomForExecution,
      type: taskFilter
    };
  });
}

async function pollJobStatus(jobId: string, maxAttempts = 60): Promise<{ success: boolean; message?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const result = await makeRequest<any>(
        config.CATALYST_API_URL,
        'POST',
        { 'Content-Type': 'application/json' },
        { action: 'status', jobId }
      );

      if (result.status === 'completed' || result.success === true) {
        return { success: true };
      }
      if (result.status === 'failed' || result.error) {
        return { success: false, message: result.error || result.message || 'Falha no processamento' };
      }
      // Still processing, continue polling
    } catch {
      // Network error, continue polling
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

      const payload = {
        id: task.id,
        token: task.token,
        room: task.room,
        score: task.score || 100,
        isDraft,
        minTime,
        maxTime
      };

      const result = await makeRequest<any>(
        config.CATALYST_API_URL,
        'POST',
        { 'Content-Type': 'application/json' },
        payload
      );

      // If Catalyst returns a job ID, poll for completion
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
        // Direct success response
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
