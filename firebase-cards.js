// firebase-cards.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.2.0/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwoIy3rm3YFhqQqbAZhGonQuowCvKH6K0",
  authDomain: "gmanhwahub.firebaseapp.com",
  projectId: "gmanhwahub",
  storageBucket: "gmanhwahub.firebasestorage.app",
  messagingSenderId: "116051407928",
  appId: "1:116051407928:web:760f89d14a595ba88ea2cd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 Compartilhar Card (função global)
window.compartilharCard = async function(manga) {
  showNotification("📤 Enviando card para o servidor...");
  try {
    const cardsRef = collection(db, "cards");
    const q = query(cardsRef, where("title", "==", manga.title));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await addDoc(cardsRef, manga);
      showNotification("✅ Card compartilhado com sucesso!");
    } else {
      showNotification("⚠️ Este card já existe no servidor!");
    }
  } catch (e) {
    console.error("Erro ao compartilhar card: ", e);
    showNotification("❌ Erro ao compartilhar card.");
  }
};

// 🔹 Buscar Cards e Exibir no Modal
window.buscarCards = async function() {
  showNotification("🔎 Buscando cards no servidor...");

  try {
    const querySnapshot = await getDocs(collection(db, "cards"));
    const cards = [];
    querySnapshot.forEach((doc) => {
      cards.push({ id: doc.id, ...doc.data() });
    });

    if (cards.length === 0) {
      showNotification("⚠️ Nenhum card encontrado no servidor.");
      return;
    }

    // Cria o modal dinamicamente
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div class="modal" id="cards-modal">
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>Cards do Servidor</h2>
          <div id="modal-cards-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modalContent);

    const modal = document.getElementById('cards-modal');
    const modalList = document.getElementById('modal-cards-list');
    const closeBtn = modal.querySelector('.close-btn');

    // Preenche o modal com a lista de cards
    cards.forEach(card => {
      const div = document.createElement("div");
      div.classList.add("modal-card-item");
      div.innerHTML = `
        <img src="${card.imageLink || ''}" alt="Capa" style="max-width:50px; margin-right: 10px;">
        <h4>${card.title || "Sem título"}</h4>
        <button class="tool-btn importar-btn" data-id="${card.id}">📥 Importar</button>
      `;
      modalList.appendChild(div);

      div.querySelector(".importar-btn").addEventListener("click", () => {
        window.importarCard(card);
        modal.style.display = "none"; // Fecha o modal após a importação
        modalContent.remove(); // Remove o modal do DOM
      });
    });

    // Exibe o modal e adiciona o evento de fechar
    modal.style.display = "block";
    closeBtn.onclick = () => {
      modal.style.display = "none";
      modalContent.remove();
    };

    // Fechar o modal clicando fora
    window.onclick = (event) => {
      if (event.target == modal) {
        modal.style.display = "none";
        modalContent.remove();
      }
    };

    showNotification(`✅ ${cards.length} card(s) carregado(s)!`);
  } catch (e) {
    console.error("Erro ao buscar cards: ", e);
    showNotification("❌ Erro ao buscar cards.");
  }
};

// 🔹 Função para importar um card específico e evitar duplicação local
window.importarCard = function(card) {
  // Verifica se o card já existe na lista local antes de adicionar.
  const cardExiste = mangas.some(m => m.title === card.title);

  if (!cardExiste) {
    mangas.push(card);
    saveMangas();
    renderMangas();
    showNotification("📥 Card importado com sucesso!");
  } else {
    showNotification("⚠️ Este card já existe na sua lista!");
  }
};

// 🔹 Listener automático
document.addEventListener("DOMContentLoaded", () => {
  const buscarBtn = document.getElementById("buscar-cards-btn");
  if (buscarBtn) {
    buscarBtn.addEventListener("click", window.buscarCards);
  }

  const scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", () => {
      if (document.documentElement.scrollTop > 200) {
        scrollBtn.style.display = "block";
      } else {
        scrollBtn.style.display = "none";
      }
    });

    scrollBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
