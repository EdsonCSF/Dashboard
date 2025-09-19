const API_KEY = 'd40eb0d5d00c65022d9ecaf3678c39f2'; //  SUBSTITUA PELA SUA CHAVE REAL!
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Estado de paginação
const paginationState = {
    launches: { page: 1, hasMore: true, endpoint: '/discover/movie?sort_by=release_date.desc&vote_count.gte=10' },
    filterResults: { page: 1, hasMore: true, endpoint: '', items: [] }
};

//  Função principal de busca na API
async function fetchFromAPI(endpoint, page = 1) {
    try {
        const res = await fetch(`${BASE_URL}${endpoint}&page=${page}&api_key=${API_KEY}&language=pt-BR`);
        if (!res.ok) throw new Error(`Erro: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("API Error:", err);
        return { results: [], page: 1, total_pages: 1 };
    }
}

// Renderiza cards
function renderCards(items, containerId, append = false) {
    const container = document.getElementById(containerId);
    if (!append) container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = `<div class="no-results">Nada encontrado. Tente outro filtro!</div>`;
        return;
    }

    items.forEach((item, index) => {
        const isMovie = item.media_type !== 'tv';
        const date = isMovie ? item.release_date : item.first_air_date;
        const formattedDate = date ? new Date(date).toLocaleDateString('pt-BR') : 'Indisponível';
        const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const title = item.title || item.name || 'Sem título';

        const card = document.createElement('div');
        card.className = 'card-hq';
        card.innerHTML = `
            <img class="card-poster" src="${IMG_BASE_URL}${item.poster_path || '/no-poster'}" alt="${title}" onerror="this.src='https://via.placeholder.com/500x750/444/fff?text=SEM+POSTER'">
            <h3 class="card-title">${title}</h3>
            <div class="card-info">
                <i class="fas fa-calendar"></i> ${formattedDate} • ${isMovie ? ' Filme' : ' Série'}
            </div>
            <p class="card-synopsis">${item.overview.substring(0, 100)}...</p>
            <div class="card-rating">
                <i class="fas fa-star"></i> ${vote}/10
            </div>
        `;
        container.appendChild(card);

        // Animação
        setTimeout(() => {
            gsap.to(card, { duration: 0.5, y: 0, opacity: 1, ease: "power2.out", delay: index * 0.1 });
        }, 100);

        // Modal
        card.addEventListener('click', () => openModal(item, isMovie ? 'movie' : 'tv'));
    });
}

//  Carrega mais itens (paginação)
async function loadMore(sectionKey) {
    const state = paginationState[sectionKey];
    if (!state.hasMore) return;

    state.page++;
    const data = await fetchFromAPI(state.endpoint, state.page);
    renderCards(data.results, sectionKey === 'filterResults' ? 'filter-results' : sectionKey, true);
    state.hasMore = state.page < data.total_pages;
}

//  APLICA FILTRO PRINCIPAL (todos os botões funcionam!)
async function applyFilter(filterType) {
    let endpoint = '';

    switch(filterType) {
        case 'movie':
            endpoint = '/discover/movie?sort_by=popularity.desc&vote_count.gte=50';
            break;
        case 'tv':
            endpoint = '/discover/tv?sort_by=popularity.desc&vote_count.gte=50';
            break;
        case 'upcoming':
            endpoint = '/movie/upcoming?sort_by=popularity.desc';
            break;
        case 'trending':
            endpoint = '/trending/movie/day?sort_by=popularity.desc';
            break;
        case 'top_rated':
            endpoint = '/movie/top_rated?vote_count.gte=100';
            break;
        default:
            endpoint = '/discover/movie?sort_by=release_date.desc&vote_count.gte=10';
    }

    // Atualiza estado
    paginationState.filterResults.page = 1;
    paginationState.filterResults.endpoint = endpoint;

    // Busca dados
    const data = await fetchFromAPI(endpoint, 1);

    // Mostra resultados
    const resultsSection = document.getElementById('filter-results-section');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    renderCards(data.results, 'filter-results', false);
    paginationState.filterResults.hasMore = data.page < data.total_pages;
}

//  Carrega lançamentos iniciais
async function loadLaunches() {
    const data = await fetchFromAPI(paginationState.launches.endpoint, 1);
    renderCards(data.results, 'launches', false);
    paginationState.launches.hasMore = data.page < data.total_pages;
}

//  Modal de detalhes
async function openModal(item, type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    try {
        const res = await fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}&language=pt-BR&append_to_response=videos`);
        const details = await res.json();

        const date = type === 'movie' ? details.release_date : details.first_air_date;
        const formattedDate = date ? new Date(date).toLocaleDateString('pt-BR') : 'Indisponível';

        modalBody.innerHTML = `
            <h2 class="modal-title">${details.title || details.name}</h2>
            <img class="modal-poster" src="${IMG_BASE_URL}${details.poster_path}" alt="" style="width:100%; max-height:400px; object-fit:cover; border-radius:10px; margin:1rem 0">
            <p><strong>Data:</strong> ${formattedDate}</p>
            <p><strong>Nota:</strong> ${details.vote_average?.toFixed(1) || 'N/A'}/10</p>
            <p><strong>Sinopse:</strong> ${details.overview || 'Indisponível.'}</p>
            ${details.videos?.results?.[0] ? `
                <h3> Trailer</h3>
                <iframe width="100%" height="315" src="https://www.youtube.com/embed/${details.videos.results[0].key}" frameborder="0" allowfullscreen></iframe>
            ` : ''}
        `;
    } catch (err) {
        modalBody.innerHTML = `<p style="color:red; text-align:center">Erro ao carregar detalhes.</p>`;
    }

    modal.style.display = 'block';
}

// Fecha modal
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.close')?.addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) {
            document.getElementById('modal').style.display = 'none';
        }
    });
});

//  INICIALIZA TUDO
document.addEventListener('DOMContentLoaded', async () => {
    // Remove splash após 2s (garantido)
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) splash.remove();
        gsap.from(".logo-container h1", { duration: 1, y: -30, opacity: 0, ease: "power2.out" });
    }, 2000);

    // Carrega lançamentos iniciais
    await loadLaunches();

    //  EVENTOS DOS BOTÕES DE FILTRO — TODOS FUNCIONAM!
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilter(btn.dataset.filter);
        });
    });

    // Botões "Carregar Mais"
    document.getElementById('load-more-launches')?.addEventListener('click', () => loadMore('launches'));
    document.getElementById('load-more-filter')?.addEventListener('click', () => loadMore('filterResults'));
});