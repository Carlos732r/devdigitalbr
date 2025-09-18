// Importações do Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore"; 

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBvos9nCRithcUX768xuwQZ70p1_xgmKOg",
  authDomain: "gestao-financeira-9e033.firebaseapp.com",
  projectId: "gestao-financeira-9e033",
  storageBucket: "gestao-financeira-9e033.appspot.com",
  messagingSenderId: "694364024644",
  appId: "1:694364024644:web:1758bd0d4a47b71b93b111",
  measurementId: "G-PNL027GT4B"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Referência da coleção
const transacoesRef = collection(db, "usuarios"); // /usuarios é o caminho da coleção

// Função para adicionar transação
async function adicionarTransacao(transacao) {
  try {
    await addDoc(transacoesRef, transacao);
    listarTransacoes(); // Atualiza a lista
  } catch (error) {
    console.error("Erro ao adicionar transação: ", error);
  }
}

// Função para listar transações e atualizar totais
async function listarTransacoes() {
  const snapshot = await getDocs(transacoesRef);
  let totalReceitas = 0;
  let totalDespesas = 0;

  const tbody = document.getElementById("transaction-table-body");
  const emptyState = document.getElementById("empty-state");
  tbody.innerHTML = "";

  if(snapshot.empty) {
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  snapshot.forEach(doc => {
    const t = doc.data();
    const row = `<tr>
      <td>${t.descricao}</td>
      <td>${t.motivo}</td>
      <td>R$ ${parseFloat(t.valor).toFixed(2)}</td>
      <td>${t.tipo}</td>
      <td>${t.data}</td>
      <td>
        <!-- Futuras ações como editar ou remover -->
        <button class="btn-edit" disabled>Editar</button>
        <button class="btn-delete" disabled>Remover</button>
      </td>
    </tr>`;
    tbody.innerHTML += row;

    if(t.tipo === "Receita") totalReceitas += parseFloat(t.valor);
    else totalDespesas += parseFloat(t.valor);
  });

  // Atualiza os totais na página
  document.getElementById("totalReceitas").textContent = `R$ ${totalReceitas.toFixed(2)}`;
  document.getElementById("totalDespesas").textContent = `R$ ${totalDespesas.toFixed(2)}`;
  document.getElementById("saldoAtual").textContent = `R$ ${(totalReceitas - totalDespesas).toFixed(2)}`;
}

// Captura o submit do formulário
document.getElementById("formTransacao").addEventListener("submit", (e) => {
  e.preventDefault();
  const descricao = document.getElementById("descricao").value;
  const motivo = document.getElementById("motivo").value;
  const valor = document.getElementById("valor").value;
  const tipo = document.getElementById("tipo").value;

  if(!descricao || !valor) {
    alert("Preencha descricao e valor!");
    return;
  }

  // Adiciona a data automaticamente
  const dataAtual = new Date().toLocaleDateString("pt-BR");

  adicionarTransacao({ descricao, motivo, valor, tipo, data: dataAtual });
  e.target.reset();
});

// Chama listarTransacoes quando a página carrega
window.onload = () => {
  listarTransacoes();
};
