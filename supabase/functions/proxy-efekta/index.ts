import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CATALYST_BASE = "https://catalyst-eu.better.efekta.com";

function uuid() {
  return crypto.randomUUID();
}

interface Tokens {
  catalyst_token: string;
  efid_access?: string;
  azid_token?: string;
}

async function listLessons(tokens: Tokens) {
  // Try common Catalyst endpoints; return best-effort lessons list.
  const endpoints = [
    `${CATALYST_BASE}/gap/api/self-study/lessons`,
    `${CATALYST_BASE}/gap/api/lessons`,
    `${CATALYST_BASE}/gap/api/assignments`,
  ];
  const headers = {
    "Authorization": `Bearer ${tokens.catalyst_token}`,
    "Accept": "application/json",
  };
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.lessons || data.items || data.data || []);
      const lessons = raw.map((l: any) => ({
        lessonId: l.lessonId || l.id || l.lesson_id || "",
        activityId: l.activityId || l.activity_id || (l.activities?.[0]?.id) || "",
        taskId: l.taskId || l.task_id || (l.activities?.[0]?.tasks?.[0]?.id) || "",
        sessionId: l.sessionId || l.session_id || uuid(),
        title: l.title || l.name || l.lessonTitle || "Lição Efekta",
        score: l.score || 0,
        completed: !!l.completed || l.score >= 100,
      })).filter((l: any) => l.lessonId && l.activityId && l.taskId);
      if (lessons.length) return lessons;
    } catch { /* try next */ }
  }
  return [];
}

async function completeLesson(tokens: Tokens, lesson: any) {
  const commandId = uuid();
  const timeSpent = 300 + Math.floor(Math.random() * 1200);
  const now = new Date().toISOString();
  const base = {
    activityId: lesson.activityId,
    lessonId: lesson.lessonId,
    sessionId: lesson.sessionId || uuid(),
    taskId: lesson.taskId,
  };
  const events = [
    { type: "task-response-submitted", data: { taskResponseSubmitted: { ...base, timeSpentSecs: timeSpent, type: "language-focus", response: { contents: {}, taskId: lesson.taskId, type: "language-focus" } } } },
    { type: "task-response-assessed", data: { taskResponseAssessed: { ...base, type: "language-focus", response: { contents: { languageFocus: { assessment: { expectedUserInput: true, result: "correct" }, contentSeen: true } }, taskId: lesson.taskId, type: "language-focus" } } } },
    { type: "task-progressed", data: { taskProgressed: { ...base, score: 100, timeSpent, progressedAt: now } } },
    { type: "task-completed", data: { taskCompleted: { ...base, score: 100, timeSpent, completedAt: now } } },
    { type: "task-passed", data: { taskPassed: { ...base, score: 100, timeSpent, passedAt: now } } },
    { type: "activity-progressed", data: { activityProgressed: { activityId: base.activityId, lessonId: base.lessonId, sessionId: base.sessionId, score: 100, timeSpent, progressedAt: now } } },
    { type: "activity-passed", data: { activityPassed: { activityId: base.activityId, lessonId: base.lessonId, sessionId: base.sessionId, score: 100, timeSpent, passedAt: now } } },
    { type: "activity-completed", data: { activityCompleted: { activityId: base.activityId, lessonId: base.lessonId, sessionId: base.sessionId, score: 100, timeSpent, completedAt: now } } },
    { type: "lesson-progressed", data: { lessonProgressed: { lessonId: base.lessonId, sessionId: base.sessionId, score: 100, timeSpent, progressedAt: now } } },
  ].map((e, i) => ({ commandId, id: uuid(), lessonId: base.lessonId, timestamp: now, version: 400 + i, ...e }));

  const url = `${CATALYST_BASE}/gap/api/commands`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokens.catalyst_token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ commandId, events }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, tokens } = body as { action: string; tokens: Tokens };
    if (!tokens?.catalyst_token) {
      return new Response(JSON.stringify({ error: "catalyst_token obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_lessons") {
      const lessons = await listLessons(tokens);
      return new Response(JSON.stringify({ success: true, lessons }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "complete_lesson") {
      const result = await completeLesson(tokens, body.lesson);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("proxy-efekta error", e);
    return new Response(JSON.stringify({ success: false, error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
