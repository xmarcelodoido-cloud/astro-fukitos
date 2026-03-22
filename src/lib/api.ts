const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-catalyst`;

export interface Task {
  id: number;
  title: string;
  token: string;
  room: string;
  type: string;
  publication_target: string;
  score?: number;
  _rawData?: any;
}

let sessionData: { token: string; nick: string } | null = null;

async function proxyRequest<T = any>(payload: any): Promise<T> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Proxy error: ${errorText}`);
  }

  const data = await res.json();
  if (data.success === false && data.error) {
    throw new Error(data.error);
  }
  return data as T;
}

// ==================== LOGIN ====================

export async function login(ra: string, senha: string) {
  const data = await proxyRequest<any>({ action: "login", ra, password: senha });
  sessionData = { token: data.auth_token, nick: data.nick };
  return data;
}

// ==================== BUSCAR TAREFAS ====================

export async function fetchUserTasks(
  token: string,
  nick: string,
  filter: string
): Promise<Task[]> {
  const roomsRes = await proxyRequest<any>({ action: "rooms", token });

  if (!roomsRes.rooms || roomsRes.rooms.length === 0) {
    throw new Error("Nenhuma sala encontrada");
  }

  const targets = [...new Set(roomsRes.rooms.map((r: any) => r.name))] as string[];

  const tasksRes = await proxyRequest<any[]>({
    action: "tasks",
    token,
    filter,
    targets,
  });

  return (tasksRes || []).map((t: any) => ({
    ...t,
    token,
    room: t.room_info?.name || t.publication_target,
    type: filter,
    _rawData: t,
  }));
}

// ==================== FAZER AS TAREFAS ====================

export async function processTasks(
  tasks: Task[],
  isDraft: boolean,
  minTime: number,
  maxTime: number,
  onProgress: (msg: string, type: "info" | "success" | "error") => void
) {
  let success = 0;
  let fail = 0;

  for (const task of tasks) {
    try {
      onProgress(`Enviando: ${task.title.slice(0, 30)}...`, "info");

      const payload = {
        action: "complete",
        taskData: task._rawData || task,
        score: task.score || 100,
        token: task.token,
        room: task.room,
        isDraft,
        minTime,
        maxTime,
        userNick: sessionData?.nick || "",
      };

      const result = await proxyRequest<any>(payload);

      if (result.success) {
        success++;
        onProgress(`✅ ${task.title.slice(0, 25)} concluído`, "success");
      } else {
        fail++;
        onProgress(`❌ ${task.title.slice(0, 25)} falhou`, "error");
      }
    } catch (err: any) {
      fail++;
      onProgress(`Erro: ${task.title.slice(0, 20)} - ${err.message}`, "error");
    }

    // Delay humano entre tarefas
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 2500));
  }

  return { success, error: fail };
}
