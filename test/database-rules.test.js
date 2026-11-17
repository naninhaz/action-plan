const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const rules = JSON.parse(readFileSync("database.rules.json", "utf8")).rules;

test("allows only an authenticated user to write their own profile", () => {
  const profileRules = rules.sos_escola_profiles.$uid;
  assert.equal(profileRules[".write"], "auth != null && auth.uid === $uid");
  assert.match(profileRules[".validate"], /newData\.child\('perfil'\)\.val\(\) === data\.child\('perfil'\)\.val\(\)/);
  assert.match(profileRules[".validate"], /newData\.child\('tipo'\)\.val\(\) === 'equipe'/);
  assert.match(profileRules[".validate"], /tipoCadastroSolicitado/);
});

test("restricts profile photos to small JPEG data URLs", () => {
  const photoValidation = rules.sos_escola_profiles.$uid.foto[".validate"];
  assert.match(photoValidation, /newData\.isString\(\)/);
  assert.match(photoValidation, /newData\.val\(\)\.length < 100000/);
  assert.match(photoValidation, /data:image/);
});
