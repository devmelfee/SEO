import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLink, firstName, formatCnpj, isPrivateAddress, isValidCnpj, linkKind, mapBrasilApi, samePhone } from "./contact.ts";

test("CNPJ: dígitos verificadores", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11222333000182"), false);
  assert.equal(isValidCnpj("00000000000000"), false);
  assert.equal(isValidCnpj("123"), false);
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
});

test("BrasilAPI → dados da empresa e decisores", () => {
  const c = mapBrasilApi({
    cnpj: "11222333000181", razao_social: "PET FELIZ LTDA", nome_fantasia: "PET FELIZ", descricao_situacao_cadastral: "ATIVA",
    data_inicio_atividade: "2015-03-02", cnae_fiscal_descricao: "Comércio varejista de animais vivos", ddd_telefone_1: "1145210000", ddd_telefone_2: "",
    email: "CONTATO@PETFELIZ.COM.BR", logradouro: "RUA DO RETIRO", numero: "123", bairro: "VILA ARENS", municipio: "JUNDIAI", uf: "SP",
    qsa: [{ nome_socio: "MARIA DA SILVA", qualificacao_socio: "Sócio-Administrador" }, { nome_socio: "JOAO SOUZA", qualificacao_socio: "Sócio" }],
  });
  assert.equal(c.status, "ATIVA");
  assert.deepEqual(c.phones, ["1145210000"]);
  assert.equal(c.email, "contato@petfeliz.com.br");
  assert.deepEqual(c.partners.map((p) => p.decision_maker), [true, false]);
  assert.equal(firstName(c.partners[0].name), "Maria");
});

test("telefone confere ignorando 55, 0 e o 9 extra", () => {
  assert.equal(samePhone("(11) 4521-0000", "1145210000"), true);
  assert.equal(samePhone("+55 11 98888-7777", "011 8888-7777"), true);
  assert.equal(samePhone("(11) 4521-0000", "(19) 4521-0000"), false);
  assert.equal(samePhone("", "1145210000"), false);
});

test("links: rede social só é conclusiva com 404", () => {
  assert.equal(linkKind("https://www.instagram.com/petfeliz"), "instagram");
  assert.equal(classifyLink("https://instagram.com/x", 200, null).state, "nao_verificavel");
  assert.equal(classifyLink("https://instagram.com/x", 404, null).state, "nao_encontrado");
  assert.equal(classifyLink("https://petfeliz.com.br", 200, null).state, "ok");
  assert.equal(classifyLink("https://petfeliz.com.br", null, null).state, "fora_do_ar");
  assert.equal(classifyLink("https://petfeliz.com.br", 503, null).state, "fora_do_ar");
  assert.equal(classifyLink("https://petfeliz.com.br", 403, null).state, "nao_verificavel");
});

test("endereços internos bloqueados", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1"]) assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ["8.8.8.8", "172.32.0.1", "2804:14c::1"]) assert.equal(isPrivateAddress(ip), false, ip);
});
