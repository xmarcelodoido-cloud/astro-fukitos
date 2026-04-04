const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-catalyst`;

export interface Task {
  id: number;
  title: string;
  token: string;
  room: string;
  roomCode: string;
  type: string;
  publication_target: string;
  score?: number;
  answer_id?: number;
  _rawData?: any;
}

let sessionData: { token: string; nick: string; roomCode: string; targets: string[] } | null = null;

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

  // Get rooms to build targets (like Eclipse Lunar)
  const roomsRes = await proxyRequest<any>({ action: "rooms", token: data.auth_token });
  const rooms = roomsRes.rooms || [];

  // Build targets: room names, room:nick, numeric IDs
  const targetSet = new Set<string>();
  const nick = data.nick || "";

  rooms.forEach((room: any) => {
    if (room.name) {
      targetSet.add(room.name);
      if (nick) targetSet.add(`${room.name}:${nick}`);
    }
    if (room.id) {
      const id = String(room.id);
      if (/^\d{3,4}$/.test(id)) targetSet.add(id);
    }
  });

  // Extract additional numeric IDs from rooms data
  const allIdsStr = JSON.stringify(roomsRes);
  const idMatches = allIdsStr.match(/"id"\s*:\s*(\d{3,4})(?!\d)/g) || [];
  idMatches.forEach(m => {
    const match = m.match(/\d+/);
    if (match) targetSet.add(match[0]);
  });

  const targets = Array.from(targetSet);

  // Pick best room
  const gradeRooms = rooms.filter((r: any) => r.topic && /[º°ª]/.test(r.topic));
  const candidates = gradeRooms.length ? gradeRooms : rooms;
  const bestRoom = candidates.reduce((best: any, r: any) => {
    const bestOps = best?.oper?.length || 0;
    const rOps = r?.oper?.length || 0;
    return rOps > bestOps ? r : best;
  }, candidates[0]);

  const roomCode = bestRoom?.name || "";

  sessionData = { token: data.auth_token, nick: data.nick, roomCode, targets };
  return { ...data, roomCode };
}

// ==================== BUSCAR TAREFAS ====================

export async function fetchUserTasks(
  token: string,
  nick: string,
  filter: string
): Promise<Task[]> {
  // Use stored targets or fetch rooms again
  let targets = sessionData?.targets || [];
  if (!targets.length) {
    const roomsRes = await proxyRequest<any>({ action: "rooms", token });
    if (!roomsRes.rooms || roomsRes.rooms.length === 0) {
      throw new Error("Nenhuma sala encontrada");
    }
    targets = [...new Set(roomsRes.rooms.map((r: any) => r.name))] as string[];
  }

  const roomCode = sessionData?.roomCode || targets[0] || "";

  const tasksRes = await proxyRequest<any[]>({
    action: "tasks",
    token,
    filter,
    targets,
    roomCode,
  });

  return (tasksRes || []).map((t: any) => ({
    ...t,
    token,
    room: t.room_info?.name || t.publication_target,
    roomCode,
    type: filter,
    answer_id: t.answer_id || 0,
    _rawData: t,
  }));
}

// ==================== SALVAR RESULTADO NO BANCO ====================

async function saveToDatabase(ra: string, task: Task, success: boolean, score: number, time: number) {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-task-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ra,
        task_id: String(task.id),
        title: task.title,
        score,
        time_spent: time,
        success,
        room: task.room,
      }),
    });
  } catch (e) {
    console.error("Erro ao salvar resultado:", e);
  }
}

// ==================== FAZER AS TAREFAS ====================

export async function processTasks(
  tasks: Task[],
  isDraft: boolean,
  minTime: number,
  maxTime: number,
  onProgress: (msg: string, type: "info" | "success" | "error") => void,
  ra?: string
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
        isDraft,
        minTime,
        maxTime,
        userNick: sessionData?.nick || "",
        targets: sessionData?.targets || [],
        isExpired: task.type === "expired",
      };

      const result = await proxyRequest<any>(payload);

      if (result.skipped) {
        onProgress(`⏭️ ${task.title.slice(0, 25)} pulado (${result.reason})`, "info");
        continue;
      }

      if (result.success) {
        const timeSpent = Math.floor(Math.random() * (maxTime - minTime) + minTime) * 60;
        if (ra) await saveToDatabase(ra, task, true, payload.score, timeSpent);
        success++;
        onProgress(`✅ ${task.title.slice(0, 25)} concluído`, "success");
      } else {
        if (ra) await saveToDatabase(ra, task, false, 0, 0);
        fail++;
        onProgress(`❌ ${task.title.slice(0, 25)} falhou`, "error");
      }
    } catch (err: any) {
      fail++;
      onProgress(`Erro: ${task.title.slice(0, 20)} - ${err.message}`, "error");
    }

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 2500));
  }

  return { success, error: fail };
}
