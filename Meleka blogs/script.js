const API_KEY = 'd40eb0d5d00c65022d9ecaf3678c39f2'; //  NÃO ESQUEÇA DE SUBSTITUIR!
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Estrutura para armazenar estado de paginação de cada seção
const paginationState = {
    launches: { page: 1, hasMore: true, endpoint: '/discover/movie?primary_release_date.gte=2025-04-01&primary_release_date.lte=2025-04-30' },
    trending: { page: 1, hasMore: true, endpoint: '/trending/all/day' },
    topRated: { page: 1, hasMore: true, endpoint: '/movie/top_rated' },
    filterResults: { page: 1, hasMore: true, items: [] }
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

// Busca dados da API com paginação
async function fetchData(endpoint, page = 1) {
    try {
        const url = `${BASE_URL}${endpoint}&page=${page}&api_key=${API_KEY}&language=pt-BR`;
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
    } catch (err) {
        console.error("Erro na API:", err);
        return { results: [], page: 1, total_pages: 1 };
    }
}

// Renderiza cards (append ou replace)
function renderCards(items, containerId, append = false) {
    const container = document.getElementById(containerId);
    
    if (!append) {
        container.innerHTML = '';
    }

    if (!items || items.length === 0) {
        if (!append) {
            container.innerHTML = `<div class="no-results">Nenhum item encontrado.</div>`;
        }
        return;
    }

    items.forEach((item, index) => {
        const isMovie = !item.media_type || (item.title ? true : false);
        const date = isMovie ? item.release_date : item.first_air_date;
        const formattedDate = date ? new Date(date).toLocaleDateString('pt-BR') : 'Indisponível';
        const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const title = item.title || item.name || 'Sem título';

        const card = document.createElement('div');
        card.className = 'card-hq';
        card.dataset.id = item.id;
        card.dataset.type = isMovie ? 'movie' : 'tv';
        card.innerHTML = `
            <img class="card-poster" src="${IMG_BASE_URL}${item.poster_path || '/fallback.jpg'}" alt="${title}" onerror="this.src='https://via.placeholder.com/500x750/333/fff?text=SEM+POSTER'">
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

        // Anima com delay
        setTimeout(() => {
            gsap.to(card, {
                duration: 0.6,
                y: 0,
                opacity: 1,
                ease: "power2.out",
                delay: index * 0.1
            });
        }, 100);

        // Abre modal ao clicar
        card.addEventListener('click', () => openModal(item, isMovie ? 'movie' : 'tv'));
    });
}

// Carrega mais dados para uma seção específica
async function loadMore(sectionKey) {
    const state = paginationState[sectionKey];
    if (!state.hasMore) return;

    state.page++;
    const data = await fetchData(state.endpoint, state.page);
    
    const items = data.results.map(item => ({
        ...item,
        media_type: sectionKey === 'topRated' || sectionKey === 'launches' ? 'movie' : (item.title ? 'movie' : 'tv')
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

// Filtra por tipo (tab)
async function filterByType(type) {
    let endpoint = '';
    let mediaType = null;

    switch(type) {
        case 'movie':
            endpoint = '/discover/movie?sort_by=popularity.desc';
            break;
        case 'tv':
            endpoint = '/discover/tv?sort_by=popularity.desc';
            break;
        case 'upcoming':
            endpoint = '/movie/upcoming';
            mediaType = 'movie';
            break;
        case 'trending':
            endpoint = '/trending/all/day';
            break;
        case 'top_rated':
            endpoint = '/movie/top_rated';
            mediaType = 'movie';
            break;
        default:
            resetPagination();
            await Promise.all([
                loadSection('launches'),
                loadSection('trending'),
                loadSection('topRated')
            ]);
            return;
    }

    paginationState.filterResults.page = 1;
    paginationState.filterResults.hasMore = true;
    paginationState.filterResults.endpoint = endpoint;

    const data = await fetchData(endpoint, 1);
    const items = data.results.map(item => ({
        ...item,
        media_type: mediaType || (item.title ? 'movie' : 'tv')
    }));

    paginationState.filterResults.items = items;
    paginationState.filterResults.hasMore = data.page < data.total_pages;

    const resultsSection = document.getElementById('filter-results-section');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    renderCards(items, 'filter-results', false);
}

// Aplica filtros avançados
function applyAdvancedFilters() {
    const genre = document.getElementById('filter-genre').value;
    const rating = parseFloat(document.getElementById('filter-rating').value) || 0;

    let filtered = [...allItems];

    if (genre) {
        filtered = filtered.filter(item => item.genre_ids && item.genre_ids.includes(parseInt(genre)));
    }

    if (rating) {
        filtered = filtered.filter(item => item.vote_average >= rating);
    }

    paginationState.filterResults.page = 1;
    paginationState.filterResults.items = filtered;
    paginationState.filterResults.hasMore = false;

    const resultsSection = document.getElementById('filter-results-section');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    renderCards(filtered, 'filter-results', false);
}

// Carrega seção inicial (página 1)
async function loadSection(sectionKey) {
    const state = paginationState[sectionKey];
    state.page = 1;
    state.hasMore = true;

    const data = await fetchData(state.endpoint, 1);
    const items = data.results.map(item => ({
        ...item,
        media_type: sectionKey === 'topRated' || sectionKey === 'launches' ? 'movie' : (item.title ? 'movie' : 'tv')
    }));

    state.hasMore = data.page < data.total_pages;
    allItems = [...allItems, ...items];

    renderCards(items, sectionKey, false);
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
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.close')?.addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Reseta paginação
function resetPagination() {
    for (let key in paginationState) {
        paginationState[key].page = 1;
        paginationState[key].hasMore = true;
    }
}

//  FUNÇÃO CRÍTICA: Remove splash mesmo se API falhar
function forceRemoveSplash() {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.remove();
            
            // Mostra mensagem de erro se API falhou
            if (allItems.length === 0) {
                document.body.insertAdjacentHTML('afterbegin', `
                    <div style="text-align: center; padding: 2rem; background: #a12a5e; margin: 1rem; border-radius: 15px; color: white; font-family: 'Luckiest Guy', cursive;">
                        <h3> Ops! Algo deu errado</h3>
                        <p>Verifique se sua chave da API do TMDb está correta no arquivo script.js</p>
                        <p>Ou tente recarregar a página.</p>
                    </div>
                `);
            }
        }, 500);
    }

    // Anima o título principal
    gsap.from(".logo-container h1", {
        duration: 1,
        y: -50,
        opacity: 0,
        ease: "bounce.out"
    });
}

// Inicializa tudo
document.addEventListener('DOMContentLoaded', async () => {
    await loadGenres();

    //  DEFINE UM TEMPO LIMITE PARA REMOVER O SPLASH (3.5 segundos)
    setTimeout(forceRemoveSplash, 3500);

    // Tenta carregar as seções
    try {
        await Promise.all([
            loadSection('launches'),
            loadSection('trending'),
            loadSection('topRated')
        ]);
        
        // Se chegar aqui, remove o splash imediatamente
        forceRemoveSplash();
    } catch (err) {
        console.error("Erro ao carregar seções:", err);
        // O splash será removido pelo timeout acima
    }

    // Eventos dos tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterByType(btn.dataset.filter);
        });
    });

    // Filtros avançados
    document.getElementById('filter-genre').addEventListener('change', applyAdvancedFilters);
    document.getElementById('filter-rating').addEventListener('change', applyAdvancedFilters);

    // Botões "Carregar Mais"
    document.getElementById('load-more-launches')?.addEventListener('click', () => loadMore('launches'));
    document.getElementById('load-more-trending')?.addEventListener('click', () => loadMore('trending'));
    document.getElementById('load-more-top-rated')?.addEventListener('click', () => loadMore('topRated'));
    document.getElementById('load-more-filter')?.addEventListener('click', () => loadMore('filterResults'));
});