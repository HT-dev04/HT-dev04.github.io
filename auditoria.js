// A demonstração da auditoria encadeada do Avontz Docs, em miniatura.
// Cada registro guarda hash(n) = SHA-256(hash(n-1) | quando | quem | ação). A conferência recalcula a cadeia
// inteira a partir do primeiro registro e compara com o que foi gravado: alterar uma linha antiga faz ela e
// todas as seguintes deixarem de bater, mesmo que o resto do log continue igual.

const REGISTROS = [
  { quando: "03/11 09:12", quem: "ana.souza", acao: "Criou o processo 1482/2026" },
  { quando: "03/11 09:40", quem: "ana.souza", acao: "Anexou contrato.pdf" },
  { quando: "04/11 14:05", quem: "joao.lima", acao: "Assinou com certificado A1" },
  { quando: "05/11 10:31", quem: "marcia.reis", acao: "Abriu o documento" },
  { quando: "06/11 16:58", quem: "joao.lima", acao: "Arquivou o processo" },
];

const RAIZ = "0".repeat(64);

async function sha256(texto) {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cadeia(registros) {
  const hashes = [];
  let anterior = RAIZ;
  for (const r of registros) {
    anterior = await sha256(`${anterior}|${r.quando}|${r.quem}|${r.acao}`);
    hashes.push(anterior);
  }
  return hashes;
}

const curto = (h) => h.slice(0, 10);

async function iniciar() {
  const demo = document.querySelector(".demo");
  if (!demo || !window.crypto?.subtle) return;
  const corpo = demo.querySelector("tbody");
  const estado = demo.querySelector(".demo-estado");
  const restaurar = demo.querySelector(".demo-restaurar");

  const gravados = await cadeia(REGISTROS);
  const atuais = REGISTROS.map((r) => ({ ...r }));

  corpo.innerHTML = "";
  const linhas = atuais.map((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="demo-n">${i + 1}</td>
      <td class="demo-mono">${r.quando}</td>
      <td class="demo-mono">${r.quem}</td>
      <td><input class="demo-acao" type="text" spellcheck="false" aria-label="Ação do registro ${i + 1}"></td>
      <td class="demo-mono demo-gravado">${curto(gravados[i])}</td>
      <td class="demo-mono demo-recalc"></td>`;
    const campo = tr.querySelector("input");
    campo.value = r.acao;
    campo.addEventListener("input", () => {
      atuais[i].acao = campo.value;
      conferir();
    });
    corpo.appendChild(tr);
    return tr;
  });

  let rodada = 0;
  async function conferir() {
    const minha = ++rodada;
    const recalculados = await cadeia(atuais);
    if (minha !== rodada) return; // chegou uma digitação mais nova no meio
    let primeiroErro = -1;
    recalculados.forEach((h, i) => {
      const confere = h === gravados[i];
      if (!confere && primeiroErro < 0) primeiroErro = i;
      const tr = linhas[i];
      tr.querySelector(".demo-recalc").textContent = curto(h);
      tr.classList.toggle("quebrado", !confere);
      tr.classList.toggle("origem", i === primeiroErro && !confere);
    });
    const alterado = atuais.some((r, i) => r.acao !== REGISTROS[i].acao);
    restaurar.hidden = !alterado;
    if (primeiroErro < 0) {
      estado.textContent = `A cadeia confere: os ${REGISTROS.length} registros batem com os hashes gravados.`;
      estado.classList.remove("alerta");
    } else {
      const depois = REGISTROS.length - primeiroErro - 1;
      estado.textContent =
        `O registro ${primeiroErro + 1} foi alterado depois de gravado` +
        (depois > 0 ? `, e os ${depois} seguintes perdem a âncora junto. ` : ". ") +
        "Para esconder isso seria preciso reescrever todos os hashes dali para frente.";
      estado.classList.add("alerta");
    }
  }

  restaurar.addEventListener("click", () => {
    linhas.forEach((tr, i) => {
      atuais[i].acao = REGISTROS[i].acao;
      tr.querySelector("input").value = REGISTROS[i].acao;
    });
    conferir();
  });

  conferir();
}

iniciar();
