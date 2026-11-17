const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function carregarMetricas(conteudoLocal = "[]", opcoes = {}) {
  const elemento = () => ({
    append() {},
    addEventListener() {},
    replaceChildren() {}
  });
  const contexto = {
    console,
    localStorage: { getItem: () => conteudoLocal },
    document: {
      createElement: opcoes.createElement
        ? (tag) => tag === "canvas" ? opcoes.createElement() : elemento()
        : elemento,
      getElementById: opcoes.getElementById || elemento,
      querySelectorAll: () => []
    },
    window: {
      SosFirebase: { onAuthStateChanged() {} },
      addEventListener() {}
    },
    ...(opcoes.createImageBitmap
      ? { createImageBitmap: opcoes.createImageBitmap }
      : {})
  };
  const script = readFileSync("html/js/script.js", "utf8");
  vm.runInNewContext(
    `${script}\nglobalThis.metricasTeste = { atualizarRequisitosSenha, classificarErroCadastro, comprimirFotoPerfil, dadosAcertosPorCargo, dadosAcertosPorCategoria, dadosRespostasIndividuais, decodificarFotoPerfil, lerRespostaJson, mensagemErroCadastro, obterRegistrosLocais, podeClassificarContaAntiga, precisaClassificarContaAntiga, profissaoInstrutorCanonica, registrosRecentesDoUsuario, rotuloProfissaoInstrutor, validarFotoPerfil, validarRequisitosSenha };`,
    contexto
  );
  return contexto.metricasTeste;
}

test("categoriza respostas antigas pelo caso e separa pré e pós-teste", () => {
  const { dadosAcertosPorCategoria } = carregarMetricas();
  const questionarios = [
    {
      etapa: "Pré-Teste",
      respostas: [
        { caso: "Engasgo durante o lanche", correta: false },
        { caso: "Queimadura", correta: true },
        { caso: "Caso removido do treinamento", correta: true }
      ]
    },
    {
      etapa: "Pós-Teste",
      respostas: [
        {
          caso: "Caso com título atualizado",
          categoria: "Engasgo e vias aéreas",
          correta: true
        }
      ]
    }
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(dadosAcertosPorCategoria(questionarios, "Pré-Teste"))),
    [
      { rotulo: "Engasgo e vias aéreas", valor: 0, exibicao: "0% · 0/1" },
      { rotulo: "Queimaduras", valor: 100, exibicao: "100% · 1/1" }
    ]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(dadosAcertosPorCategoria(questionarios, "Pós-Teste"))),
    [{ rotulo: "Engasgo e vias aéreas", valor: 100, exibicao: "100% · 1/1" }]
  );
});

test("agrupa resultados por função usando média ponderada de questões", () => {
  const { dadosAcertosPorCargo } = carregarMetricas();

  assert.deepEqual(
    JSON.parse(JSON.stringify(dadosAcertosPorCargo([
      { cargo: "Professor(a)", acertos: 7, total: 8 },
      { cargo: "Professor(a)", acertos: 5, total: 8 },
      { cargo: "Gestão Escolar", acertos: 1, total: 4 },
      { cargo: "", acertos: 2, total: 4 }
    ]))),
    [
      { rotulo: "Função não informada", valor: 50, exibicao: "50% · 1 questionário(s)" },
      { rotulo: "Gestão Escolar", valor: 25, exibicao: "25% · 1 questionário(s)" },
      { rotulo: "Professor(a)", valor: 75, exibicao: "75% · 2 questionário(s)" }
    ]
  );
});

test("prepara respostas individuais para o gráfico do perfil", () => {
  const { dadosRespostasIndividuais } = carregarMetricas();

  assert.deepEqual(
    JSON.parse(JSON.stringify(dadosRespostasIndividuais({
      respostas: [
        { caso: "Engasgo", respostaEscolhida: "Pedir ajuda", correta: true },
        { caso: "Queimadura", respostaEscolhida: "Aplicar gelo", correta: false },
        { caso: "Registro antigo", correta: "sim" }
      ]
    }))),
    [
      {
        rotulo: "Engasgo",
        valor: 100,
        exibicao: "Correta",
        estado: "correta",
        detalhe: "Resposta escolhida: Pedir ajuda"
      },
      {
        rotulo: "Queimadura",
        valor: 0,
        exibicao: "Rever",
        estado: "incorreta",
        detalhe: "Resposta escolhida: Aplicar gelo"
      }
    ]
  );
});

test("filtra testes do usuário, remove duplicados e ordena os mais recentes", () => {
  const { registrosRecentesDoUsuario } = carregarMetricas();
  const testes = [
    { id: "antigo", tipo: "questionario", uid: "user-1", criadoEm: "2026-01-01" },
    { id: "novo", tipo: "questionario", participanteUid: "user-1", criadoEm: "2026-02-01" },
    { id: "novo", tipo: "questionario", uid: "user-1", criadoEm: "2026-03-01" },
    { id: "outro", tipo: "questionario", uid: "user-2", criadoEm: "2026-04-01" },
    { id: "pratica", tipo: "pratica", participanteUid: "user-1", criadoEm: "2026-05-01" }
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(registrosRecentesDoUsuario(testes, "user-1"))),
    [
      { id: "pratica", tipo: "pratica", participanteUid: "user-1", criadoEm: "2026-05-01" },
      { id: "novo", tipo: "questionario", uid: "user-1", criadoEm: "2026-03-01" },
      { id: "antigo", tipo: "questionario", uid: "user-1", criadoEm: "2026-01-01" }
    ]
  );
});

test("validates photo format and upload size", () => {
  const { validarFotoPerfil } = carregarMetricas();
  assert.equal(validarFotoPerfil({ type: "image/png", size: 1024 }), "");
  assert.match(validarFotoPerfil({ type: "image/svg+xml", size: 1024 }), /JPEG, PNG ou WebP/);
  assert.match(validarFotoPerfil({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }), /5 MB/);
});

test("validates every signup password requirement independently", () => {
  const { validarRequisitosSenha } = carregarMetricas();
  assert.deepEqual(JSON.parse(JSON.stringify(validarRequisitosSenha(""))), {
    length: false,
    uppercase: false,
    special: false,
    number: false
  });
  assert.deepEqual(JSON.parse(JSON.stringify(validarRequisitosSenha("Abc!1"))), {
    length: false,
    uppercase: true,
    special: true,
    number: true
  });
  assert.deepEqual(JSON.parse(JSON.stringify(validarRequisitosSenha("abcdef"))), {
    length: true,
    uppercase: false,
    special: false,
    number: false
  });
  assert.deepEqual(JSON.parse(JSON.stringify(validarRequisitosSenha("Abc!12"))), {
    length: true,
    uppercase: true,
    special: true,
    number: true
  });
  assert.equal(validarRequisitosSenha("Abc 12").special, false);
});

test("enables signup only when all password requirements are met", () => {
  const ids = [
    "signup-password",
    "signup-password-rule-length",
    "signup-password-status-length",
    "signup-password-rule-uppercase",
    "signup-password-status-uppercase",
    "signup-password-rule-special",
    "signup-password-status-special",
    "signup-password-rule-number",
    "signup-password-status-number",
    "signup-submit"
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, {
    value: "",
    textContent: "",
    addEventListener() {},
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      }
    }
  }]));
  const { atualizarRequisitosSenha } = carregarMetricas("[]", {
    getElementById: (id) => elements[id] || {
      addEventListener() {},
      append() {},
      replaceChildren() {},
      classList: { toggle() {} }
    }
  });

  assert.equal(atualizarRequisitosSenha(), false);
  assert.equal(elements["signup-submit"].disabled, true);
  assert.equal(
    elements["signup-password-rule-length"].classList.values.has("is-pending"),
    true
  );
  elements["signup-password"].value = "Abc!12";
  assert.equal(atualizarRequisitosSenha(), true);
  assert.equal(elements["signup-submit"].disabled, false);
  assert.equal(
    elements["signup-password-rule-uppercase"].classList.values.has("is-valid"),
    true
  );
  assert.equal(elements["signup-password-status-special"].textContent, "Atendido");
});

test("compresses profile photos into JPEG data URLs smaller than 100 KB", async () => {
  let bitmapClosed = false;
  const contextoCanvas = {
    fillRect() {},
    drawImage() {}
  };
  const canvas = {
    getContext: () => contextoCanvas,
    toDataURL(type, quality) {
      assert.equal(type, "image/jpeg");
      const payload = quality <= 0.46 ? "A".repeat(200) : "A".repeat(110_000);
      return `data:image/jpeg;base64,${payload}`;
    }
  };
  const { comprimirFotoPerfil } = carregarMetricas("[]", {
    createElement: () => canvas,
    createImageBitmap: async () => ({
      width: 1600,
      height: 1200,
      close() { bitmapClosed = true; }
    })
  });

  const foto = await comprimirFotoPerfil({ type: "image/png" });
  assert.match(foto, /^data:image\/jpeg;base64,/);
  assert.ok(foto.length < 100_000);
  assert.equal(bitmapClosed, true);
});

test("maps Firebase signup permission, domain, and duplicate-email errors for the screen", () => {
  const { classificarErroCadastro, mensagemErroCadastro } = carregarMetricas();
  assert.equal(
    classificarErroCadastro({ code: "database/permission-denied" }),
    "database-permission-denied"
  );
  assert.equal(
    classificarErroCadastro({ code: "auth/unauthorized-domain" }),
    "auth-unauthorized-domain"
  );
  assert.equal(
    classificarErroCadastro({ code: "auth/email-already-in-use" }),
    "email-already-registered"
  );
  assert.match(mensagemErroCadastro({ code: "database/permission-denied" }), /Realtime Database/);
  assert.match(mensagemErroCadastro({ code: "auth/unauthorized-domain" }), /Domínios/);
  assert.match(mensagemErroCadastro({ code: "auth/email-already-in-use" }), /já possui/);
  assert.equal(mensagemErroCadastro({ message: "invalid-access-code" }), "Código de acesso inválido.");
});

test("supports the access-code profession values in instructor profiles", () => {
  const { profissaoInstrutorCanonica, rotuloProfissaoInstrutor } = carregarMetricas();
  assert.equal(profissaoInstrutorCanonica("saude"), "profissional-saude");
  assert.equal(profissaoInstrutorCanonica("resgate"), "profissional-seguranca-resgate");
  assert.equal(rotuloProfissaoInstrutor("saude"), "Profissional de Saúde");
  assert.equal(rotuloProfissaoInstrutor("resgate"), "Profissional de Segurança/Resgate");
});

test("waits for profile images to decode before displaying them", async () => {
  const { decodificarFotoPerfil } = carregarMetricas();
  const image = {
    src: "",
    decode: async () => {}
  };

  await decodificarFotoPerfil(image, "https://example.test/avatar");
  assert.equal(image.src, "https://example.test/avatar");
  await assert.rejects(
    decodificarFotoPerfil({ src: "", decode: async () => { throw new Error("broken"); } }, "broken"),
    /broken/
  );
});

test("does not ask classified participants for instructor codes", () => {
  const { podeClassificarContaAntiga, precisaClassificarContaAntiga } = carregarMetricas();
  assert.equal(precisaClassificarContaAntiga({ perfil: "equipe", cargo: "Professor(a)" }), false);
  assert.equal(precisaClassificarContaAntiga({ perfil: "instruido" }), false);
  assert.equal(precisaClassificarContaAntiga({ perfil: "instrutor" }), true);
  assert.equal(precisaClassificarContaAntiga(null), false);
  assert.equal(podeClassificarContaAntiga({ perfil: "equipe", cargo: "Professor(a)" }, false), false);
  assert.equal(podeClassificarContaAntiga({ perfil: "instruido" }, false), false);
  assert.equal(
    podeClassificarContaAntiga({ perfil: "equipe", cargo: "Professor(a)" }, false, true),
    true
  );
  assert.equal(podeClassificarContaAntiga({}, false), true);
  assert.equal(podeClassificarContaAntiga({}, true), true);
});

test("shows a clear message when local or API data contains invalid JSON", async () => {
  const { lerRespostaJson, obterRegistrosLocais } = carregarMetricas("{");

  assert.throws(
    () => obterRegistrosLocais(),
    /histórico salvo neste aparelho está inválido/
  );
  await assert.rejects(
    lerRespostaJson({ status: 502, text: async () => "<html>gateway error</html>" }),
    /invalid-server-response:502/
  );
});
