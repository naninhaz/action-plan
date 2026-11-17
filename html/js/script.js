const FIREBASE_DEFAULT_URL = "https://sos-escola-a6ccb-default-rtdb.firebaseio.com";
let perfilAtual = null;
let confiancaAtual = 3;
let simulacaoLigacaoTimer;
let simulacaoDuracaoTimer;
let simulacaoInicio;
let focoAnteriorSimulacao = null;
let estadoQuiz = null;

const CHAVE_REGISTROS = "sos_escola_records";
const CHAVE_FIREBASE = "sos_escola_fb_url";

const protocolos = [
  {
    title: "Prevenção",
    subtitle: "Reduza riscos no ambiente escolar",
    actions: [
      "Identifique riscos em salas, pátios, cozinhas e áreas de circulação.",
      "Mantenha produtos de limpeza, medicamentos e objetos perigosos fora do alcance das crianças.",
      "Combine como pedir ajuda e onde encontrar os contatos de emergência.",
      "Planeje capacitações e atualizações periódicas com profissionais habilitados."
    ],
    avoid: "Não deixe de registrar riscos e situações que precisam de acompanhamento."
  },
  {
    title: "Engasgo",
    subtitle: "Obstrução das vias aéreas",
    actions: [
      "Observe se a criança consegue tossir, falar ou respirar.",
      "Peça ajuda e acione o SAMU pelo 192 diante de dificuldade importante para respirar.",
      "Siga as orientações do atendente e só faça manobras para a faixa etária se tiver treinamento."
    ],
    avoid: "Não faça varredura às cegas com os dedos nem ofereça líquidos."
  },
  {
    title: "Convulsão",
    subtitle: "Proteja a criança durante a crise",
    actions: [
      "Afaste objetos que possam causar ferimentos e proteja a cabeça.",
      "Marque o tempo e observe o que acontece.",
      "Quando os movimentos cessarem, verifique a respiração e siga a orientação do SAMU.",
      "Acione o 192 se for a primeira crise, durar mais de cinco minutos, houver lesão ou dificuldade para respirar."
    ],
    avoid: "Não segure os movimentos e não coloque objetos ou dedos na boca."
  },
  {
    title: "Queimadura",
    subtitle: "Resfrie e proteja a área",
    actions: [
      "Afaste a criança da fonte de calor sem se colocar em risco.",
      "Resfrie a área com água corrente fresca.",
      "Procure atendimento para queimaduras extensas, profundas ou em áreas sensíveis."
    ],
    avoid: "Não use gelo, pasta de dente, pomadas ou receitas caseiras; não retire roupa grudada."
  },
  {
    title: "Ferimentos e sangramentos",
    subtitle: "Cuidados iniciais e proteção",
    actions: [
      "Proteja-se e use uma barreira limpa, como luvas, se disponível.",
      "Faça pressão direta com gaze ou pano limpo sobre o sangramento.",
      "Peça ajuda e acione o 192 se o sangramento for intenso ou não parar."
    ],
    avoid: "Não retire objetos encravados nem interrompa a pressão para verificar repetidamente."
  },
  {
    title: "Sangramento nasal",
    subtitle: "Epistaxe",
    actions: [
      "Mantenha a criança sentada e inclinada levemente para a frente.",
      "Comprima a parte macia do nariz e mantenha a pressão contínua.",
      "Procure atendimento se o sangramento for intenso, persistente ou vier após trauma."
    ],
    avoid: "Não incline a cabeça para trás e não introduza objetos no nariz."
  },
  {
    title: "Quedas e traumas",
    subtitle: "Observe sinais de gravidade",
    actions: [
      "Verifique se a criança responde e respira normalmente.",
      "Peça ajuda e acione o 192 diante de perda de consciência, dificuldade para respirar, sangramento intenso ou suspeita de lesão grave.",
      "Mantenha a criança acompanhada e siga as orientações do atendente."
    ],
    avoid: "Não mova a criança se houver suspeita de lesão na cabeça, pescoço ou coluna, salvo risco imediato no local."
  },
  {
    title: "Reação alérgica",
    subtitle: "Reconheça sinais de gravidade",
    actions: [
      "Observe dificuldade para respirar, inchaço de língua ou rosto, desmaio ou piora rápida.",
      "Acione o SAMU pelo 192 diante de sinais graves.",
      "Siga o plano de emergência da criança e as orientações do atendente."
    ],
    avoid: "Não ofereça medicamentos sem orientação profissional ou autorização prevista no plano de cuidado."
  },
  {
    title: "Desmaio",
    subtitle: "Verifique resposta e respiração",
    actions: [
      "Ajude a criança a ficar em local seguro e verifique se responde e respira normalmente.",
      "Peça ajuda e acione o 192 se não houver recuperação rápida, se houver trauma ou dificuldade para respirar.",
      "Acompanhe a criança até a chegada de ajuda."
    ],
    avoid: "Não ofereça comida, bebida ou medicamentos enquanto a criança estiver inconsciente."
  },
  {
    title: "Acionar o socorro",
    subtitle: "SAMU 192 e Bombeiros 193",
    actions: [
      "Informe o endereço completo, o que aconteceu, a idade aproximada e o estado da criança.",
      "Mantenha a linha disponível e siga as orientações do atendente.",
      "Peça a alguém para receber a equipe na entrada."
    ],
    avoid: "Não encerre a chamada antes da orientação do atendente."
  }
];

const casos = [
  {
    title: "Engasgo durante o lanche",
    description: "Uma criança para de tossir e demonstra dificuldade para respirar. Qual é a melhor primeira atitude?",
    options: [
      "Pedir ajuda, acionar o 192 e seguir a orientação do atendente; fazer manobras apenas conforme treinamento e faixa etária.",
      "Oferecer água e esperar alguns minutos.",
      "Introduzir os dedos na boca para tentar retirar o objeto."
    ],
    answer: 0,
    explanation: "A revisão inclui engasgos entre as emergências escolares. O atendimento deve ser rápido e as manobras devem respeitar a faixa etária e o treinamento."
  },
  {
    title: "Crise convulsiva",
    description: "Uma criança cai e começa a apresentar movimentos involuntários. O que fazer?",
    options: [
      "Segurar braços e pernas para interromper os movimentos.",
      "Afastar objetos, proteger a cabeça, marcar o tempo e pedir ajuda.",
      "Colocar um objeto entre os dentes."
    ],
    answer: 1,
    explanation: "Proteja contra impactos, observe a duração e não restrinja os movimentos nem coloque objetos na boca."
  },
  {
    title: "Queimadura",
    description: "Uma criança encosta em uma superfície quente e apresenta queimadura. Qual cuidado inicial é adequado?",
    options: [
      "Aplicar gelo diretamente para resfriar rápido.",
      "Passar pasta de dente ou pomada.",
      "Afastar da fonte de calor e resfriar a área com água corrente fresca."
    ],
    answer: 2,
    explanation: "A revisão aponta queimaduras como ocorrência relevante. Água corrente fresca é preferível a gelo ou receitas caseiras."
  },
  {
    title: "Sangramento em um ferimento",
    description: "Uma criança tem um corte com sangramento. Qual é a conduta inicial mais apropriada?",
    options: [
      "Fazer pressão direta com gaze ou pano limpo e pedir ajuda.",
      "Retirar qualquer objeto preso no ferimento.",
      "Lavar e deixar o sangramento sem proteção."
    ],
    answer: 0,
    explanation: "A pressão direta ajuda a controlar sangramentos. Objetos encravados não devem ser retirados por quem presta o primeiro cuidado."
  },
  {
    title: "Sangramento nasal",
    description: "Uma criança apresenta sangramento pelo nariz após uma atividade. Como posicioná-la?",
    options: [
      "Deitada com a cabeça inclinada para trás.",
      "Sentada e inclinada levemente para a frente, comprimindo a parte macia do nariz.",
      "Com papel introduzido profundamente na narina."
    ],
    answer: 1,
    explanation: "A posição inclinada para a frente evita que o sangue seja direcionado para a garganta."
  },
  {
    title: "Queda com possível trauma",
    description: "Após uma queda, a criança relata dor intensa no pescoço. O que fazer?",
    options: [
      "Levantá-la rapidamente para testar os movimentos.",
      "Pedir que caminhe até a enfermaria.",
      "Evitar movê-la, pedir ajuda e acionar o 192."
    ],
    answer: 2,
    explanation: "Diante de suspeita de lesão grave, evite movimentar a criança e acione ajuda especializada."
  },
  {
    title: "Reação alérgica",
    description: "Uma criança apresenta inchaço no rosto e dificuldade para respirar. Qual é a prioridade?",
    options: [
      "Acionar o 192 e seguir a orientação do atendente.",
      "Esperar para ver se os sinais desaparecem.",
      "Oferecer um medicamento escolhido por um colega."
    ],
    answer: 0,
    explanation: "Dificuldade respiratória e inchaço podem indicar gravidade e exigem acionamento imediato do serviço de emergência."
  },
  {
    title: "Desmaio",
    description: "Uma criança desmaia no pátio. O que deve ser verificado primeiro?",
    options: [
      "Se consegue beber água.",
      "Se responde e respira normalmente, enquanto alguém pede ajuda.",
      "Se consegue ficar em pé sem apoio."
    ],
    answer: 1,
    explanation: "Verifique resposta e respiração. Não ofereça líquidos enquanto a criança estiver inconsciente."
  }
];

function getFirebaseUrl() {
  const saved = localStorage.getItem(CHAVE_FIREBASE);
  if (saved === "local") return "";
  return (saved || FIREBASE_DEFAULT_URL).replace(/\/+$/, "");
}

function obterRegistrosLocais() {
  const registros = JSON.parse(localStorage.getItem(CHAVE_REGISTROS) || "[]");
  if (!Array.isArray(registros)) {
    throw new Error("Os registros locais estão em um formato inválido.");
  }
  return registros;
}

function salvarRegistrosLocais(registros) {
  localStorage.setItem(CHAVE_REGISTROS, JSON.stringify(registros));
}

function novoId() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mesclarRegistros(registrosLocais, registrosRemotos) {
  const porId = new Map();
  for (const registro of [...registrosLocais, ...registrosRemotos]) {
    if (registro && typeof registro.id === "string") {
      porId.set(registro.id, registro);
    }
  }
  return [...porId.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

function sanitizarFeedbackAnonimo(feedback) {
  if (!feedback || typeof feedback !== "object") return feedback;
  return {
    ...feedback,
    uid: "anonimo",
    nome: "Anônimo",
    email: undefined,
    participanteUid: undefined
  };
}

async function buscarRegistrosRemotos() {
  const data = await window.SosFirebase.readRecords(getFirebaseUrl());
  if (data === null) return [];
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Os dados recebidos do Firebase estão em um formato inválido.");
  }
  return Object.values(data)
    .filter((registro) => registro && typeof registro.id === "string")
    .map((registro) => (registro.tipo === "feedback" ? sanitizarFeedbackAnonimo(registro) : registro));
}

async function enviarRegistroRemoto(registro) {
  const payload = registro?.tipo === "feedback" ? sanitizarFeedbackAnonimo(registro) : registro;
  await window.SosFirebase.writeRecord(getFirebaseUrl(), payload);
}

async function sincronizarRegistros() {
  const locais = obterRegistrosLocais();
  const remotos = await buscarRegistrosRemotos();
  const idsRemotos = new Set(remotos.map((registro) => registro.id));
  const uid = window.SosFirebase.currentUser()?.uid;
  if (!uid) throw new Error("É necessário entrar com uma conta Firebase para sincronizar.");
  for (const registro of locais) {
    if (!idsRemotos.has(registro.id)) {
      await enviarRegistroRemoto({ ...registro, uid: registro.uid || uid });
    }
  }
  const registros = mesclarRegistros(locais, remotos);
  salvarRegistrosLocais(registros);
  return registros;
}

async function persistirRegistro(registro) {
  const uid = window.SosFirebase.currentUser()?.uid;
  if (!uid) throw new Error("Entre com sua conta para salvar esta avaliação.");
  const registroAutenticado = registro?.tipo === "feedback"
    ? sanitizarFeedbackAnonimo(registro)
    : { ...registro, uid };
  const registros = obterRegistrosLocais();
  salvarRegistrosLocais(mesclarRegistros(registros, [registroAutenticado]));
  if (!getFirebaseUrl()) return { sincronizado: false };

  try {
    await enviarRegistroRemoto(registroAutenticado);
    return { sincronizado: true };
  } catch (error) {
    console.error("Registro salvo localmente, mas não sincronizado com o Firebase.", error);
    return { erroSincronizacao: error };
  }
}

function definirStatusSincronizacao(modo, texto) {
  const status = document.getElementById("sync-status");
  if (!status) return;
  status.className = `sync-pill ${modo === "nuvem" ? "sync-cloud" : "sync-local"}`;
  status.textContent = texto;
}

function mostrarPainelRegistros(registros) {
  const corpo = document.getElementById("records-table");
  if (corpo) {
    corpo.replaceChildren();

    for (const registro of registros) {
      const linha = document.createElement("tr");
      const valores = [
        registro.nome || "",
        registro.etapa || "",
        `${registro.acertos ?? 0}/${registro.total ?? 0}`,
        registro.confianca ? `${registro.confianca}/5` : "—"
      ];
      for (const valor of valores) {
        const celula = document.createElement("td");
        celula.textContent = valor;
        linha.append(celula);
      }
      corpo.append(linha);
    }
  }

  const notas = (etapa) => registros
    .filter((registro) => registro.etapa === etapa && registro.total > 0)
    .map((registro) => (registro.acertos / registro.total) * 100);
  const media = (valores) => valores.length
    ? `${Math.round(valores.reduce((soma, valor) => soma + valor, 0) / valores.length)}%`
    : "—";
  const confiancas = registros
    .filter((registro) => Number.isInteger(registro.confianca))
    .map((registro) => registro.confianca);
  const resumo = document.getElementById("stats-summary");
  if (!resumo) return;
  resumo.replaceChildren();
  const indicadores = [
    ["Registros", String(registros.length)],
    ["Média pré-teste", media(notas("Pré-Teste"))],
    ["Média pós-teste", media(notas("Pós-Teste"))],
    ["Confiança média", confiancas.length
      ? `${(confiancas.reduce((soma, valor) => soma + valor, 0) / confiancas.length).toFixed(1)}/5`
      : "—"]
  ];

  for (const [titulo, valor] of indicadores) {
    const item = document.createElement("div");
    item.className = "card";
    item.style.cssText = "padding:10px;margin:0;text-align:center";
    const label = document.createElement("div");
    label.className = "sub-text";
    label.style.marginBottom = "2px";
    label.textContent = titulo;
    const resultado = document.createElement("strong");
    resultado.textContent = valor;
    item.append(label, resultado);
    resumo.append(item);
  }
}

async function atualizarPainelGestao() {
  let registros;
  try {
    registros = obterRegistrosLocais();
  } catch (error) {
    console.error("Não foi possível ler os registros locais.", error);
    alert(`Não foi possível abrir os registros neste aparelho: ${error.message}`);
    return;
  }
  const base = getFirebaseUrl();
  if (base) {
    try {
      registros = await sincronizarRegistros();
      definirStatusSincronizacao("nuvem", "Sincronizado com o Firebase");
    } catch (error) {
      definirStatusSincronizacao("local", "Falha na nuvem; exibindo dados locais");
      console.error("Não foi possível carregar os registros do Firebase.", error);
      mostrarPainelRegistros(registros);
      alert(`Não foi possível sincronizar com o Firebase: ${error.message}`);
      return;
    }
  } else {
    definirStatusSincronizacao("local", "Modo local neste aparelho");
  }
  mostrarPainelRegistros(registros);
}

async function salvarConfigFirebase() {
  const campo = document.getElementById("fb-url-input");
  if (!campo) return;
  const url = campo.value.trim().replace(/\/+$/, "");
  if (!url) {
    localStorage.setItem(CHAVE_FIREBASE, "local");
    definirStatusSincronizacao("local", "Modo local neste aparelho");
    alert("URL removida. Os registros ficarão neste aparelho.");
    await atualizarPainelGestao();
    return;
  }

  let endereco;
  try {
    endereco = new URL(url);
  } catch {
    alert("Informe uma URL válida do Firebase Realtime Database.");
    return;
  }
  if (endereco.protocol !== "https:" || endereco.search || endereco.hash) {
    alert("Use a URL HTTPS do Firebase Realtime Database, sem parâmetros.");
    return;
  }

  localStorage.setItem(CHAVE_FIREBASE, url);
  try {
    await sincronizarRegistros();
    definirStatusSincronizacao("nuvem", "Sincronizado com o Firebase");
    mostrarPainelRegistros(obterRegistrosLocais());
    alert("Banco conectado e sincronizado.");
  } catch (error) {
    definirStatusSincronizacao("local", "Firebase configurado, mas indisponível");
    console.error("Falha ao conectar com o Firebase.", error);
    alert(`A URL foi salva, mas o Firebase não respondeu: ${error.message}`);
  }
}

function mostrarProtocolos() {
  const lista = document.getElementById("proto-list");
  if (!lista) return;
  lista.replaceChildren();

  protocolos.forEach((protocolo) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "proto-item";
    botao.addEventListener("click", () => mostrarDetalheProtocolo(protocolo));

    const titulo = document.createElement("span");
    titulo.className = "proto-title";
    titulo.textContent = protocolo.title;
    const subtitulo = document.createElement("span");
    subtitulo.className = "proto-sub";
    subtitulo.textContent = protocolo.subtitle;
    botao.append(titulo, subtitulo);
    lista.append(botao);
  });
}

function mostrarDetalheProtocolo(protocolo) {
  const detalhe = document.getElementById("proto-detail");
  if (!detalhe) return;
  detalhe.replaceChildren();
  detalhe.style.display = "block";

  const titulo = document.createElement("h3");
  titulo.textContent = protocolo.title;
  const descricao = document.createElement("p");
  descricao.className = "sub-text";
  descricao.textContent = protocolo.subtitle;
  const fazer = document.createElement("span");
  fazer.className = "badge-do";
  fazer.textContent = "Condutas iniciais";
  const lista = document.createElement("ul");
  lista.className = "clean";
  for (const acao of protocolo.actions) {
    const item = document.createElement("li");
    item.textContent = acao;
    lista.append(item);
  }
  const evitar = document.createElement("span");
  evitar.className = "badge-dont";
  evitar.textContent = "Evite";
  const orientacao = document.createElement("p");
  orientacao.textContent = protocolo.avoid;
  detalhe.append(titulo, descricao, fazer, lista, evitar, orientacao);
  detalhe.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function entrarFirebase(evento) {
  evento.preventDefault();
  const botao = document.getElementById("login-submit");
  const erro = document.getElementById("login-error");
  if (erro) erro.hidden = true;
  if (botao) botao.disabled = true;
  try {
    await window.SosFirebase.signIn(
      document.getElementById("auth-email").value.trim(),
      document.getElementById("auth-password").value
    );
    document.getElementById("auth-password").value = "";
  } catch (error) {
    console.error("Não foi possível entrar no Firebase Authentication.", error);
    if (erro) {
      erro.textContent = mensagemErroAutenticacao(error);
      erro.hidden = false;
    } else {
      alert(mensagemErroAutenticacao(error));
    }
  } finally {
    if (botao) botao.disabled = false;
  }
}

function mensagemErroAutenticacao(error) {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde e tente novamente.";
    case "auth/network-request-failed":
      return "Sem conexão. Verifique a rede e tente novamente.";
    case "auth/operation-not-allowed":
      return "O acesso por e-mail e senha ainda não foi habilitado no Firebase.";
    case "auth/invalid-email":
      return "Informe um e-mail válido.";
    default:
      return "Não foi possível entrar. Verifique a conta e tente novamente.";
  }
}

async function verificarAcessoInstrutor(uid) {
  return window.SosFirebase.hasInstructorAccess(getFirebaseUrl(), uid);
}

async function entrarComo(perfil) {
  const usuario = window.SosFirebase.currentUser();
  if (!usuario) {
    alert("Entre com sua conta antes de selecionar um perfil.");
    return;
  }
  if (perfil === "instrutor") {
    try {
      if (!await verificarAcessoInstrutor(usuario.uid)) {
        alert("Esta conta não está autorizada como instrutor. Solicite acesso à gestão.");
        return;
      }
    } catch (error) {
      console.error("Não foi possível verificar a autorização de instrutor.", error);
      alert(`Não foi possível verificar seu acesso: ${error.message}`);
      return;
    }
  }

  perfilAtual = perfil === "instrutor" ? "instrutor" : "instruido";
  const authScreen = document.getElementById("auth-screen");
  if (authScreen) authScreen.style.display = "none";
  const roleLabel = document.getElementById("role-label");
  if (roleLabel) {
    roleLabel.textContent = perfilAtual === "instrutor"
      ? "Perfil: Instrutor"
      : "Perfil: Instruído";
  }
  const roleBadge = document.querySelector(".role-badge");
  if (roleBadge) roleBadge.style.display = "block";
  const navGestao = document.getElementById("nav-gestao");
  if (navGestao) navGestao.style.display = perfilAtual === "instrutor" ? "flex" : "none";
  mudarAba("guia");
}

async function trocarPerfil() {
  try {
    await window.SosFirebase.signOut();
  } catch (error) {
    console.error("Não foi possível encerrar a sessão Firebase.", error);
    alert(`Não foi possível sair da conta: ${error.message}`);
  }
}

function atualizarTelaAutenticacao(usuario) {
  perfilAtual = null;
  const authScreen = document.getElementById("auth-screen");
  if (authScreen) authScreen.style.display = "flex";
  const firebaseLogin = document.getElementById("firebase-login");
  if (firebaseLogin) firebaseLogin.hidden = Boolean(usuario);
  const profileSelect = document.getElementById("profile-select");
  if (profileSelect) profileSelect.hidden = !usuario;
  const navGestao = document.getElementById("nav-gestao");
  if (navGestao) navGestao.style.display = "none";
  const roleBadge = document.querySelector(".role-badge");
  if (roleBadge) roleBadge.style.display = "none";
}

function mudarAba(aba) {
  if (aba === "gestao" && perfilAtual !== "instrutor") {
    alert("A área do instrutor exige acesso pelo perfil de instrutor.");
    return;
  }
  const secao = document.getElementById(`tab-${aba}`);
  if (!secao) {
    console.error(`A aba "${aba}" não existe.`);
    return;
  }
  document.querySelectorAll(".section").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((item) => {
    item.classList.remove("active");
    item.removeAttribute("aria-current");
  });
  secao.classList.add("active");
  const botaoNav = document.getElementById(`nav-${aba}`);
  botaoNav?.classList.add("active");
  botaoNav?.setAttribute("aria-current", "page");
  if (aba === "gestao") void atualizarPainelGestao();
}

function selecionarConfianca(nivel, botao) {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) return;
  confiancaAtual = nivel;
  document.querySelectorAll(".likert-btn").forEach((item) => {
    item.classList.remove("selected");
    item.setAttribute("aria-pressed", "false");
  });
  botao.classList.add("selected");
  botao.setAttribute("aria-pressed", "true");
}

function iniciarSimulacao() {
  const nome = document.getElementById("p-nome").value.trim();
  if (!nome) {
    alert("Informe o nome do participante para iniciar a avaliação.");
    document.getElementById("p-nome").focus();
    return;
  }

  estadoQuiz = {
    indice: 0,
    acertos: 0,
    nome,
    cargo: document.getElementById("p-cargo").value,
    etapa: document.getElementById("p-etapa").value,
    confianca: confiancaAtual
  };
  document.getElementById("reg-form").style.display = "none";
  document.getElementById("result-area").style.display = "none";
  document.getElementById("quiz-area").style.display = "block";
  renderizarCaso();
}

function renderizarCaso() {
  const caso = casos[estadoQuiz.indice];
  document.getElementById("q-progress").textContent = `Caso ${estadoQuiz.indice + 1} de ${casos.length}`;
  document.getElementById("q-score").textContent = `Acertos: ${estadoQuiz.acertos}`;
  document.getElementById("q-title").textContent = caso.title;
  document.getElementById("q-desc").textContent = caso.description;
  const opcoes = document.getElementById("q-options");
  opcoes.replaceChildren();
  document.getElementById("q-feedback").style.display = "none";
  document.getElementById("q-next").style.display = "none";

  caso.options.forEach((texto, indice) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "opt-btn";
    botao.textContent = texto;
    botao.addEventListener("click", () => responderCaso(indice));
    opcoes.append(botao);
  });
}

function responderCaso(indiceResposta) {
  const caso = casos[estadoQuiz.indice];
  if (caso.respondido) return;
  caso.respondido = true;
  const acertou = indiceResposta === caso.answer;
  if (acertou) estadoQuiz.acertos += 1;

  const botoes = document.querySelectorAll("#q-options .opt-btn");
  botoes.forEach((botao, indice) => {
    botao.disabled = true;
    if (indice === caso.answer) botao.classList.add("correct");
    else if (indice === indiceResposta) botao.classList.add("wrong");
  });
  const feedback = document.getElementById("q-feedback");
  feedback.className = "feedback-box";
  feedback.style.display = "block";
  feedback.style.background = acertou ? "#DCFCE7" : "#FEF2F2";
  feedback.textContent = `${acertou ? "Resposta adequada." : "Revise a resposta."} ${caso.explanation}`;
  document.getElementById("q-score").textContent = `Acertos: ${estadoQuiz.acertos}`;
  const proximo = document.getElementById("q-next");
  proximo.textContent = estadoQuiz.indice === casos.length - 1 ? "Ver resultado" : "Próximo caso";
  proximo.style.display = "block";
}

async function proximoCaso() {
  casos[estadoQuiz.indice].respondido = false;
  if (estadoQuiz.indice < casos.length - 1) {
    estadoQuiz.indice += 1;
    renderizarCaso();
    return;
  }
  await finalizarSimulacao();
}

async function finalizarSimulacao() {
  const registro = {
    id: novoId(),
    tipo: "questionario",
    nome: estadoQuiz.nome,
    cargo: estadoQuiz.cargo,
    etapa: estadoQuiz.etapa,
    acertos: estadoQuiz.acertos,
    total: casos.length,
    confianca: estadoQuiz.confianca,
    criadoEm: new Date().toISOString()
  };
  let resultado;
  try {
    resultado = await persistirRegistro(registro);
  } catch (error) {
    console.error("Não foi possível salvar o resultado.", error);
    alert(`Não foi possível salvar o resultado neste aparelho: ${error.message}`);
    return;
  }
  const percentual = Math.round((registro.acertos / registro.total) * 100);
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("result-area").style.display = "block";
  document.getElementById("cert-content").textContent =
    `${registro.nome} — ${registro.etapa}. Resultado: ${registro.acertos}/${registro.total} (${percentual}%). Autoconfiança: ${registro.confianca}/5. ` +
    (resultado.sincronizado ? "Registro sincronizado." : "Registro salvo neste aparelho.");
  if (resultado.erroSincronizacao) {
    alert(`O registro foi salvo neste aparelho, mas a nuvem não respondeu: ${resultado.erroSincronizacao.message}`);
  }
}

function reiniciarTreino() {
  estadoQuiz = null;
  casos.forEach((caso) => { caso.respondido = false; });
  document.getElementById("p-nome").value = "";
  document.getElementById("reg-form").style.display = "block";
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("result-area").style.display = "none";
  document.getElementById("p-nome").focus();
}

async function salvarChecklist() {
  const nome = document.getElementById("chk-nome").value.trim();
  if (!nome) {
    alert("Informe o nome do participante avaliado.");
    document.getElementById("chk-nome").focus();
    return;
  }

  const itens = [...document.querySelectorAll(".prac-chk")];
  const marcados = itens.filter((item) => item.checked).length;
  const notaCalculada = itens.length > 0 ? Number(((marcados / itens.length) * 10).toFixed(1)) : 0;
  const registro = {
    id: novoId(),
    tipo: "pratica",
    nome,
    cargo: "Comunidade escolar",
    etapa: "Prática",
    acertos: marcados,
    total: itens.length,
    nota: notaCalculada,
    observacao: "",
    checklistTipo: "profissional-saude",
    checklistItens: itens.map((item) => item.parentElement?.textContent?.trim() || ""),
    confianca: null,
    checklist: itens.map((item) => item.checked),
    criadoEm: new Date().toISOString()
  };
  let resultado;
  try {
    resultado = await persistirRegistro(registro);
  } catch (error) {
    console.error("Não foi possível salvar a avaliação prática.", error);
    alert(`Não foi possível salvar a avaliação neste aparelho: ${error.message}`);
    return;
  }
  document.getElementById("chk-nome").value = "";
  itens.forEach((item) => { item.checked = false; });
  if (resultado.erroSincronizacao) {
    definirStatusSincronizacao("local", "Falha na nuvem; avaliação salva neste aparelho");
    mostrarPainelRegistros(obterRegistrosLocais());
  } else {
    await atualizarPainelGestao();
  }
  alert(resultado.erroSincronizacao
    ? `Avaliação salva neste aparelho. A nuvem não respondeu: ${resultado.erroSincronizacao.message}`
    : resultado.sincronizado
      ? "Avaliação prática salva e sincronizada."
      : "Avaliação prática salva neste aparelho.");
}

function exportarCSV() {
  const registros = obterRegistrosLocais();
  if (registros.length === 0) {
    alert("Ainda não há registros para exportar.");
    return;
  }

  const colunas = ["Nome", "Cargo", "Tipo", "Etapa", "Acertos", "Total", "Autoconfiança", "Data"];
  const linhas = registros.map((registro) => [
    registro.nome,
    registro.cargo,
    registro.tipo,
    registro.etapa,
    registro.acertos,
    registro.total,
    registro.confianca ?? "",
    new Date(registro.criadoEm).toLocaleString("pt-BR")
  ]);
  const csv = [colunas, ...linhas]
    .map((linha) => linha.map((valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");
  const arquivo = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = "registros-sos-escola.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function ligarEmergencia(numero) {
  if (numero !== "192" && numero !== "193") {
    throw new Error("Número de emergência não permitido.");
  }

  const capacitor = window.Capacitor;
  if (capacitor?.isNativePlatform?.()) {
    const callNumber = capacitor.Plugins?.CallNumber
      ?? capacitor.registerPlugin?.("CallNumber");
    if (callNumber?.call) {
      try {
        await callNumber.call({ number: numero, bypassAppChooser: true });
        return;
      } catch (error) {
        console.error("Não foi possível abrir o discador nativo; usando o link tel:.", error);
      }
    }
  }
  window.location.href = `tel:${numero}`;
}

function simularLigacaoEmergencia(numero) {
  if (numero !== "192" && numero !== "193") {
    throw new Error("Número de emergência não permitido.");
  }
  const demo = document.getElementById("call-demo");
  const title = document.getElementById("call-demo-title");
  const status = document.getElementById("call-demo-status");
  const duracao = document.getElementById("call-demo-duration");
  const acao = document.getElementById("call-demo-action-label");
  const botaoAcao = document.getElementById("call-demo-action");
  if (!demo || !title || !status || !duracao || !acao || !botaoAcao) return;
  focoAnteriorSimulacao = document.activeElement;
  limparTimersSimulacao();
  title.textContent = numero === "192" ? "SAMU 192" : "Bombeiros 193";
  status.textContent = "Chamando…";
  duracao.textContent = "00:00";
  acao.textContent = "Encerrar simulação";
  botaoAcao.setAttribute("aria-label", "Encerrar simulação");
  simulacaoInicio = null;
  demo.hidden = false;
  demo.classList.remove("is-connected", "is-ended");
  demo.classList.add("is-ringing");
  botaoAcao.focus();
  simulacaoLigacaoTimer = window.setTimeout(() => {
    if (demo.hidden) return;
    demo.classList.remove("is-ringing");
    demo.classList.add("is-connected");
    status.textContent = "Chamada simulada em andamento";
    simulacaoInicio = Date.now();
    atualizarDuracaoSimulacao();
    simulacaoDuracaoTimer = window.setInterval(atualizarDuracaoSimulacao, 1000);
  }, 1200);
}

function atualizarDuracaoSimulacao() {
  if (!simulacaoInicio) return;
  const duracaoEl = document.getElementById("call-demo-duration");
  if (!duracaoEl) return;
  const totalSegundos = Math.floor((Date.now() - simulacaoInicio) / 1000);
  const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
  const segundos = String(totalSegundos % 60).padStart(2, "0");
  duracaoEl.textContent = `${minutos}:${segundos}`;
}

function limparTimersSimulacao() {
  window.clearTimeout(simulacaoLigacaoTimer);
  window.clearInterval(simulacaoDuracaoTimer);
}

function encerrarSimulacaoLigacao() {
  const demo = document.getElementById("call-demo");
  if (!demo) return;
  if (demo.classList.contains("is-ended")) {
    fecharSimulacaoLigacao();
    return;
  }
  limparTimersSimulacao();
  demo.classList.remove("is-ringing", "is-connected");
  demo.classList.add("is-ended");
  const statusEl = document.getElementById("call-demo-status");
  if (statusEl) statusEl.textContent = "Chamada simulada encerrada";
  const labelEl = document.getElementById("call-demo-action-label");
  if (labelEl) labelEl.textContent = "Fechar simulação";
  const actionEl = document.getElementById("call-demo-action");
  if (actionEl) actionEl.setAttribute("aria-label", "Fechar simulação");
}

function fecharSimulacaoLigacao() {
  limparTimersSimulacao();
  const demo = document.getElementById("call-demo");
  if (demo) {
    demo.classList.remove("is-ringing", "is-connected", "is-ended");
    demo.hidden = true;
  }
  if (focoAnteriorSimulacao?.isConnected) focoAnteriorSimulacao.focus();
  focoAnteriorSimulacao = null;
}

function inicializarAplicativo() {
  mostrarProtocolos();

  const fbUrlInput = document.getElementById("fb-url-input");
  if (fbUrlInput && typeof getFirebaseUrl === "function") {
    fbUrlInput.value = getFirebaseUrl();
  }

  if (window.SosFirebase && typeof window.SosFirebase.onAuthStateChanged === "function") {
    window.SosFirebase.onAuthStateChanged(
      atualizarTelaAutenticacao,
      (error) => {
        console.error("Não foi possível verificar a sessão Firebase.", error);
        const aviso = document.getElementById("login-error");
        if (aviso) {
          aviso.textContent = "Não foi possível verificar a sessão. Recarregue a página.";
          aviso.hidden = false;
        }
      }
    );
  }

  document.querySelectorAll(".likert-btn").forEach((botao, indice) => {
    botao.classList.toggle("selected", indice === confiancaAtual - 1);
  });

  window.addEventListener("keydown", (evento) => {
    const demo = document.getElementById("call-demo");
    if (!demo || demo.hidden) return;
    if (evento.key === "Escape") {
      evento.preventDefault();
      fecharSimulacaoLigacao();
      return;
    }
    if (evento.key === "Tab") {
      evento.preventDefault();
      const acaoDemo = document.getElementById("call-demo-action");
      if (acaoDemo) acaoDemo.focus();
    }
  });
}

inicializarAplicativo();