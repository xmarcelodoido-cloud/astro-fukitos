// Read-only proxy for official SED student data (faltas, agenda, boletim, notas).
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const BASE = "https://sedintegracoes.educacao.sp.gov.br/saladofuturobffapi/apiboletim/api";
const KEY = "d701a2043aa24d7ebb37e9adf60d043b";
const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { action, token, codigoAluno, inicio, fim } = await req.json();
    if (!token || !/^\d+$/.test(String(codigoAluno ?? ""))) return json({ success: false, error: "Sessão oficial ausente. Saia e entre de novo." });
    const ano = new Date().getFullYear();
    const paths: Record<string, string> = {
      faltas: `/Frequencia/GetFaltasBimestreAtual?codigoAluno=${codigoAluno}`,
      frequencia: `/Frequencia/GetFrequenciaAluno?codigoAluno=${codigoAluno}&anoLetivo=${ano}`,
      agenda: `/Agenda/GetAgendaPeriodoEscola?codigoAluno=${codigoAluno}&anoLetivo=${ano}&dataInicio=${encodeURIComponent(inicio)}&dataFim=${encodeURIComponent(fim)}`,
      boletim: `/Boletim/GetBoletimAluno?codigoAluno=${codigoAluno}&anoLetivo=${ano}`,
      notas: `/Avaliacao/GetNotasAluno?codigoAluno=${codigoAluno}&anoLetivo=${ano}`,
    };
    const path = paths[action];
    if (!path) return json({ success: false, error: "Ação inválida" });
    const r = await fetch(BASE + path, { headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "ocp-apim-subscription-key": KEY, origin: "https://saladofuturo.educacao.sp.gov.br", referer: "https://saladofuturo.educacao.sp.gov.br/" } });
    const text = await r.text();
    let data: any = null; try { data = JSON.parse(text); } catch { /* */ }
    if (r.status === 401 || r.status === 403) return json({ success: false, error: "Sessão expirada. Entre de novo." });
    if (!r.ok) return json({ success: false, error: `A Sala do Futuro não respondeu (${r.status}).` });
    return json({ success: true, data: data?.data ?? data ?? [] });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Erro" });
  }
});
