# Corrigir Tarefas e Redação (parar de usar o Catalyst antigo)

## Problema
O envio de tarefas ainda passa pelo `proxy-catalyst` antigo. Isso foi confirmado no registro do backend: "Missing CAPTCHA token" na tarefa 102363267. O motivo é que a lista de tarefas só vai para a Sala do Futuro nova (OpenFuture) quando existe a sessão `of_sid`. Se essa sessão não existe ou dá erro, o site volta sem avisar para o Catalyst antigo. Quando isso acontece, cada envio é bloqueado pelo CAPTCHA.

## O que vai mudar
1. **Tarefas só pela Sala do Futuro nova**
   - O site deixa de voltar sozinho para o Catalyst antigo na hora de buscar e de enviar tarefas.
   - Se a sessão da Sala do Futuro não existir, aparece a mensagem "Sessão expirada, entre de novo" e o botão leva para o login.
2. **O login sempre cria a sessão nova**
   - Hoje o login na Sala do Futuro nova é feito "se der". Ele passa a ser obrigatório: se falhar, o erro aparece em vez de seguir sem sessão.
3. **Redação**
   - Lista de pendentes e expiradas pela Sala do Futuro nova, com acompanhamento até terminar. Isso já está no site; só vou revisar.
   - Ao abrir uma redação expirada, ela é enviada como rascunho.
4. **Mensagens de erro claras** em vez de "ERRO AO BUSCAR ATIVIDADES".

## Teste com a sua conta
- Entrar no site com o seu RA, usando a sessão do seu login no preview.
- Tocar em "Buscar Atividades" e enviar 1 tarefa pendente. Ela fica entregue de verdade.
- Abrir 1 redação expirada e mandar gerar.
- Conferir os registros do backend para garantir que nada passou pelo Catalyst antigo.

## Detalhes técnicos
- `src/lib/api.ts`: remover o fallback para `proxy-catalyst` em `fetchUserTasks` e `processTasks` quando a tarefa vier do OpenFuture. Se não houver `getSid()`, lançar um erro de sessão.
- `src/contexts/SessionContext.tsx` / `Login.tsx`: deixar `ofLogin` obrigatório e guardar `sid`.
- `src/pages/Index.tsx`: mostrar `e.message` e redirecionar para `/login` quando a sessão tiver expirado.
- `src/pages/Redacao.tsx`: revisar o polling de `jobStatus(..., "redacao")`.
- `proxy-catalyst` continua existindo só para o modo IA, que lê as questões.
