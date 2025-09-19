const API_KEY = 'd40eb0d5d00c65022d9ecaf3678c39f2'; //  SUBSTITUA PELA SUA CHAVE REAL!
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Estado de paginação para cada seção
const paginationState = {
    launches: { page: 1, hasMore: true, endpoint: '/discover/movie?primary_release_date.gte=2025-04-01&primary_release_date.lte=2025-04-30&sort_by=popularity.desc', mediaType: 'movie' },
    trending: { page: 1, hasMore: true, endpoint: '/trending/all/day', mediaType: null },
    topRated: { page: 1, hasMore: true, endpoint: '/movie/top_rated', mediaType: 'movie' },
    filterResults: { page: 1, hasMore: true, endpoint: '', mediaType: null, isFiltered: false }
};

let allItems = [];

// Carrega gêneros
async function loadGenres() {
    try {
        const [movies, tvs] = await Promise.all([
            fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`).then(r => r.json()),
            fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=pt-BR`).then(r => r.json())
        ]);
        const genres = [...movies.genres, ...tvs.genres];
        const select = document.getElementById('filter-genre');
        genres.forEach(genre => {
            const opt = document.createElement('option');
            opt.value = genre.id;
            opt.textContent = genre.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Erro ao carregar gêneros:", err);
    }
}

// Busca dados da API
async function fetchData(endpoint, page = 1) {
    try {
        const res = await fetch(`${BASE_URL}${endpoint}&page=${page}&api_key=${API_KEY}&language=pt-BR`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Erro na API:", err);
        return { results: [], page: 1, total_pages: 1 };
    }
}

// Renderiza cards
function renderCards(items, containerId, append = false) {
    const container = document.getElementById(containerId);
    if (!append) container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = `<div class="no-results">Nenhum resultado encontrado.</div>`;
        return;
    }

    items.forEach((item, index) => {
        const isMovie = item.media_type === 'movie' || (item.title && !item.name);
        const date = isMovie ? item.release_date : item.first_air_date;
        const formattedDate = date ? new Date(date).toLocaleDateString('pt-BR') : 'Indisponível';
        const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const title = item.title || item.name || 'Sem título';

        const card = document.createElement('div');
        card.className = 'card-hq';
        card.dataset.id = item.id;
        card.dataset.type = isMovie ? 'movie' : 'tv';
        card.innerHTML = `
            <img class="card-poster" src="${IMG_BASE_URL}${item.poster_path || ''}" alt="${title}" onerror="this.src='https://via.placeholder.com/500x750/333/fff?text=SEM+POSTER'">
            <h3 class="card-title">${title}</h3>
            <div class="card-info">
                <i class="fas fa-calendar"></i> ${formattedDate} • ${isMovie ? ' Filme' : ' Série'}
            </div>
            <p class="card-synopsis">${item.overview || 'Sinopse indisponível.'}</p>
            <div class="card-rating">
                <i class="fas fa-star"></i> ${vote}/10
            </div>
        `;
        container.appendChild(card);

        setTimeout(() => {
            gsap.to(card, { duration: 0.6, y: 0, opacity: 1, ease: "power2.out", delay: index * 0.1 });
        }, 100);

        card.addEventListener('click', () => openModal(item, isMovie ? 'movie' : 'tv'));
    });
}

// Carrega mais para uma seção
async function loadMore(sectionKey) {
    const state = paginationState[sectionKey];
    if (!state.hasMore) return;

    state.page++;
    const data = await fetchData(state.endpoint, state.page);
    const items = data.results.map(item => ({
        ...item,
        media_type: state.mediaType || (item.title ? 'movie' : 'tv')
    }));

    state.hasMore = state.page < data.total_pages;
    if (sectionKey === 'filterResults') {
        state.items = [...state.items, ...items];
    } else {
        allItems = [...allItems, ...items];
    }

    renderCards(items, sectionKey === 'filterResults' ? 'filter-results' : sectionKey, true);

    if (!state.hasMore) {
        const btn = document.getElementById(`load-more-${sectionKey}`);
        if (btn) btn.disabled = true;
    }
}

//  CORREÇÃO PRINCIPAL: Função que carrega dados da API para cada filtro
async function loadFilteredContent(endpoint, mediaType = null, containerId = 'filter-results') {
    const state = paginationState.filterResults;
    state.page = 1;
    state.endpoint = endpoint;
    state.mediaType = mediaType;
    state.isFiltered = true;

    const data = await fetchData(endpoint, 1);
    const items = data.results.map(item => ({
        ...item,
        media_type: mediaType || (item.title ? 'movie' : 'tv')
    }));

    state.items = items;
    state.hasMore = data.page < data.total_pages;

    const resultsSection = document.getElementById('filter-results-section');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    renderCards(items, containerId, false);
}

//  CORREÇÃO: Filtra por tipo (cada botão agora busca o endpoint correto)
function filterByType(type) {
    let endpoint = '';
    let mediaType = null;
    let containerId = 'filter-results';

    switch(type) {
        case 'movie':
            endpoint = '/discover/movie?sort_by=popularity.desc';
            mediaType = 'movie';
            break;
        case 'tv':
            endpoint = '/discover/tv?sort_by=popularity.desc';
            mediaType = 'tv';
            break;
        case 'upcoming':
            endpoint = '/movie/upcoming';
            mediaType = 'movie';
            break;
        case 'trending':
            endpoint = '/trending/all/day';
            mediaType = null;
            break;
        case 'top_rated':
            endpoint = '/movie/top_rated';
            mediaType = 'movie';
            break;
        case 'all':
        default:
            // Volta para as seções iniciais
            resetToInitialSections();
            return;
    }

    // Carrega os dados da API para o filtro selecionado
    loadFilteredContent(endpoint, mediaType, containerId);
}

// Carrega seção inicial
async function loadSection(sectionKey) {
    const state = paginationState[sectionKey];
    state.page = 1;
    const data = await fetchData(state.endpoint, 1);
    const items = data.results.map(item => ({
        ...item,
        media_type: state.mediaType || (item.title ? 'movie' : 'tv')
    }));

    state.hasMore = data.page < data.total_pages;
    allItems = [...allItems, ...items];
    renderCards(items, sectionKey, false);
}

// Reseta para seções iniciais
async function resetToInitialSections() {
    const resultsSection = document.getElementById('filter-results-section');
    resultsSection.style.display = 'none';

    // Reinicia paginação
    for (let key of ['launches', 'trending', 'topRated']) {
        paginationState[key].page = 1;
        paginationState[key].hasMore = true;
    }

    await Promise.all([
        loadSection('launches'),
        loadSection('trending'),
        loadSection('topRated')
    ]);
}

// Modal de detalhes
async function openModal(item, type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    try {
        const details = await fetchData(`/${type}/${item.id}?append_to_response=credits,videos`);
        const releaseDate = type === 'movie' ? details.release_date : details.first_air_date;
        const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('pt-BR') : 'Não disponível';

        modalBody.innerHTML = `
            <img class="modal-poster" src="${IMG_BASE_URL}${details.poster_path || details.backdrop_path || ''}" alt="${details.title || details.name}" onerror="this.src='https://via.placeholder.com/800x1200/444/fff?text=POSTER+INDISPON%C3%8DVEL'">
            <h2 class="modal-title">${details.title || details.name}</h2>
            ${details.tagline ? `<p class="modal-tagline">"${details.tagline}"</p>` : ''}
            <div class="modal-info">
                <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                <span><i class="fas fa-star"></i> ${details.vote_average?.toFixed(1) || 'N/A'}/10</span>
                ${details.runtime ? `<span><i class="fas fa-clock"></i> ${details.runtime} min</span>` : ''}
                ${details.episode_run_time?.[0] ? `<span><i class="fas fa-clock"></i> ${details.episode_run_time[0]} min/ep</span>` : ''}
            </div>
            <h3>Sinopse</h3>
            <p class="modal-synopsis">${details.overview || 'Sinopse indisponível.'}</p>
            ${details.videos?.results?.[0] ? `
                <h3>Trailer</h3>
                <div class="modal-trailer">
                    <iframe width="100%" height="315" src="https://www.youtube.com/embed/${details.videos.results[0].key}" frameborder="0" allowfullscreen></iframe>
                </div>
            ` : ''}
        `;
    } catch (err) {
        modalBody.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar detalhes.</p>`;
    }

    modal.style.display = 'block';
}

// Fecha modal
function setupModal() {
    document.querySelector('.close')?.addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Força remoção do splash após timeout
function forceRemoveSplash() {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
    }
    gsap.from(".logo-container h1", { duration: 1, y: -50, opacity: 0, ease: "bounce.out" });
}

//  INICIALIZAÇÃO COMPLETA
document.addEventListener('DOMContentLoaded', async () => {
    setupModal();
    await loadGenres();

    // Timeout de segurança para remover splash
    setTimeout(forceRemoveSplash, 3500);

    // Carrega seções iniciais
    try {
        await Promise.all([
            loadSection('launches'),
            loadSection('trending'),
            loadSection('topRated')
        ]);
        forceRemoveSplash();
    } catch (err) {
        console.error("Erro ao carregar seções iniciais:", err);
        forceRemoveSplash();
    }

    //  EVENTOS DOS BOTÕES DE FILTRO — CORRIGIDOS!
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterByType(btn.dataset.filter);
        });
    });

    // Filtros avançados
    document.getElementById('filter-genre')?.addEventListener('change', applyAdvancedFilters);
    document.getElementById('filter-rating')?.addEventListener('change', applyAdvancedFilters);

    // Botões "Carregar Mais"
    document.getElementById('load-more-launches')?.addEventListener('click', () => loadMore('launches'));
    document.getElementById('load-more-trending')?.addEventListener('click', () => loadMore('trending'));
    document.getElementById('load-more-top-rated')?.addEventListener('click', () => loadMore('topRated'));
    document.getElementById('load-more-filter')?.addEventListener('click', () => loadMore('filterResults'));
});

// Aplica filtros avançados (gênero + nota)
function applyAdvancedFilters() {
    const genre = document.getElementById('filter-genre').value;
    const rating = parseFloat(document.getElementById('filter-rating').value) || 0;

    let filtered = [...allItems];

    if (genre) {
        filtered = filtered.filter(item => item.genre_ids?.includes(parseInt(genre)));
    }
    if (rating) {
        filtered = filtered.filter(item => item.vote_average >= rating);
    }

    const state = paginationState.filterResults;
    state.page = 1;
    state.items = filtered;
    state.hasMore = false;

    const resultsSection = document.getElementById('filter-results-section');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    renderCards(filtered, 'filter-results', false);
}
