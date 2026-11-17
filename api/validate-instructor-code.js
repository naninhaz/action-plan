const { criarServicosFirebase } = require("./firebase-admin");
const {
  identificarProfissaoInstrutor,
  registrarLimite
} = require("./register");

const CODE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_CODES = 5;

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function obterIpCliente(req) {
  const realIp = req.headers["x-real-ip"];
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean).at(-1) || "";
  }
  return "";
}

function criarHandlerValidacaoCodigo(obterServicos = criarServicosFirebase) {
  return async function validarCodigoInstrutor(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return respond(res, 405, { error: "method-not-allowed" });
    }

    if (Number(req.headers["content-length"] || 0) > 1024) {
      return respond(res, 413, { error: "request-too-large" });
    }
    if (!String(req.headers["content-type"] || "").includes("application/json")) {
      return respond(res, 415, { error: "json-required" });
    }

    const codigo = req.body && typeof req.body.codigo === "string"
      ? req.body.codigo
      : "";
    if (!codigo || codigo.length > 128) {
      return respond(res, 400, { error: "invalid-instructor-code" });
    }

    let services;
    try {
      services = obterServicos();
    } catch (error) {
      console.error("Firebase instructor code validation is not configured.", error);
      return respond(res, 503, { error: "classification-unavailable" });
    }

    const codigosEsperados = {
      "profissional-saude": process.env.HEALTH_INSTRUCTOR_SIGNUP_CODE,
      "profissional-seguranca-resgate": process.env.RESCUE_INSTRUCTOR_SIGNUP_CODE
    };
    if (
      !Object.values(codigosEsperados).every(Boolean) ||
      codigosEsperados["profissional-saude"] ===
        codigosEsperados["profissional-seguranca-resgate"]
    ) {
      console.error("Health and rescue instructor signup codes are not fully configured.");
      return respond(res, 503, { error: "classification-unavailable" });
    }

    const profession = identificarProfissaoInstrutor(codigo, codigosEsperados);
    if (profession) {
      return respond(res, 200, { valid: true });
    }

    const ip = obterIpCliente(req);
    if (!ip) return respond(res, 503, { error: "classification-unavailable" });
    try {
      const limite = await registrarLimite(
        services.database,
        ip,
        services.chaveHash,
        "codigos",
        MAX_FAILED_CODES,
        CODE_LIMIT_WINDOW_MS
      );
      if (limite.bloqueado) {
        res.setHeader("Retry-After", String(limite.segundosParaTentar));
        return respond(res, 429, { error: "too-many-code-attempts" });
      }
    } catch (error) {
      console.error("Could not enforce instructor code validation rate limit.", error);
      return respond(res, 503, { error: "classification-unavailable" });
    }
    return respond(res, 403, { error: "invalid-instructor-code" });
  };
}

module.exports = criarHandlerValidacaoCodigo();
module.exports.criarHandlerValidacaoCodigo = criarHandlerValidacaoCodigo;
