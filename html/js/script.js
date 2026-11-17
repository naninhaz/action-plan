
const FIREBASE_DEFAULT_URL = "https://sos-escola-a6ccb-default-rtdb.firebaseio.com";
let perfilAtual = null;
let confiancaAtual = 3;
let simulacaoLigacaoTimer;
let simulacaoDuracaoTimer;
let simulacaoInicio;
let focoAnteriorSimulacao = null;
let estadoQuiz = null;
let perfilContaAtual = null;
let instrutorAutorizadoAtual = false;
let classificacaoInstrutorPendente = false;
let perfisParticipantes = [];
let registrosGestao = [];
let feedbackInstrutorRecebido = [];
let carregamentoAutenticacaoId = 0;
let registroEmAndamento = false;
let participanteAvaliacaoAtual = "";
let cancelarObservacaoPerfis = null;
let cancelarObservacaoRegistros = null;
let versaoObservacaoGestao = 0;

const CHAVE_REGISTROS = "sos_escola_records";
const CHECKLISTS_INSTRUTOR = {
  "profissional-saude": [
    "Reconhece sinais de gravidade e aciona o SAMU (192) corretamente.",
    "Demonstra a conduta de desobstrução conforme treinamento e faixa etária.",
    "Protege a criança durante uma crise convulsiva e observa sinais de gravidade.",
    "Controla sangramentos com pressão direta e posiciona corretamente na epistaxe.",
    "Resfria queimaduras com água corrente, sem aplicar substâncias."
  ],
  "profissional-seguranca-resgate": [
    "Avalia a cena e identifica riscos antes de se aproximar da vítima.",
    "Sinaliza ou isola a área para evitar novos acidentes e proteger as pessoas.",
    "Aciona o serviço adequado (SAMU 192 ou Bombeiros 193) sem demora.",
    "Comunica endereço, riscos e situação da vítima com clareza ao atendimento.",
    "Orienta a chegada da equipe e evita movimentar a vítima quando houver suspeita de trauma grave."
  ]
};

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
    categoria: "Engasgo e vias aéreas",
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
    categoria: "Convulsões",
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
    categoria: "Queimaduras",
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
    categoria: "Ferimentos e sangramentos",
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
    categoria: "Ferimentos e sangramentos",
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
    categoria: "Quedas e traumas",
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
    categoria: "Reações alérgicas",
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
    categoria: "Desmaio e perda de consciência",
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
  return FIREBASE_DEFAULT_URL;
}

function obterRegistrosLocais() {
  let registros;
  try {
    registros = JSON.parse(localStorage.getItem(CHAVE_REGISTROS) || "[]");
  } catch (error) {
    throw new Error("O histórico salvo neste aparelho está inválido. Os dados não foram apagados.", {
      cause: error
    });
  }
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

async function buscarRegistrosRemotos() {
  const data = await window.SosFirebase.readRecords(getFirebaseUrl());
  return normalizarRegistrosRemotos(data);
}

function normalizarRegistrosRemotos(data) {
  if (data === null) return [];
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Os dados recebidos do Firebase estão em um formato inválido.");
  }
  return Object.values(data).filter((registro) => registro && typeof registro.id === "string");
}

function registrosRecentesDoUsuario(registros, uid, limite = 5) {
  const porId = new Map();
  for (const registro of registros) {
    if (
      registro &&
      ["questionario", "pratica"].includes(registro.tipo) &&
      (registro.uid === uid || registro.participanteUid === uid) &&
      typeof registro.id === "string"
    ) {
      porId.set(registro.id, registro);
    }
  }
  return [...porId.values()]
    .sort((a, b) => {
      const dataA = Date.parse(a.criadoEm);
      const dataB = Date.parse(b.criadoEm);
      if (Number.isNaN(dataA)) return Number.isNaN(dataB) ? 0 : 1;
      if (Number.isNaN(dataB)) return -1;
      return dataB - dataA;
    })
    .slice(0, limite);
}

async function enviarRegistroRemoto(registro) {
  await window.SosFirebase.writeRecord(getFirebaseUrl(), registro);
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
  const registroAutenticado = { ...registro, uid };
  const registros = obterRegistrosLocais();
  salvarRegistrosLocais(mesclarRegistros(registros, [registroAutenticado]));

  try {
    await enviarRegistroRemoto(registroAutenticado);
    return { sincronizado: true };
  } catch (error) {
    console.error("Registro salvo localmente, mas não sincronizado com o Firebase.", error);
    return { erroSincronizacao: error };
  }
}

function mostrarPainelRegistros(registros) {
  const corpo = document.getElementById("records-table");
  corpo.replaceChildren();

  for (const registro of registros) {
    const linha = document.createElement("tr");
    const valores = [
      registro.nome || "",
      registro.etapa || "",
      Number.isFinite(registro.nota)
        ? `${registro.nota}/10`
        : `${registro.acertos ?? 0}/${registro.total ?? 0}`,
      registro.confianca ? `${registro.confianca}/5` : "—"
    ];
    for (const valor of valores) {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.append(celula);
    }
    corpo.append(linha);
  }

  mostrarMetricasGestao(registros);
  mostrarFeedbacksRecebidos();
}

function mostrarFeedbacksRecebidos() {
  const container = document.getElementById("instructor-feedback-results");
  if (!container) return;
  container.replaceChildren();
  if (!feedbackInstrutorRecebido.length) {
    container.textContent = "Você ainda não recebeu avaliações da capacitação.";
    return;
  }

  const feedbacks = [...feedbackInstrutorRecebido]
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  for (const feedback of feedbacks) {
    const cartao = document.createElement("article");
    cartao.className = "profile-test-card";
    const titulo = document.createElement("h5");
    titulo.textContent = `${formatarDataRegistro(feedback)} · ${feedback.nome || "Participante"}`;
    const notas = document.createElement("p");
    notas.textContent =
      `Atuação: ${feedback.notaInstrutor}/5 · Capacitação: ${feedback.notaCapacitacao}/5`;
    const comentario = document.createElement("p");
    comentario.textContent = feedback.feedback;
    cartao.append(titulo, notas, comentario);
    container.append(cartao);
  }
}

function mostrarMetricasGestao(registros) {
  const questionarios = registros.filter((registro) =>
    registro.tipo === "questionario" &&
    Number.isInteger(registro.acertos) &&
    Number.isInteger(registro.total) &&
    registro.acertos >= 0 &&
    registro.total > 0 &&
    registro.acertos <= registro.total
  );
  const praticas = registros.filter((registro) =>
    registro.tipo === "pratica" && Array.isArray(registro.checklist)
  );
  const confiancas = questionarios
    .map((registro) => registro.confianca)
    .filter((confianca) => Number.isInteger(confianca) && confianca >= 1 && confianca <= 5);
  const totalQuestoes = questionarios.reduce((soma, registro) => soma + registro.total, 0);
  const totalAcertos = questionarios.reduce((soma, registro) => soma + registro.acertos, 0);
  const notasPraticas = praticas
    .map((registro) => registro.nota)
    .filter((nota) => Number.isFinite(nota) && nota >= 0 && nota <= 10);
  const resumo = document.getElementById("stats-summary");
  resumo.replaceChildren();
  const indicadores = [
    ["Contas cadastradas", String(perfisParticipantes.length)],
    ["Questionários respondidos", String(questionarios.length)],
    ["Avaliações práticas", String(praticas.length)],
    ["Nota prática média", notasPraticas.length
      ? `${(notasPraticas.reduce((soma, nota) => soma + nota, 0) / notasPraticas.length).toFixed(1)}/10`
      : "—"],
    ["Média geral de acertos", totalQuestoes
      ? `${Math.round(totalAcertos / totalQuestoes * 100)}%`
      : "—"],
    ["Autoconfiança média", confiancas.length
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

  mostrarBarras("chart-signups", dadosCadastrosPorMes(perfisParticipantes));
  mostrarBarras("chart-quiz-scores", dadosAcertosPorEtapa(questionarios), 100);
  mostrarBarras("chart-role-scores", dadosAcertosPorCargo(questionarios), 100);
  mostrarBarras(
    "chart-topics-pre",
    dadosAcertosPorCategoria(questionarios, "Pré-Teste"),
    100
  );
  mostrarBarras(
    "chart-topics-post",
    dadosAcertosPorCategoria(questionarios, "Pós-Teste"),
    100
  );
  mostrarBarras("chart-checklist", dadosChecklist(praticas), 100);
}

function dadosCadastrosPorMes(perfis) {
  const agora = new Date();
  const meses = [];
  let cadastrosComData = 0;
  for (let deslocamento = 5; deslocamento >= 0; deslocamento -= 1) {
    const data = new Date(agora.getFullYear(), agora.getMonth() - deslocamento, 1);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    meses.push({
      chave,
      rotulo: data.toLocaleDateString("pt-BR", { month: "short" }),
      valor: 0
    });
  }
  const porChave = new Map(meses.map((mes) => [mes.chave, mes]));

  for (const perfil of perfis) {
    const data = new Date(perfil.criadoEm);
    if (Number.isNaN(data.getTime())) continue;
    cadastrosComData += 1;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    const mes = porChave.get(chave);
    if (mes) mes.valor += 1;
  }

  if (!cadastrosComData) return [];
  const maior = Math.max(1, ...meses.map((mes) => mes.valor));
  return meses.map((mes) => ({
    rotulo: mes.rotulo,
    valor: mes.valor,
    escala: maior,
    exibicao: String(mes.valor)
  }));
}

function dadosAcertosPorEtapa(questionarios) {
  return ["Pré-Teste", "Pós-Teste"].flatMap((etapa) => {
    const registros = questionarios.filter((registro) => registro.etapa === etapa);
    const total = registros.reduce((soma, registro) => soma + registro.total, 0);
    if (!total) return [];
    const acertos = registros.reduce((soma, registro) => soma + registro.acertos, 0);
    const percentual = Math.round(acertos / total * 100);
    return [{
      rotulo: etapa,
      valor: percentual,
      exibicao: `${percentual}% (${registros.length})`
    }];
  });
}

function dadosAcertosPorCargo(questionarios) {
  const grupos = new Map();
  for (const registro of questionarios) {
    const cargo = typeof registro.cargo === "string" && registro.cargo.trim()
      ? registro.cargo.trim()
      : "Função não informada";
    const grupo = grupos.get(cargo) || { acertos: 0, total: 0, questionarios: 0 };
    grupo.acertos += registro.acertos;
    grupo.total += registro.total;
    grupo.questionarios += 1;
    grupos.set(cargo, grupo);
  }

  return [...grupos.entries()]
    .sort(([cargoA], [cargoB]) => cargoA.localeCompare(cargoB, "pt-BR"))
    .map(([cargo, grupo]) => {
      const percentual = Math.round(grupo.acertos / grupo.total * 100);
      return {
        rotulo: cargo,
        valor: percentual,
        exibicao: `${percentual}% · ${grupo.questionarios} questionário(s)`
      };
    });
}

function dadosAcertosPorCategoria(questionarios, etapa) {
  const categorias = [...new Set(casos.map((caso) => caso.categoria))];
  const categoriasValidas = new Set(categorias);
  const categoriaPorCaso = new Map(casos.map((caso) => [caso.title, caso.categoria]));
  const grupos = new Map();

  for (const registro of questionarios) {
    if (registro.etapa !== etapa || !Array.isArray(registro.respostas)) continue;
    for (const resposta of registro.respostas) {
      if (!resposta || typeof resposta !== "object" || typeof resposta.correta !== "boolean") {
        continue;
      }
      const categoria = categoriaPorCaso.get(resposta.caso) || resposta.categoria;
      if (!categoriasValidas.has(categoria)) continue;
      const grupo = grupos.get(categoria) || { acertos: 0, total: 0 };
      grupo.acertos += Number(resposta.correta);
      grupo.total += 1;
      grupos.set(categoria, grupo);
    }
  }

  return categorias.flatMap((categoria) => {
    const grupo = grupos.get(categoria);
    if (!grupo) return [];
    const percentual = Math.round(grupo.acertos / grupo.total * 100);
    return [{
      rotulo: categoria,
      valor: percentual,
      exibicao: `${percentual}% · ${grupo.acertos}/${grupo.total}`
    }];
  });
}

function dadosChecklist(praticas) {
  const grupos = new Map();
  for (const registro of praticas) {
    if (!Array.isArray(registro.checklist)) continue;
    const nomes = Array.isArray(registro.checklistItens)
      ? registro.checklistItens
      : CHECKLISTS_INSTRUTOR["profissional-saude"];
    registro.checklist.forEach((realizado, indice) => {
      const rotulo = nomes[indice];
      if (typeof realizado !== "boolean" || typeof rotulo !== "string") return;
      const grupo = grupos.get(rotulo) || { realizados: 0, total: 0 };
      grupo.realizados += Number(realizado);
      grupo.total += 1;
      grupos.set(rotulo, grupo);
    });
  }
  return [...grupos.entries()].map(([rotulo, grupo]) => {
    const { realizados, total } = grupo;
    const percentual = Math.round(realizados / total * 100);
    return {
      rotulo,
      valor: percentual,
      exibicao: `${percentual}% · ${realizados}/${total}`
    };
  });
}

function dadosRespostasIndividuais(questionario) {
  if (!Array.isArray(questionario.respostas)) return [];
  return questionario.respostas.flatMap((resposta, indice) => {
    if (!resposta || typeof resposta !== "object" || typeof resposta.correta !== "boolean") {
      return [];
    }
    const escolha = typeof resposta.respostaEscolhida === "string"
      ? resposta.respostaEscolhida
      : "Resposta indisponível";
    return [{
      rotulo: typeof resposta.caso === "string" ? resposta.caso : `Questão ${indice + 1}`,
      valor: resposta.correta ? 100 : 0,
      exibicao: resposta.correta ? "Correta" : "Rever",
      estado: resposta.correta ? "correta" : "incorreta",
      detalhe: `Resposta escolhida: ${escolha}`
    }];
  });
}

function mostrarBarras(id, dados, escalaFixa = null) {
  const container = document.getElementById(id);
  mostrarBarrasNoElemento(container, dados, escalaFixa);
}

function mostrarBarrasNoElemento(container, dados, escalaFixa = null) {
  container.replaceChildren();
  if (!dados.length) {
    const vazio = document.createElement("p");
    vazio.className = "chart-empty";
    vazio.textContent = "Os dados aparecerão aqui após os primeiros registros.";
    container.append(vazio);
    return;
  }

  for (const dado of dados) {
    const escala = escalaFixa || dado.escala || Math.max(1, ...dados.map((item) => item.valor));
    const linha = document.createElement("div");
    linha.className = "chart-row";
    if (dado.estado === "incorreta") linha.classList.add("chart-row-incorrect");
    const rotulo = document.createElement("span");
    rotulo.className = "chart-label";
    rotulo.textContent = dado.rotulo;
    if (dado.detalhe) rotulo.title = dado.detalhe;
    const trilho = document.createElement("div");
    trilho.className = "chart-track";
    trilho.setAttribute("role", "progressbar");
    trilho.setAttribute("aria-label", dado.detalhe
      ? `${dado.rotulo}. ${dado.detalhe}`
      : dado.rotulo);
    trilho.setAttribute("aria-valuemin", "0");
    trilho.setAttribute("aria-valuemax", String(escala));
    trilho.setAttribute("aria-valuenow", String(dado.valor));
    const preenchimento = document.createElement("div");
    preenchimento.className = "chart-fill";
    preenchimento.style.width = `${Math.max(0, Math.min(100, dado.valor / escala * 100))}%`;
    trilho.append(preenchimento);
    const valor = document.createElement("strong");
    valor.className = "chart-value";
    valor.textContent = dado.exibicao;
    linha.append(rotulo, trilho, valor);
    if (dado.detalhe) {
      const detalhe = document.createElement("span");
      detalhe.className = "chart-detail";
      detalhe.textContent = dado.detalhe;
      linha.append(detalhe);
    }
    container.append(linha);
  }
}

async function atualizarPainelGestao() {
  pararObservacaoGestao();
  const versao = versaoObservacaoGestao;
  const participanteSelecionado = document.getElementById("checklist-participant").value;
  let registros;
  let perfis;
  let feedbacks;
  try {
    [registros, perfis, feedbacks] = await Promise.all([
      sincronizarRegistros(),
      buscarPerfisRemotos(),
      window.SosFirebase.readMyInstructorFeedback()
    ]);
  } catch (error) {
    if (versao !== versaoObservacaoGestao || perfilAtual !== "instrutor") return;
    console.error("Não foi possível carregar os dados do Firebase.", error);
    alert(`Não foi possível carregar os dados sincronizados: ${error.message}`);
    return;
  }
  if (
    versao !== versaoObservacaoGestao ||
    perfilAtual !== "instrutor" ||
    !["tab-gestao", "tab-metricas"].some((id) =>
      document.getElementById(id).classList.contains("active")
    )
  ) return;
  registrosGestao = registros;
  perfisParticipantes = perfis;
  feedbackInstrutorRecebido = normalizarRegistrosRemotos(feedbacks);
  mostrarPainelRegistros(registros);
  mostrarListaParticipantes(participanteSelecionado);
  mostrarListaPerfisMetricas();
  observarAtualizacoesGestao();
}

function pararObservacaoGestao() {
  versaoObservacaoGestao += 1;
  cancelarObservacaoPerfis?.();
  cancelarObservacaoRegistros?.();
  cancelarObservacaoPerfis = null;
  cancelarObservacaoRegistros = null;
}

function observarAtualizacoesGestao() {
  pararObservacaoGestao();
  const versao = versaoObservacaoGestao;
  let erroExibido = false;
  const renderizar = () => {
    if (versao !== versaoObservacaoGestao) return;
    const participanteSelecionado = document.getElementById("checklist-participant").value;
    mostrarPainelRegistros(registrosGestao);
    mostrarListaParticipantes(participanteSelecionado);
    mostrarListaPerfisMetricas();
  };
  const informarErro = (descricao, error) => {
    if (versao !== versaoObservacaoGestao || erroExibido) return;
    erroExibido = true;
    console.error(descricao, error);
    alert(`${descricao} ${error.message}`);
  };

  try {
    cancelarObservacaoPerfis = window.SosFirebase.subscribeToProfiles(
      getFirebaseUrl(),
      (data) => {
        if (versao !== versaoObservacaoGestao) return;
        try {
          perfisParticipantes = normalizarPerfisRemotos(data);
          renderizar();
        } catch (error) {
          informarErro("Não foi possível atualizar as contas cadastradas.", error);
        }
      },
      (error) => informarErro("Não foi possível acompanhar as contas cadastradas.", error)
    );
    cancelarObservacaoRegistros = window.SosFirebase.subscribeToRecords(
      getFirebaseUrl(),
      (data) => {
        if (versao !== versaoObservacaoGestao) return;
        try {
          registrosGestao = mesclarRegistros(
            obterRegistrosLocais(),
            normalizarRegistrosRemotos(data)
          );
          salvarRegistrosLocais(registrosGestao);
          renderizar();
        } catch (error) {
          informarErro("Não foi possível atualizar os questionários e avaliações.", error);
        }
      },
      (error) => informarErro("Não foi possível acompanhar questionários e avaliações.", error)
    );
  } catch (error) {
    informarErro("Não foi possível ativar a atualização automática dos indicadores.", error);
    pararObservacaoGestao();
  }
}

async function buscarPerfisRemotos() {
  const data = await window.SosFirebase.readProfiles(getFirebaseUrl());
  return normalizarPerfisRemotos(data);
}

function normalizarPerfisRemotos(data) {
  if (data === null) return [];
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Os perfis recebidos do Firebase estão em um formato inválido.");
  }
  return Object.entries(data)
    .filter(([, perfil]) =>
      perfil && typeof perfil.nome === "string" && perfil.perfil !== "instrutor"
    )
    .map(([uid, perfil]) => ({
      uid,
      nome: perfil.nome,
      cargo: typeof perfil.cargo === "string" ? perfil.cargo : "",
      email: typeof perfil.email === "string" ? perfil.email : "",
      perfil: typeof perfil.perfil === "string" ? perfil.perfil : "",
      criadoEm: typeof perfil.criadoEm === "string" ? perfil.criadoEm : "",
      profissaoInstrutor: typeof perfil.profissaoInstrutor === "string"
        ? perfil.profissaoInstrutor
        : "",
      temFoto: perfil.temFoto === true || typeof perfil.foto === "string"
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function mostrarListaParticipantes(uidAtual = "") {
  const select = document.getElementById("checklist-participant");
  const vazio = document.getElementById("participants-empty");
  select.replaceChildren();

  const primeiraOpcao = document.createElement("option");
  primeiraOpcao.value = "";
  primeiraOpcao.textContent = perfisParticipantes.length
    ? "Selecione uma pessoa"
    : "Nenhum perfil cadastrado";
  select.append(primeiraOpcao);

  for (const perfil of perfisParticipantes) {
    const opcao = document.createElement("option");
    opcao.value = perfil.uid;
    opcao.textContent = `${perfil.nome} — ${perfil.cargo || "Função não informada"}`;
    select.append(opcao);
  }

  select.disabled = perfisParticipantes.length === 0;
  vazio.hidden = perfisParticipantes.length > 0;
  vazio.textContent = "Ainda não há perfis cadastrados. Eles aparecerão aqui após a criação de uma conta.";
  if (uidAtual && perfisParticipantes.some((perfil) => perfil.uid === uidAtual)) {
    select.value = uidAtual;
  }
  selecionarParticipanteAvaliacao();
}

function mostrarListaPerfisMetricas(uidAtual = document.getElementById("metric-profile-participant").value) {
  const select = document.getElementById("metric-profile-participant");
  select.replaceChildren();

  const primeiraOpcao = document.createElement("option");
  primeiraOpcao.value = "";
  primeiraOpcao.textContent = perfisParticipantes.length
    ? "Selecione um participante"
    : "Nenhum perfil cadastrado";
  select.append(primeiraOpcao);

  for (const perfil of perfisParticipantes) {
    const opcao = document.createElement("option");
    opcao.value = perfil.uid;
    opcao.textContent = `${perfil.nome} — ${perfil.cargo || "Função não informada"}`;
    select.append(opcao);
  }

  select.disabled = perfisParticipantes.length === 0;
  if (uidAtual && perfisParticipantes.some((perfil) => perfil.uid === uidAtual)) {
    select.value = uidAtual;
  }
  selecionarPerfilMetricas();
}

function selecionarPerfilMetricas() {
  const uid = document.getElementById("metric-profile-participant").value;
  const perfil = perfisParticipantes.find((item) => item.uid === uid);
  const conteudo = document.getElementById("metric-profile-content");
  const vazio = document.getElementById("metric-profile-empty");
  const graficos = document.getElementById("metric-profile-charts");
  graficos.replaceChildren();
  conteudo.hidden = !perfil;

  if (!perfil) {
    vazio.textContent = perfisParticipantes.length
      ? "Selecione um participante para consultar as respostas."
      : "Ainda não há perfis cadastrados.";
    return;
  }

  document.getElementById("metric-profile-name").textContent = perfil.nome;
  document.getElementById("metric-profile-details").textContent =
    [perfil.cargo, rotuloProfissaoInstrutor(perfil.profissaoInstrutor), perfil.email]
      .filter(Boolean)
      .join(" · ");
  void mostrarFotoParticipante(
    perfil,
    "metric-profile-avatar",
    "metric-profile-avatar-fallback",
    "metric-profile-participant"
  );
  const avaliacoes = document.getElementById("metric-profile-evaluations");
  mostrarAvaliacoesPraticas(uid, avaliacoes);

  const questionarios = registrosGestao
    .filter((registro) =>
      registro.tipo === "questionario" &&
      (registro.participanteUid === uid || registro.uid === uid)
    )
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  if (questionarios.length === 0) {
    vazio.textContent = "Ainda não há questionários registrados para esta pessoa.";
    return;
  }

  vazio.textContent = "";
  questionarios.forEach((questionario) => {
    const cartao = document.createElement("section");
    cartao.className = "chart-card";
    const titulo = document.createElement("h4");
    titulo.textContent =
      `${questionario.etapa || "Questionário"} · ${formatarDataRegistro(questionario)} · ` +
      `${questionario.acertos ?? 0}/${questionario.total ?? 0}`;
    const barras = document.createElement("div");
    barras.className = "chart-bars";
    const dados = dadosRespostasIndividuais(questionario);
    if (dados.length) {
      mostrarBarrasNoElemento(barras, dados, 100);
    } else {
      const semRespostas = document.createElement("p");
      semRespostas.className = "chart-empty";
      semRespostas.textContent = "Este registro não contém respostas individuais.";
      barras.append(semRespostas);
    }
    cartao.append(titulo, barras);
    graficos.append(cartao);
  });
}

function selecionarParticipanteAvaliacao() {
  const uid = document.getElementById("checklist-participant").value;
  const perfil = perfisParticipantes.find((item) => item.uid === uid);
  const selecionado = Boolean(perfil);
  const mudouParticipante = uid !== participanteAvaliacaoAtual;
  const profissao = profissaoChecklistInstrutor();
  const habilitado = selecionado && Boolean(profissao);
  document.querySelectorAll(".prac-chk").forEach((item) => {
    if (mudouParticipante) item.checked = false;
    item.disabled = !habilitado;
  });
  if (mudouParticipante) {
    document.getElementById("evaluation-grade").value = "";
    document.getElementById("evaluation-feedback").value = "";
  }
  participanteAvaliacaoAtual = uid;
  document.getElementById("evaluation-grade").disabled = !habilitado;
  document.getElementById("evaluation-feedback").disabled = !habilitado;
  document.getElementById("save-checklist").disabled = !habilitado;
  document.getElementById("evaluation-error").hidden = true;

  const painel = document.getElementById("participant-profile");
  painel.hidden = !perfil;
  const inputNota = document.getElementById("evaluation-grade");
  const observacao = document.getElementById("evaluation-feedback");
  inputNota.disabled = !habilitado;
  observacao.disabled = !habilitado;
  if (!perfil) {
    mostrarFotoParticipante(null, "participant-avatar", "participant-avatar-fallback");
    return;
  }

  document.getElementById("participant-name").textContent = perfil.nome;
  document.getElementById("participant-details").textContent =
    [perfil.cargo, rotuloProfissaoInstrutor(perfil.profissaoInstrutor), perfil.email]
      .filter(Boolean)
      .join(" · ");
  void mostrarFotoParticipante(perfil, "participant-avatar", "participant-avatar-fallback");
  mostrarRespostasParticipante(uid);
  mostrarChecklistsAnteriores(uid);
}

function configurarChecklistInstrutor() {
  renderizarChecklistInstrutor();
}

function profissaoChecklistInstrutor() {
  const profissao = profissaoInstrutorCanonica(perfilContaAtual?.profissaoInstrutor);
  return CHECKLISTS_INSTRUTOR[profissao] ? profissao : "";
}

function profissaoInstrutorCanonica(profissao) {
  if (profissao === "saude" || profissao === "profissional-saude") {
    return "profissional-saude";
  }
  if (
    profissao === "resgate" ||
    profissao === "profissional-seguranca-resgate"
  ) {
    return "profissional-seguranca-resgate";
  }
  return "";
}

function renderizarChecklistInstrutor() {
  const container = document.getElementById("checklist-items");
  const profissao = profissaoChecklistInstrutor();
  const itens = CHECKLISTS_INSTRUTOR[profissao] || [];
  container.replaceChildren();
  if (!profissao) {
    const aviso = document.createElement("p");
    aviso.className = "chart-empty";
    aviso.textContent =
      "A área profissional não está registrada nesta conta. Peça à gestão para atualizar o cadastro do instrutor.";
    container.append(aviso);
  }
  for (const texto of itens) {
    const label = document.createElement("label");
    label.className = "check-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "prac-chk";
    input.disabled = !document.getElementById("checklist-participant").value;
    label.append(input, document.createTextNode(` ${texto}`));
    container.append(label);
  }
  document.getElementById("save-checklist").disabled =
    !document.getElementById("checklist-participant").value || !profissao;
}

function rotuloProfissaoInstrutor(profissao) {
  const profissaoCanonica = profissaoInstrutorCanonica(profissao);
  if (profissaoCanonica === "profissional-saude") return "Profissional de Saúde";
  if (profissaoCanonica === "profissional-seguranca-resgate") {
    return "Profissional de Segurança/Resgate";
  }
  return "";
}

function precisaClassificarContaAntiga(perfil) {
  return perfil?.perfil === "instrutor" &&
    !rotuloProfissaoInstrutor(perfil.profissaoInstrutor);
}

function podeClassificarContaAntiga(perfil, instrutorAutorizado, classificacaoPendente = false) {
  if (classificacaoPendente) return true;
  const instrutorSemProfissao =
    (perfil?.perfil === "instrutor" || instrutorAutorizado) &&
    !rotuloProfissaoInstrutor(perfil?.profissaoInstrutor);
  const contaSemClassificacao =
    !instrutorAutorizado && !perfil?.perfil && !perfil?.cargo;
  return instrutorSemProfissao || contaSemClassificacao;
}

const versoesFotosParticipantes = new Map();

async function mostrarFotoParticipante(perfil, idImagem, idFallback, idSelect = "") {
  const imagem = document.getElementById(idImagem);
  const fallback = document.getElementById(idFallback);
  const uid = perfil?.uid || "";
  const versao = (versoesFotosParticipantes.get(idImagem) || 0) + 1;
  versoesFotosParticipantes.set(idImagem, versao);
  imagem.hidden = true;
  imagem.removeAttribute("src");
  fallback.hidden = false;
  fallback.textContent = perfil?.nome?.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";
  if (!uid || perfil?.temFoto !== true) return;

  try {
    const url = await window.SosFirebase.readProfilePhoto(uid);
    if (!url) return;
    if (
      versoesFotosParticipantes.get(idImagem) !== versao ||
      (idSelect && document.getElementById(idSelect).value !== uid)
    ) return;
    await decodificarFotoPerfil(imagem, url);
    if (
      versoesFotosParticipantes.get(idImagem) !== versao ||
      (idSelect && document.getElementById(idSelect).value !== uid)
    ) return;
    imagem.hidden = false;
    fallback.hidden = true;
  } catch (error) {
    if (versoesFotosParticipantes.get(idImagem) !== versao) return;
    console.error("Não foi possível carregar a foto do participante.", error);
  }
}

async function decodificarFotoPerfil(imagem, url) {
  if (typeof imagem.decode === "function") {
    imagem.src = url;
    await imagem.decode();
    return;
  }
  await new Promise((resolve, reject) => {
    const limpar = () => {
      imagem.onload = null;
      imagem.onerror = null;
    };
    imagem.onload = () => {
      limpar();
      resolve();
    };
    imagem.onerror = () => {
      limpar();
      reject(new Error("A imagem do perfil não pôde ser carregada."));
    };
    imagem.src = url;
  });
}

function mostrarAvaliacoesPraticas(uid, container) {
  container.replaceChildren();
  const avaliacoes = registrosGestao
    .filter((registro) => registro.tipo === "pratica" && registro.participanteUid === uid)
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  if (!avaliacoes.length) {
    container.textContent = "Ainda não há avaliações práticas para esta pessoa.";
    return;
  }

  for (const avaliacao of avaliacoes.slice(0, 5)) {
    const cartao = document.createElement("article");
    cartao.className = "profile-test-card";
    const titulo = document.createElement("h5");
    const nota = Number.isFinite(avaliacao.nota) ? `${avaliacao.nota}/10` : "Nota não registrada";
    titulo.textContent = `${formatarDataRegistro(avaliacao)} · ${nota}`;
    const resultado = document.createElement("p");
    resultado.textContent =
      `Checklist: ${avaliacao.acertos ?? 0}/${avaliacao.total ?? 0}` +
      (typeof avaliacao.checklistTipo === "string"
        ? ` · ${rotuloProfissaoInstrutor(avaliacao.checklistTipo)}`
        : "");
    cartao.append(titulo, resultado);
    if (typeof avaliacao.observacao === "string" && avaliacao.observacao.trim()) {
      const feedback = document.createElement("p");
      feedback.textContent = `Observação: ${avaliacao.observacao}`;
      cartao.append(feedback);
    }
    container.append(cartao);
  }
}

function criarCartaoHistorico(titulo) {
  const cartao = document.createElement("div");
  cartao.className = "participant-history";
  const cabecalho = document.createElement("h5");
  cabecalho.textContent = titulo;
  cartao.append(cabecalho);
  return cartao;
}

function formatarDataRegistro(registro) {
  const data = new Date(registro.criadoEm);
  return Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleString("pt-BR");
}

function mostrarRespostasParticipante(uid) {
  const container = document.getElementById("participant-answers");
  container.replaceChildren();
  const questionarios = registrosGestao
    .filter((registro) =>
      registro.tipo === "questionario" &&
      (registro.participanteUid === uid || registro.uid === uid)
    )
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

  if (questionarios.length === 0) {
    container.textContent = "Ainda não há questionários registrados para esta pessoa.";
    return;
  }

  for (const questionario of questionarios.slice(0, 5)) {
    const cartao = criarCartaoHistorico(
      `${questionario.etapa || "Questionário"} · ${formatarDataRegistro(questionario)}`
    );
    const resumo = document.createElement("p");
    resumo.className = "sub-text";
    resumo.textContent = `Resultado: ${questionario.acertos ?? 0}/${questionario.total ?? 0}`;
    cartao.append(resumo);

    if (Array.isArray(questionario.respostas) && questionario.respostas.length > 0) {
      const lista = document.createElement("ul");
      for (const dado of questionario.respostas.slice(0, 8)) {
        const resposta = dado && typeof dado === "object" ? dado : {};
        const item = document.createElement("li");
        const correta = resposta.correta === true;
        const situacao = correta ? "Correta" : "Rever";
        item.classList.add(correta ? "answer-correct" : "answer-incorrect");
        item.textContent =
          `${typeof resposta.caso === "string" ? resposta.caso : "Questão"}: ` +
          `${typeof resposta.respostaEscolhida === "string" ? resposta.respostaEscolhida : "Resposta indisponível"} — ${situacao}`;
        lista.append(item);
      }
      cartao.append(lista);
    } else {
      const aviso = document.createElement("p");
      aviso.className = "sub-text";
      aviso.textContent = "Este registro não contém as respostas individuais.";
      cartao.append(aviso);
    }
    container.append(cartao);
  }
}

function mostrarChecklistsAnteriores(uid) {
  const container = document.getElementById("participant-checklist-history");
  container.replaceChildren();
  const avaliacoes = registrosGestao
    .filter((registro) =>
      registro.tipo === "pratica" && registro.participanteUid === uid
    )
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

  if (avaliacoes.length === 0) {
    container.textContent = "Ainda não há avaliações práticas anteriores.";
    return;
  }

  for (const avaliacao of avaliacoes.slice(0, 5)) {
    const nota = Number.isFinite(avaliacao.nota) ? ` · Nota ${avaliacao.nota}/10` : "";
    const tipo = rotuloProfissaoInstrutor(avaliacao.checklistTipo);
    const cartao = criarCartaoHistorico(
      `${formatarDataRegistro(avaliacao)}${nota} · ${avaliacao.acertos ?? 0}/${avaliacao.total ?? 0}` +
      (tipo ? ` · ${tipo}` : "")
    );
    if (typeof avaliacao.observacao === "string" && avaliacao.observacao.trim()) {
      const observacao = document.createElement("p");
      observacao.className = "sub-text";
      observacao.textContent = `Observação: ${avaliacao.observacao}`;
      cartao.append(observacao);
    }
    const lista = document.createElement("ul");
    const nomesItens = Array.isArray(avaliacao.checklistItens)
      ? avaliacao.checklistItens
      : CHECKLISTS_INSTRUTOR["profissional-saude"];
    nomesItens.forEach((nome, indice) => {
      const item = document.createElement("li");
      item.textContent = `${nome}: ${avaliacao.checklist?.[indice] ? "Realizado" : "A revisar"}`;
      lista.append(item);
    });
    cartao.append(lista);
    container.append(cartao);
  }
}

function mostrarProtocolos() {
  const lista = document.getElementById("proto-list");
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

function mostrarCadastro() {
  document.getElementById("firebase-login").hidden = true;
  document.getElementById("signup-form-container").hidden = false;
  document.getElementById("signup-error").hidden = true;
  document.getElementById("signup-name").focus();
}

function mostrarLogin() {
  document.getElementById("signup-form-container").hidden = true;
  document.getElementById("firebase-login").hidden = false;
  document.getElementById("login-error").hidden = true;
  document.getElementById("auth-email").focus();
}

function atualizarCamposCadastro() {
  const tipoConta = document.getElementById("signup-account-type").value;
  const camposCargo = document.getElementById("signup-cargo-fields");
  const cargo = document.getElementById("signup-cargo");
  const camposInstrutor = document.getElementById("signup-instructor-fields");
  const codigo = document.getElementById("signup-instructor-code");
  const instrutor = tipoConta === "instrutor";
  camposCargo.hidden = instrutor;
  camposInstrutor.hidden = !instrutor;
  cargo.required = !instrutor;
  codigo.required = instrutor;
  if (instrutor) {
    cargo.disabled = true;
  } else {
    codigo.value = "";
    codigo.disabled = true;
    cargo.disabled = false;
  }
  if (instrutor) codigo.disabled = false;
}

async function lerRespostaJson(response) {
  const texto = await response.text();
  try {
    const dados = JSON.parse(texto);
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      throw new Error("invalid-response-shape");
    }
    return dados;
  } catch (error) {
    throw new Error(`invalid-server-response:${response.status}`, { cause: error });
  }
}

function validarRequisitosSenha(senha) {
  const valor = typeof senha === "string" ? senha : "";
  return {
    length: valor.length >= 8,
    uppercase: /[A-Z]/.test(valor),
    special: /[^A-Za-z0-9\s]/.test(valor),
    number: /[0-9]/.test(valor)
  };
}

function atualizarRequisitosSenha() {
  const senha = document.getElementById("signup-password").value;
  const requisitos = validarRequisitosSenha(senha);
  const regras = [
    ["length", "signup-password-rule-length", "signup-password-status-length"],
    ["uppercase", "signup-password-rule-uppercase", "signup-password-status-uppercase"],
    ["special", "signup-password-rule-special", "signup-password-status-special"],
    ["number", "signup-password-rule-number", "signup-password-status-number"]
  ];

  for (const [chave, idRegra, idStatus] of regras) {
    const atendido = requisitos[chave];
    const item = document.getElementById(idRegra);
    item.classList?.toggle("is-valid", atendido);
    item.classList?.toggle("is-pending", !atendido);
    document.getElementById(idStatus).textContent = atendido ? "Atendido" : "Pendente";
  }

  const todosAtendidos = Object.values(requisitos).every(Boolean);
  document.getElementById("signup-submit").disabled =
    registroEmAndamento || !todosAtendidos;
  return todosAtendidos;
}

async function criarConta(evento) {
  evento.preventDefault();
  const botao = document.getElementById("signup-submit");
  const erro = document.getElementById("signup-error");
  const senha = document.getElementById("signup-password").value;
  const confirmacao = document.getElementById("signup-password-confirm").value;
  erro.hidden = true;

  if (!atualizarRequisitosSenha()) {
    erro.textContent = "A senha ainda não atende a todos os requisitos.";
    erro.hidden = false;
    document.getElementById("signup-password").focus();
    return;
  }

  if (senha !== confirmacao) {
    erro.textContent = "As senhas não coincidem.";
    erro.hidden = false;
    document.getElementById("signup-password-confirm").focus();
    return;
  }

  botao.disabled = true;
  registroEmAndamento = true;
  let cadastroEraInstrutor = false;
  let mensagemFalhaCadastro = "";
  try {
    const instrutor =
      document.getElementById("signup-account-type").value === "instrutor";
    cadastroEraInstrutor = instrutor;
    const codigoInstrutor = document.getElementById("signup-instructor-code").value;
    const cadastro = {
      nome: document.getElementById("signup-name").value.trim(),
      email: document.getElementById("signup-email").value.trim().toLowerCase(),
      password: senha,
      tipoConta: instrutor ? "instrutor" : "equipe",
      cargo: instrutor ? "" : document.getElementById("signup-cargo").value
    };
    if (instrutor) {
      const respostaValidacao = await fetch("/api/validate-instructor-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoInstrutor })
      });
      if (respostaValidacao.status === 404) {
        throw new Error("instructor-code-validation-not-published");
      }
      const resultadoValidacao = await lerRespostaJson(respostaValidacao);
      if (!respostaValidacao.ok || resultadoValidacao.valid !== true) {
        throw new Error(resultadoValidacao.error === "invalid-instructor-code"
          ? "invalid-access-code"
          : resultadoValidacao.error || "invalid-access-code");
      }
    }

    await window.SosFirebase.createAccountAndProfile(cadastro);
    if (instrutor) {
      const usuario = window.SosFirebase.currentUser();
      const resposta = await fetch("/api/classify-instructor", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await usuario.getIdToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          codigo: codigoInstrutor
        })
      });
      if (resposta.status === 404) {
        throw new Error("instructor-classification-not-published");
      }
      const resultado = await lerRespostaJson(resposta);
      if (!resposta.ok) throw new Error(resultado.error || "classification-failed");
      await window.SosFirebase.refreshCurrentUserToken();
    }

    document.getElementById("signup-form").reset();
    atualizarCamposCadastro();
  } catch (error) {
    console.error("Não foi possível criar a conta.", error);
    mensagemFalhaCadastro = mensagemErroCadastro(error);
    erro.textContent = mensagemFalhaCadastro;
    erro.hidden = false;
  } finally {
    registroEmAndamento = false;
    atualizarRequisitosSenha();
    const usuario = window.SosFirebase.currentUser();
    if (usuario) {
      await atualizarTelaAutenticacao(usuario);
      if (cadastroEraInstrutor && mensagemFalhaCadastro) {
        const erroClassificacao = document.getElementById("legacy-classification-error");
        document.getElementById("legacy-classification-form").hidden = false;
        erroClassificacao.textContent = mensagemFalhaCadastro;
        erroClassificacao.hidden = false;
        mudarAba("perfil");
      }
    }
  }
}

function classificarErroCadastro(error) {
  switch (error?.code || error?.message) {
    case "auth/email-already-in-use":
    case "auth/email-already-exists":
    case "email-already-registered":
      return "email-already-registered";
    case "auth/unauthorized-domain":
      return "auth-unauthorized-domain";
    case "database/permission-denied":
    case "permission-denied":
    case "PERMISSION_DENIED":
      return "database-permission-denied";
    case "auth/insufficient-permission":
      return "firebase-auth-permission-denied";
    case "auth/operation-not-allowed":
      return "firebase-email-password-disabled";
    case "auth/weak-password":
    case "auth/invalid-email":
    case "auth/invalid-password":
      return "invalid-registration";
    case "auth/network-request-failed":
      return "network-request-failed";
    default:
      return error?.message || "registration-failed";
  }
}

async function decodificarArquivoFoto(arquivo) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(arquivo);
    return {
      imagem: bitmap,
      largura: bitmap.width,
      altura: bitmap.height,
      fechar: () => bitmap.close()
    };
  }
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const url = URL.createObjectURL(arquivo);
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        imagem,
        largura: imagem.naturalWidth,
        altura: imagem.naturalHeight,
        fechar: () => {}
      });
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("A imagem selecionada não pôde ser aberta."));
    };
    imagem.src = url;
  });
}

async function comprimirFotoPerfil(arquivo) {
  const imagem = await decodificarArquivoFoto(arquivo);
  try {
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a imagem.");
    const escalaInicial = Math.min(1, 512 / Math.max(imagem.largura, imagem.altura));
    const escalas = [1, 0.85, 0.7, 0.55, 0.4, 0.3];
    const qualidades = [0.86, 0.76, 0.66, 0.56, 0.46, 0.36];
    for (const escala of escalas) {
      canvas.width = Math.max(1, Math.round(imagem.largura * escalaInicial * escala));
      canvas.height = Math.max(1, Math.round(imagem.altura * escalaInicial * escala));
      contexto.fillStyle = "#fff";
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(imagem.imagem, 0, 0, canvas.width, canvas.height);
      for (const qualidade of qualidades) {
        const foto = canvas.toDataURL("image/jpeg", qualidade);
        if (foto.length < 100_000) return foto;
      }
    }
    throw new Error("profile-photo-too-large");
  } finally {
    imagem.fechar();
  }
}

async function classificarContaAntiga(evento) {
  evento.preventDefault();
  const botao = document.getElementById("legacy-classification-submit");
  const erro = document.getElementById("legacy-classification-error");
  erro.hidden = true;
  botao.disabled = true;

  try {
    const usuario = window.SosFirebase.currentUser();
    if (!usuario) throw new Error("authentication-required");
    const resposta = await fetch("/api/classify-instructor", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await usuario.getIdToken()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        codigo: document.getElementById("legacy-instructor-code").value
      })
    });
    const resultado = await lerRespostaJson(resposta);
    if (!resposta.ok) throw new Error(resultado.error || "classification-failed");
    if (!resultado.perfil || !rotuloProfissaoInstrutor(resultado.perfil.profissaoInstrutor)) {
      throw new Error("classification-failed");
    }

    await window.SosFirebase.refreshCurrentUserToken();
    perfilContaAtual = resultado.perfil;
    instrutorAutorizadoAtual = true;
    classificacaoInstrutorPendente = false;
    document.getElementById("legacy-instructor-code").value = "";
    document.getElementById("legacy-classification-form").hidden = true;
    abrirAplicativo("instrutor");
  } catch (error) {
    console.error("Não foi possível classificar a conta antiga.", error);
    erro.textContent = mensagemErroClassificacao(error);
    erro.hidden = false;
  } finally {
    botao.disabled = false;
  }
}

function mensagemErroClassificacao(error) {
  switch (error.message) {
    case "invalid-instructor-code":
      return "Código profissional inválido.";
    case "too-many-code-attempts":
      return "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.";
    case "profile-already-classified":
      return "Esta conta já está classificada. Saia e entre novamente para atualizar o acesso.";
    case "classification-unavailable":
      return "A classificação está temporariamente indisponível. Tente novamente mais tarde.";
    case "authentication-required":
      return "Entre na conta que deseja classificar e tente novamente.";
    case "firebase-auth-permission-denied":
      return mensagemErroPermissaoFirebase();
    default:
      if (error.message === "invalid-server-response:404") {
        return "O serviço de classificação ainda não foi publicado. Atualize o aplicativo ou avise a gestão.";
      }
      if (error.message.startsWith("invalid-server-response:")) {
        return "O servidor retornou uma resposta inválida. Tente novamente mais tarde.";
      }
      return "Não foi possível classificar esta conta. Verifique a conexão e tente novamente.";
  }
}

function mensagemErroPermissaoFirebase() {
  return "O servidor não tem permissão para administrar usuários no Firebase Authentication. A gestão deve conceder a função Firebase Authentication Admin à conta de serviço configurada no Vercel.";
}

function continuarComoUsuarioAntigo() {
  const usuario = window.SosFirebase.currentUser();
  if (!usuario || perfilContaAtual?.perfil === "instrutor") return;
  preencherPerfilTreinamento(usuario, perfilContaAtual);
  document.getElementById("legacy-classification-form").hidden = true;
  abrirAplicativo("equipe");
}

function mensagemErroCadastro(error) {
  switch (classificarErroCadastro(error)) {
    case "invalid-registration":
      return "Confira os dados e use uma senha com pelo menos 6 caracteres.";
    case "invalid-access-code":
      return "Código de acesso inválido.";
    case "instructor-code-validation-not-published":
      return "A validação do código ainda não foi publicada. Atualize o site no Vercel e tente novamente.";
    case "instructor-classification-not-published":
      return "A conta foi criada, mas a classificação do instrutor ainda não está publicada. Entre no Perfil e tente novamente depois que o site for atualizado.";
    case "invalid-instructor-code":
      return "A conta foi criada, mas o código de instrutor é inválido. Entre na conta e tente classificá-la novamente na aba Perfil.";
    case "too-many-code-attempts":
      return "Muitas tentativas de código. Aguarde antes de tentar novamente.";
    case "too-many-registrations":
      return "Muitas contas foram criadas nesta rede recentemente. Aguarde antes de tentar novamente.";
    case "email-already-registered":
      return "Este e-mail já possui uma conta. Entre com ela ou use outro e-mail.";
    case "auth-unauthorized-domain":
      return "Este endereço do aplicativo não está autorizado no Firebase. Peça à gestão para adicioná-lo em Authentication → Configurações → Domínios autorizados.";
    case "database-permission-denied":
      return "O Realtime Database negou a gravação do perfil. A gestão precisa publicar as regras atualizadas do banco antes de tentar novamente.";
    case "network-request-failed":
      return "Não foi possível conectar ao Firebase. Verifique a internet e tente novamente.";
    case "profile-photo-too-large":
      return "Não foi possível reduzir a foto para menos de 100 KB. Escolha outra imagem.";
    case "registration-unavailable":
      return "O cadastro está temporariamente indisponível. Tente novamente mais tarde.";
    case "registration-failed":
      return "Não foi possível concluir o cadastro no Firebase. Tente novamente; se persistir, a gestão deve conferir as credenciais e os logs do Vercel.";
    case "account-creation-failed":
      return "O Firebase não conseguiu criar a conta. Verifique a conexão e se o provedor de e-mail e senha está habilitado.";
    case "firebase-auth-permission-denied":
      return mensagemErroPermissaoFirebase();
    case "firebase-admin-credentials-invalid":
      return "As credenciais do Firebase Admin configuradas no Vercel são inválidas. A gestão deve revisar FIREBASE_SERVICE_ACCOUNT.";
    case "firebase-admin-project-mismatch":
      return "As credenciais do Firebase Admin pertencem a outro projeto. A gestão deve conferir o projeto SOS Escola no Vercel.";
    case "firebase-email-password-disabled":
      return "O provedor de e-mail e senha está desabilitado no Firebase Authentication. A gestão precisa habilitá-lo no Console.";
    case "classification-unavailable":
    case "classification-failed":
      return "A conta foi criada, mas não foi possível concluir a classificação de instrutor. Entre na conta e tente novamente na aba Perfil.";
    case "profile-already-classified":
      return "Esta conta já está classificada com outra profissão. Entre em contato com a gestão.";
    case "registration-completion-failed":
      return "A conta foi iniciada, mas o Firebase não conseguiu concluir o perfil. Tente novamente com outro e-mail somente depois de confirmar com a gestão.";
    case "account-created-login-failed":
      return "A conta pode ter sido criada, mas não foi possível entrar. Tente fazer login antes de criar outra conta.";
    default:
      if (error instanceof TypeError) {
        return "Não foi possível conectar ao serviço de cadastro. Verifique a internet e tente novamente.";
      }
      if (error.message.startsWith("invalid-server-response:")) {
        const status = Number(error.message.split(":")[1]);
        if (status === 404) {
          return "O serviço de cadastro não está publicado nesta versão. Avise a gestão para atualizar o Vercel.";
        }
        return `O servidor de cadastro respondeu com erro (HTTP ${status || "desconhecido"}). Tente novamente mais tarde.`;
      }
      return "Não foi possível criar a conta. Verifique a conexão e tente novamente.";
  }
}

async function entrarFirebase(evento) {
  evento.preventDefault();
  const botao = document.getElementById("login-submit");
  const erro = document.getElementById("login-error");
  erro.hidden = true;
  botao.disabled = true;
  try {
    await window.SosFirebase.signIn(
      document.getElementById("auth-email").value.trim(),
      document.getElementById("auth-password").value
    );
    document.getElementById("auth-password").value = "";
  } catch (error) {
    console.error("Não foi possível entrar no Firebase Authentication.", error);
    erro.textContent = mensagemErroAutenticacao(error);
    erro.hidden = false;
  } finally {
    botao.disabled = false;
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

async function verificarAcessoInstrutor() {
  const acesso = await window.SosFirebase.resolveInstructorAccount();
  if (!acesso || typeof acesso.isInstructor !== "boolean") {
    throw new Error("O servidor retornou um estado de acesso inválido.");
  }
  return acesso;
}

function abrirAplicativo(perfil) {
  perfilAtual = perfil === "instrutor" ? "instrutor" : "instruido";
  const instrutor = perfilAtual === "instrutor";
  document.getElementById("nav-perfil").hidden = false;
  document.getElementById("nav-perfil").style.display = "flex";
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("emergency-banner").hidden = instrutor;
  document.getElementById("nav-guia").hidden = instrutor;
  document.getElementById("nav-treino").hidden = instrutor;
  document.getElementById("nav-metricas").hidden = !instrutor;
  document.getElementById("role-label").textContent = perfilAtual === "instrutor"
    ? "Perfil: Instrutor"
    : "Perfil: Instruído";
  document.querySelector(".role-badge").style.display = "block";
  document.getElementById("nav-plano").hidden = false;
  document.getElementById("nav-gestao").style.display = instrutor ? "flex" : "none";
  document.getElementById("nav-metricas").style.display = instrutor ? "flex" : "none";
  configurarChecklistInstrutor();
  mostrarResumoPerfilUsuario();
  mudarAba(instrutor ? "plano" : "guia");
}

async function trocarPerfil() {
  try {
    await window.SosFirebase.signOut();
  } catch (error) {
    console.error("Não foi possível encerrar a sessão Firebase.", error);
    alert(`Não foi possível sair da conta: ${error.message}`);
  }
}

async function atualizarTelaAutenticacao(usuario) {
  if (registroEmAndamento) return;
  const carregamentoId = ++carregamentoAutenticacaoId;
  const authScreen = document.getElementById("auth-screen");
  const carregando = document.getElementById("auth-loading");
  const erroSessao = document.getElementById("auth-session-error");
  const sairSessao = document.getElementById("auth-session-logout");
  perfilAtual = null;
  perfilContaAtual = null;
  instrutorAutorizadoAtual = false;
  classificacaoInstrutorPendente = false;
  authScreen.style.display = "flex";
  document.getElementById("firebase-login").hidden = Boolean(usuario);
  document.getElementById("signup-form-container").hidden = Boolean(usuario);
  document.getElementById("profile-legacy-classification").hidden = true;
  document.getElementById("legacy-classification-form").hidden = true;
  document.getElementById("legacy-classification-error").hidden = true;
  document.getElementById("nav-gestao").style.display = "none";
  document.getElementById("nav-metricas").hidden = true;
  document.getElementById("nav-metricas").style.display = "none";
  document.getElementById("nav-perfil").hidden = true;
  document.getElementById("nav-perfil").style.display = "none";
  document.querySelector(".role-badge").style.display = "none";
  carregando.hidden = !usuario;
  erroSessao.hidden = true;
  sairSessao.hidden = true;
  if (usuario) {
    try {
      const acesso = await verificarAcessoInstrutor();
      const perfil = acesso.profile;
      const instrutorAutorizado = acesso.isInstructor;
      if (carregamentoId !== carregamentoAutenticacaoId) return;
      perfilContaAtual = perfil && typeof perfil === "object" && !Array.isArray(perfil)
        ? perfil
        : {};
      const perfilDizInstrutorSemProfissao = precisaClassificarContaAntiga(perfil);
      instrutorAutorizadoAtual = instrutorAutorizado;
      classificacaoInstrutorPendente = acesso.classificationRequired === true &&
        !instrutorAutorizado;
      const instrutorSemProfissao =
        perfilDizInstrutorSemProfissao && !instrutorAutorizado;
      if (perfil?.perfil === "instrutor" && !instrutorAutorizado && !instrutorSemProfissao) {
        throw new Error("instructor-not-authorized");
      }
      if (carregamentoId !== carregamentoAutenticacaoId) return;
      preencherPerfilTreinamento(usuario, perfil);
      carregando.hidden = true;
      abrirAplicativo(
        instrutorAutorizadoAtual || instrutorSemProfissao ? "instrutor" : "equipe"
      );
    } catch (error) {
      if (carregamentoId !== carregamentoAutenticacaoId) return;
      console.error("Não foi possível carregar ou validar o perfil da conta.", error);
      carregando.hidden = true;
      erroSessao.textContent = "Não foi possível carregar seu perfil. Verifique a conexão e tente novamente.";
      if (error.message === "instructor-not-authorized") {
        erroSessao.textContent = "Esta conta está marcada como instrutor, mas não possui autorização no Firebase. Solicite ajuda à gestão.";
      } else if (error.message === "firebase-auth-permission-denied") {
        erroSessao.textContent = mensagemErroPermissaoFirebase();
      } else if (error.message === "instructor-access-not-published") {
        erroSessao.textContent = "A verificação de perfil ainda não foi publicada no Vercel. A gestão precisa publicar a versão mais recente.";
      }
      erroSessao.hidden = false;
      sairSessao.hidden = false;
    }
    return;
  }

  pararObservacaoGestao();
  document.getElementById("emergency-banner").hidden = false;
  document.getElementById("nav-guia").hidden = false;
  document.getElementById("nav-treino").hidden = false;
  document.getElementById("nav-plano").hidden = false;
  document.getElementById("profile-recent-tests").replaceChildren();
  document.getElementById("profile-test-status").textContent = "";
  document.getElementById("profile-avatar").hidden = true;
  document.getElementById("profile-avatar").removeAttribute("src");
  document.getElementById("profile-avatar-fallback").hidden = false;
  const nome = document.getElementById("p-nome");
  const cargo = document.getElementById("p-cargo");
  document.getElementById("start-training").disabled = false;
  nome.value = "";
  nome.readOnly = false;
  cargo.disabled = false;
  cargo.selectedIndex = 0;
  document.getElementById("participant-profile-error").hidden = true;
  mostrarLogin();
}

function preencherPerfilTreinamento(usuario, perfil) {
  const nome = document.getElementById("p-nome");
  const cargo = document.getElementById("p-cargo");
  const aviso = document.getElementById("participant-profile-error");
  const botaoIniciar = document.getElementById("start-training");
  aviso.hidden = true;
  const nomePerfil = typeof perfil?.nome === "string" ? perfil.nome : "";
  nome.value = nomePerfil || usuario.displayName || "";
  nome.readOnly = Boolean(nomePerfil || usuario.displayName);
  cargo.disabled = false;
  if ([...cargo.options].some((opcao) => opcao.value === perfil?.cargo)) {
    cargo.value = perfil.cargo;
    cargo.disabled = true;
  } else {
    cargo.selectedIndex = 0;
  }
  botaoIniciar.disabled = false;
}

function mudarAba(aba) {
  const abaInstrutor = aba === "gestao" || aba === "metricas";
  if (abaInstrutor && perfilAtual !== "instrutor") {
    alert("A área do instrutor exige acesso pelo perfil de instrutor.");
    return;
  }
  if (perfilAtual === "instrutor" && !["plano", "perfil", "gestao", "metricas"].includes(aba)) {
    alert("O perfil de instrutor acessa apenas planejamento, avaliação e métricas.");
    return;
  }
  if (!abaInstrutor) pararObservacaoGestao();
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
  if (abaInstrutor) void atualizarPainelGestao();
  if (aba === "perfil") void atualizarPerfilUsuario();
}

function mostrarResumoPerfilUsuario() {
  const usuario = window.SosFirebase.currentUser();
  const nome = perfilContaAtual?.nome || usuario?.displayName || "Usuário";
  document.getElementById("profile-user-name").textContent = nome;
  document.getElementById("profile-user-email").textContent = usuario?.email || "";
  document.getElementById("profile-user-role").textContent =
    perfilAtual === "instrutor"
      ? `Instrutor${rotuloProfissaoInstrutor(perfilContaAtual?.profissaoInstrutor)
        ? ` · ${rotuloProfissaoInstrutor(perfilContaAtual.profissaoInstrutor)}`
        : ""}`
      : perfilContaAtual?.cargo || "Comunidade escolar";
  document.getElementById("profile-avatar-fallback").textContent =
    nome.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";
  document.getElementById("profile-legacy-classification").hidden =
    !podeClassificarContaAntiga(
      perfilContaAtual,
      instrutorAutorizadoAtual,
      classificacaoInstrutorPendente
    );
  document.getElementById("instructor-feedback-form").hidden = perfilAtual === "instrutor";
}

function abrirClassificacaoContaAntiga() {
  const formulario = document.getElementById("legacy-classification-form");
  formulario.hidden = false;
  document.getElementById("legacy-instructor-code").focus();
}

async function carregarInstrutoresParaFeedback(uidAtual) {
  const seletor = document.getElementById("feedback-instructor");
  const erro = document.getElementById("instructor-feedback-error");
  const botao = document.getElementById("instructor-feedback-submit");
  seletor.replaceChildren();
  botao.disabled = true;
  const opcaoVazia = document.createElement("option");
  opcaoVazia.value = "";
  opcaoVazia.textContent = "Carregando instrutores...";
  seletor.append(opcaoVazia);
  erro.hidden = true;

  try {
    const instrutores = await window.SosFirebase.readInstructors();
    if (window.SosFirebase.currentUser()?.uid !== uidAtual) return;
    seletor.replaceChildren();
    const disponiveis = instrutores.filter((instrutor) => instrutor.uid !== uidAtual);
    const primeiraOpcao = document.createElement("option");
    primeiraOpcao.value = "";
    primeiraOpcao.textContent = disponiveis.length
      ? "Selecione o instrutor"
      : "Nenhum instrutor disponível";
    seletor.append(primeiraOpcao);
    for (const instrutor of disponiveis) {
      const opcao = document.createElement("option");
      opcao.value = instrutor.uid;
      opcao.textContent = [
        instrutor.nome,
        rotuloProfissaoInstrutor(instrutor.profissaoInstrutor)
      ].filter(Boolean).join(" · ");
      seletor.append(opcao);
    }
    seletor.disabled = disponiveis.length === 0;
    botao.disabled = disponiveis.length === 0;
  } catch (error) {
    if (window.SosFirebase.currentUser()?.uid !== uidAtual) return;
    console.error("Não foi possível carregar instrutores para avaliação.", error);
    seletor.replaceChildren();
    const opcao = document.createElement("option");
    opcao.value = "";
    opcao.textContent = "Não foi possível carregar instrutores";
    seletor.append(opcao);
    seletor.disabled = true;
    botao.disabled = true;
    erro.textContent = `Não foi possível carregar a lista de instrutores: ${error.message}`;
    erro.hidden = false;
  }
}

async function atualizarPerfilUsuario() {
  const usuario = window.SosFirebase.currentUser();
  if (!usuario || !perfilContaAtual) return;
  const uid = usuario.uid;
  const lista = document.getElementById("profile-recent-tests");
  const statusTestes = document.getElementById("profile-test-status");
  const statusFoto = document.getElementById("profile-photo-status");
  const erroFoto = document.getElementById("profile-photo-error");
  lista.replaceChildren();
  statusTestes.textContent = "Carregando testes...";
  erroFoto.hidden = true;
  mostrarResumoPerfilUsuario();
  if (perfilAtual !== "instrutor") void carregarInstrutoresParaFeedback(uid);

  const imagem = document.getElementById("profile-avatar");
  const fallback = document.getElementById("profile-avatar-fallback");
  imagem.hidden = true;
  imagem.removeAttribute("src");
  fallback.hidden = false;
  try {
    const url = await window.SosFirebase.readProfilePhoto(uid);
    if (window.SosFirebase.currentUser()?.uid !== uid) return;
    if (url) {
      await decodificarFotoPerfil(imagem, url);
      if (window.SosFirebase.currentUser()?.uid !== uid) return;
      imagem.hidden = false;
      fallback.hidden = true;
      statusFoto.textContent = "";
    } else {
      statusFoto.textContent = "Você ainda não adicionou uma foto.";
    }
  } catch (error) {
    if (window.SosFirebase.currentUser()?.uid !== uid) return;
    imagem.hidden = true;
    imagem.removeAttribute("src");
    fallback.hidden = false;
    console.error("Não foi possível carregar a foto do perfil.", error);
    statusFoto.textContent = mensagemErroFoto(error, "carregar");
  }

  let locais = [];
  let erroLocal = null;
  let remotos = [];
  let erroRemoto = null;
  try {
    locais = obterRegistrosLocais().filter((registro) =>
      registro && (registro.uid === uid || registro.participanteUid === uid)
    );
  } catch (error) {
    erroLocal = error;
    console.error("Não foi possível ler os testes salvos neste aparelho.", error);
  }
  try {
    remotos = normalizarRegistrosRemotos(await window.SosFirebase.readMyRecords());
  } catch (error) {
    erroRemoto = error;
    console.error("Não foi possível carregar os testes sincronizados do perfil.", error);
  }
  if (window.SosFirebase.currentUser()?.uid !== uid) return;

  const testes = registrosRecentesDoUsuario([...locais, ...remotos], uid);
  mostrarTestesRecentes(testes);
  if (erroRemoto && testes.length) {
    statusTestes.textContent =
      "Exibindo os testes disponíveis neste aparelho; não foi possível atualizar os sincronizados.";
  } else if (erroRemoto) {
    statusTestes.textContent = "Não foi possível carregar os testes. Verifique a conexão e tente novamente.";
  } else if (erroLocal) {
    statusTestes.textContent = "Os testes locais não puderam ser lidos; exibindo os sincronizados.";
  } else if (!testes.length) {
    statusTestes.textContent = "Ainda não há testes registrados para esta conta.";
  } else {
    statusTestes.textContent = "";
  }
}

async function enviarFeedbackInstrutor(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  const botao = document.getElementById("instructor-feedback-submit");
  const erro = document.getElementById("instructor-feedback-error");
  const status = document.getElementById("instructor-feedback-status");
  const usuario = window.SosFirebase.currentUser();
  if (!usuario || perfilAtual === "instrutor") return;
  erro.hidden = true;
  botao.disabled = true;

  const feedback = {
    id: novoId(),
    uid: usuario.uid,
    nome: perfilContaAtual?.nome || usuario.displayName || "Participante",
    tipo: "feedback",
    etapa: "Feedback da capacitação",
    instrutorUid: document.getElementById("feedback-instructor").value,
    notaInstrutor: Number(document.getElementById("feedback-instructor-rating").value),
    notaCapacitacao: Number(document.getElementById("feedback-training-rating").value),
    feedback: document.getElementById("feedback-message").value.trim(),
    criadoEm: new Date().toISOString()
  };

  try {
    if (
      !feedback.instrutorUid ||
      !Number.isInteger(feedback.notaInstrutor) ||
      feedback.notaInstrutor < 1 ||
      feedback.notaInstrutor > 5 ||
      !Number.isInteger(feedback.notaCapacitacao) ||
      feedback.notaCapacitacao < 1 ||
      feedback.notaCapacitacao > 5 ||
      !feedback.feedback ||
      feedback.feedback.length > 1000
    ) {
      throw new Error("Preencha as duas notas e o comentário antes de enviar.");
    }
    await window.SosFirebase.writeInstructorFeedback(feedback);
    if (window.SosFirebase.currentUser()?.uid !== usuario.uid) return;
    form.reset();
    status.textContent = "Obrigado! Sua avaliação foi enviada ao instrutor.";
  } catch (error) {
    console.error("Não foi possível enviar o feedback da capacitação.", error);
    erro.textContent = error.message.startsWith("Preencha")
      ? error.message
      : `Não foi possível enviar seu feedback. Verifique a conexão e as regras do Firebase: ${error.message}`;
    erro.hidden = false;
  } finally {
    botao.disabled = document.getElementById("feedback-instructor").disabled;
  }
}

async function excluirMinhaConta() {
  const confirmou = window.confirm(
    "Tem certeza de que deseja excluir sua conta? Seu perfil, sua foto e os registros associados serão removidos permanentemente. Esta ação não pode ser desfeita."
  );
  if (!confirmou) return;

  const botao = document.getElementById("account-delete-button");
  const status = document.getElementById("account-delete-status");
  botao.disabled = true;
  status.textContent = "Excluindo sua conta e os dados associados...";
  let contaExcluida = false;
  try {
    const usuario = window.SosFirebase.currentUser();
    if (!usuario) throw new Error("É necessário entrar com uma conta Firebase.");
    const uid = usuario.uid;
    await window.SosFirebase.deleteAccount();
    contaExcluida = true;
    try {
      const registros = obterRegistrosLocais();
      salvarRegistrosLocais(registros.filter((registro) =>
        registro.uid !== uid && registro.participanteUid !== uid
      ));
    } catch (error) {
      console.error("A conta foi excluída, mas os registros locais não puderam ser limpos.", error);
    }
    await window.SosFirebase.signOut();
    alert("Sua conta e os dados associados foram excluídos.");
  } catch (error) {
    console.error("Não foi possível excluir a conta.", error);
    if (contaExcluida) {
      status.textContent = "A conta foi excluída, mas não foi possível encerrar a sessão. Atualize esta página.";
    } else {
      status.textContent = `Não foi possível excluir a conta: ${error.message}`;
    }
  } finally {
    botao.disabled = false;
  }
}

function mostrarTestesRecentes(testes) {
  const lista = document.getElementById("profile-recent-tests");
  lista.replaceChildren();
  for (const teste of testes) {
    const cartao = document.createElement("article");
    cartao.className = "profile-test-card";
    const titulo = document.createElement("h5");
    titulo.textContent =
      `${teste.tipo === "pratica" ? "Avaliação prática" : teste.etapa || "Questionário"} · ` +
      formatarDataRegistro(teste);
    const resultado = document.createElement("p");
    resultado.textContent = teste.tipo === "pratica"
      ? `Nota individual: ${Number.isFinite(teste.nota) ? `${teste.nota}/10` : "não registrada"} · ` +
        `Checklist: ${teste.acertos ?? 0}/${teste.total ?? 0}`
      : `Resultado: ${teste.acertos ?? 0}/${teste.total ?? 0}` +
        (Number.isInteger(teste.confianca) ? ` · Autoconfiança: ${teste.confianca}/5` : "");
    cartao.append(titulo, resultado);
    if (typeof teste.observacao === "string" && teste.observacao.trim()) {
      const observacao = document.createElement("p");
      observacao.textContent = `Observação do instrutor: ${teste.observacao}`;
      cartao.append(observacao);
    }
    if (Array.isArray(teste.respostas) && teste.respostas.length) {
      const respostas = document.createElement("ul");
      for (const resposta of teste.respostas) {
        if (!resposta || typeof resposta !== "object") continue;
        const item = document.createElement("li");
        const correta = resposta.correta === true;
        item.className = correta ? "answer-correct" : "answer-incorrect";
        const caso = typeof resposta.caso === "string" ? resposta.caso : "Questão";
        item.textContent = `${caso}: ${correta ? "Correta" : "Rever"}`;
        respostas.append(item);
      }
      if (respostas.childElementCount) cartao.append(respostas);
    }
    lista.append(cartao);
  }
}

function validarFotoPerfil(arquivo) {
  const tiposPermitidos = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!arquivo || !tiposPermitidos.has(arquivo.type)) {
    return "Escolha uma imagem JPEG, PNG ou WebP.";
  }
  if (arquivo.size <= 0 || arquivo.size > 5 * 1024 * 1024) {
    return "A foto deve ter até 5 MB.";
  }
  return "";
}

function mensagemErroFoto(error, acao) {
  switch (error?.code || error?.message) {
    case "database/permission-denied":
    case "PERMISSION_DENIED":
      return "O Realtime Database negou a gravação da foto. A gestão deve publicar as regras atualizadas do banco.";
    default: {
      const codigo = typeof error?.code === "string" ? ` (${error.code})` : "";
      return `Não foi possível ${acao} a foto${codigo}. Verifique a conexão e as regras do Realtime Database.`;
    }
  }
}

async function atualizarFotoPerfil(evento) {
  const entrada = evento.target;
  const arquivo = entrada.files?.[0];
  if (!arquivo) return;
  const erro = document.getElementById("profile-photo-error");
  const status = document.getElementById("profile-photo-status");
  const botao = document.getElementById("profile-photo-button");
  erro.hidden = true;
  const validacao = validarFotoPerfil(arquivo);
  if (validacao) {
    erro.textContent = validacao;
    erro.hidden = false;
    entrada.value = "";
    return;
  }

  botao.disabled = true;
  status.textContent = "Comprimindo e salvando foto...";
  try {
    const foto = await comprimirFotoPerfil(arquivo);
    const url = await window.SosFirebase.uploadProfilePhoto(foto);
    const usuario = window.SosFirebase.currentUser();
    if (!usuario) throw new Error("A sessão terminou antes de concluir o envio.");
    perfilContaAtual = {
      ...perfilContaAtual,
      temFoto: true
    };
    const imagem = document.getElementById("profile-avatar");
    await decodificarFotoPerfil(imagem, url);
    imagem.hidden = false;
    document.getElementById("profile-avatar-fallback").hidden = true;
    status.textContent = "Foto atualizada.";
  } catch (error) {
    console.error("Não foi possível atualizar a foto do perfil.", error);
    erro.textContent = error.message === "profile-photo-too-large"
      ? "Não foi possível reduzir a foto para menos de 100 KB. Escolha outra imagem."
      : mensagemErroFoto(error, "salvar");
    erro.hidden = false;
    status.textContent = "";
  } finally {
    entrada.value = "";
    botao.disabled = false;
  }
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
    respostas: [],
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
  estadoQuiz.respostas.push({
    caso: caso.title,
    categoria: caso.categoria,
    respostaEscolhida: caso.options[indiceResposta],
    respostaCorreta: caso.options[caso.answer],
    correta: acertou
  });

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
    participanteUid: window.SosFirebase.currentUser()?.uid,
    nome: estadoQuiz.nome,
    cargo: estadoQuiz.cargo,
    etapa: estadoQuiz.etapa,
    acertos: estadoQuiz.acertos,
    total: casos.length,
    confianca: estadoQuiz.confianca,
    respostas: estadoQuiz.respostas,
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
  const nome = document.getElementById("p-nome");
  if (!nome.readOnly) nome.value = "";
  document.getElementById("reg-form").style.display = "block";
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("result-area").style.display = "none";
  document.getElementById("p-nome").focus();
}

async function salvarChecklist() {
  const participanteUid = document.getElementById("checklist-participant").value;
  const perfil = perfisParticipantes.find((item) => item.uid === participanteUid);
  const erro = document.getElementById("evaluation-error");
  const profissao = profissaoChecklistInstrutor();
  const campoNota = document.getElementById("evaluation-grade");
  const nota = Number(campoNota.value);
  if (!perfil) {
    erro.textContent = "Selecione um perfil antes de salvar a avaliação.";
    erro.hidden = false;
    return;
  }
  if (!CHECKLISTS_INSTRUTOR[profissao]) {
    erro.textContent = "Selecione sua profissão para carregar o checklist correto.";
    erro.hidden = false;
    return;
  }
  if (campoNota.value === "" || !Number.isFinite(nota) || nota < 0 || nota > 10) {
    erro.textContent = "Informe uma nota individual entre 0 e 10.";
    erro.hidden = false;
    campoNota.focus();
    return;
  }

  const itens = [...document.querySelectorAll(".prac-chk")];
  const marcados = itens.filter((item) => item.checked).length;
  const registro = {
    id: novoId(),
    tipo: "pratica",
    participanteUid,
    nome: perfil.nome,
    cargo: perfil.cargo || "Comunidade escolar",
    etapa: "Prática",
    acertos: marcados,
    total: itens.length,
    nota,
    observacao: document.getElementById("evaluation-feedback").value.trim(),
    checklistTipo: profissao,
    checklistItens: CHECKLISTS_INSTRUTOR[profissao],
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
  itens.forEach((item) => { item.checked = false; });
  campoNota.value = "";
  document.getElementById("evaluation-feedback").value = "";
  if (resultado.erroSincronizacao) {
    registrosGestao = obterRegistrosLocais();
    mostrarPainelRegistros(registrosGestao);
    selecionarParticipanteAvaliacao();
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
  const totalSegundos = Math.floor((Date.now() - simulacaoInicio) / 1000);
  const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
  const segundos = String(totalSegundos % 60).padStart(2, "0");
  document.getElementById("call-demo-duration").textContent = `${minutos}:${segundos}`;
}

function limparTimersSimulacao() {
  window.clearTimeout(simulacaoLigacaoTimer);
  window.clearInterval(simulacaoDuracaoTimer);
}

function encerrarSimulacaoLigacao() {
  const demo = document.getElementById("call-demo");
  if (demo.classList.contains("is-ended")) {
    fecharSimulacaoLigacao();
    return;
  }
  limparTimersSimulacao();
  demo.classList.remove("is-ringing", "is-connected");
  demo.classList.add("is-ended");
  document.getElementById("call-demo-status").textContent = "Chamada simulada encerrada";
  document.getElementById("call-demo-action-label").textContent = "Fechar simulação";
  document.getElementById("call-demo-action").setAttribute("aria-label", "Fechar simulação");
}

function fecharSimulacaoLigacao() {
  limparTimersSimulacao();
  document.getElementById("call-demo").classList.remove("is-ringing", "is-connected", "is-ended");
  document.getElementById("call-demo").hidden = true;
  if (focoAnteriorSimulacao?.isConnected) focoAnteriorSimulacao.focus();
  focoAnteriorSimulacao = null;
}

function inicializarAplicativo() {
  mostrarProtocolos();
  atualizarCamposCadastro();
  document.getElementById("signup-password").addEventListener(
    "input",
    atualizarRequisitosSenha
  );
  atualizarRequisitosSenha();
  window.SosFirebase.onAuthStateChanged(
    atualizarTelaAutenticacao,
    (error) => {
      console.error("Não foi possível verificar a sessão Firebase.", error);
      const aviso = document.getElementById("login-error");
      aviso.textContent = "Não foi possível verificar a sessão. Recarregue a página.";
      aviso.hidden = false;
    }
  );
  document.querySelectorAll(".likert-btn").forEach((botao, indice) => {
    botao.classList.toggle("selected", indice === confiancaAtual - 1);
  });
  window.addEventListener("keydown", (evento) => {
    const demo = document.getElementById("call-demo");
    if (demo.hidden) return;
    if (evento.key === "Escape") {
      evento.preventDefault();
      fecharSimulacaoLigacao();
      return;
    }
    if (evento.key === "Tab") {
      evento.preventDefault();
      document.getElementById("call-demo-action").focus();
    }
  });
}

inicializarAplicativo();
