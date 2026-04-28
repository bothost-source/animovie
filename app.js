
// ANIMOVIE - Main Application Logic
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1YjBlMWRjM2E3YmY4ZGRkY2Y0ZjA2NjM2YmY1ZjdhOSIsInN1YiI6IjY0YjA1YjY1MGVkMmFiMDBjNzY4M2Q3NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.rOl6-dT2p7t0XwL1Qb8rC3mK9jH4nE5fG6hI7jK8lM9';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const JIKAN_BASE = 'https://api.jikan.moe/v4';

let currentPage = 1;
let isLoading = false;

async function tmdbFetch(endpoint) {
    try {
        const res = await fetch(`${TMDB_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${TMDB_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('TMDB Error:', e);
        showToast('Failed to load movies. Please try again.', 'error');
        return null;
    }
}

async function jikanFetch(endpoint) {
    try {
        const res = await fetch(`${JIKAN_BASE}${endpoint}`);
        if (!res.ok) throw new Error(`Jikan ${res.status}`);
        const data = await res.json();
        return data.data || data;
    } catch (e) {
        console.error('Jikan Error:', e);
        showToast('Failed to load anime. Please try again.', 'error');
        return null;
    }
}

function tmdbImage(path, size = 'w500') {
    return path ? `${TMDB_IMG}/${size}${path}` : 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image';
}

function jikanImage(images) {
    if (!images) return 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image';
    return images.jpg?.large_image_url || images.jpg?.image_url || images.webp?.large_image_url || 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image';
}

function createCard(item, type = 'movie') {
    const isAnime = type === 'anime';
    const poster = isAnime ? jikanImage(item.images) : tmdbImage(item.poster_path);
    const title = isAnime ? (item.title_english || item.title) : item.title;
    const year = isAnime 
        ? (item.aired?.from ? new Date(item.aired.from).getFullYear() : item.year || 'N/A')
        : (item.release_date ? item.release_date.split('-')[0] : 'N/A');
    const rating = isAnime ? (item.score || 'N/A') : (item.vote_average ? item.vote_average.toFixed(1) : 'N/A');
    const id = item.id || item.mal_id;

    return `
        <div class="content-card" onclick="openDetail(${id}, '${type}')">
            <div class="card-poster">
                <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image'">
                <div class="card-rating">★ ${rating}</div>
                <div class="card-play">▶</div>
                <div class="card-overlay">
                    <div class="card-title" style="color:white;white-space:normal;">${title}</div>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="dot"></span>
                    <span>${isAnime ? 'Anime' : 'Movie'}</span>
                </div>
            </div>
        </div>
    `;
}

function createSkeletonCard() {
    return `
        <div class="content-card">
            <div class="card-poster skeleton skeleton-poster"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:60%"></div>
        </div>
    `;
}

function createHero(item, type = 'movie') {
    const isAnime = type === 'anime';
    const backdrop = isAnime 
        ? jikanImage(item.images) 
        : tmdbImage(item.backdrop_path || item.poster_path, 'original');
    const title = isAnime ? (item.title_english || item.title) : item.title;
    const desc = isAnime 
        ? (item.synopsis ? item.synopsis.substring(0, 200) + '...' : 'No description available.')
        : (item.overview ? item.overview.substring(0, 200) + '...' : 'No description available.');
    const year = isAnime 
        ? (item.aired?.from ? new Date(item.aired.from).getFullYear() : item.year || '')
        : (item.release_date ? item.release_date.split('-')[0] : '');
    const rating = isAnime ? item.score : item.vote_average;
    const id = item.id || item.mal_id;

    return `
        <div class="hero">
            <div class="hero-bg" style="background-image: url('${backdrop}')"></div>
            <div class="hero-content fade-in-up">
                <div class="hero-badge">${isAnime ? '🔥 Trending Anime' : '🎬 Now Playing'}</div>
                <h1 class="hero-title">${title}</h1>
                <div class="hero-meta">
                    <span class="rating">★ ${rating ? rating.toFixed(1) : 'N/A'}</span>
                    <span>${year}</span>
                    <span class="hd-badge">HD</span>
                    <span>${isAnime ? (item.episodes ? item.episodes + ' EPS' : 'Ongoing') : (item.runtime ? Math.floor(item.runtime/60) + 'h ' + (item.runtime%60) + 'm' : '')}</span>
                </div>
                <p class="hero-desc">${desc}</p>
                <div class="hero-buttons">
                    <button class="btn btn-primary btn-large" onclick="openDetail(${id}, '${type}')">
                        <span>▶</span> Watch Now
                    </button>
                    <button class="btn btn-secondary btn-large" onclick="addToList(${id}, '${type}')">
                        <span>+</span> My List
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createSection(title, icon, items, type = 'movie') {
    if (!items || items.length === 0) return '';
    const cards = items.map(item => createCard(item, type)).join('');
    const sectionId = 'section-' + Math.random().toString(36).substr(2, 9);

    return `
        <section class="section">
            <div class="section-header">
                <h2 class="section-title">
                    <span class="icon">${icon}</span>
                    ${title}
                </h2>
                <a href="${type === 'anime' ? 'anime.html' : 'movies.html'}" class="see-all">See All →</a>
            </div>
            <div class="content-row">
                <button class="scroll-arrow left" onclick="scrollRow('${sectionId}', -1)">‹</button>
                <div class="content-scroll" id="${sectionId}">
                    ${cards}
                </div>
                <button class="scroll-arrow right" onclick="scrollRow('${sectionId}', 1)">›</button>
            </div>
        </section>
    `;
}

function createSkeletonSection(title, icon, count = 6) {
    const cards = Array(count).fill(0).map(() => createSkeletonCard()).join('');
    return `
        <section class="section">
            <div class="section-header">
                <h2 class="section-title">
                    <span class="icon">${icon}</span>
                    ${title}
                </h2>
            </div>
            <div class="content-row">
                <div class="content-scroll">
                    ${cards}
                </div>
            </div>
        </section>
    `;
}

function scrollRow(id, direction) {
    const row = document.getElementById(id);
    if (row) {
        const scrollAmount = direction * (row.offsetWidth * 0.8);
        row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

function openDetail(id, type) {
    window.location.href = `detail.html?id=${id}&type=${type}`;
}

function addToList(id, type) {
    let list = JSON.parse(localStorage.getItem('myList') || '[]');
    const exists = list.find(item => item.id === id && item.type === type);
    if (!exists) {
        list.push({ id, type, added: Date.now() });
        localStorage.setItem('myList', JSON.stringify(list));
        showToast('Added to My List!', 'success');
    } else {
        showToast('Already in My List!', 'error');
    }
}

function toggleSearch() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.toggle('active');
    if (overlay.classList.contains('active')) {
        setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
    }
}

let searchTimeout;
function handleSearchInput(value) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(value);
    }, 500);
}

async function performSearch(query) {
    if (!query.trim()) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">Searching...</div>';

    try {
        const [movieData, animeData] = await Promise.all([
            tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&page=1`),
            jikanFetch(`/anime?q=${encodeURIComponent(query)}&limit=10`)
        ]);

        let html = '';
        if (movieData?.results) {
            html += movieData.results.slice(0, 10).map(item => createCard(item, 'movie')).join('');
        }
        if (animeData) {
            const animeArray = Array.isArray(animeData) ? animeData : [];
            html += animeArray.slice(0, 10).map(item => createCard(item, 'anime')).join('');
        }

        resultsContainer.innerHTML = html || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">No results found</div>';
    } catch (e) {
        resultsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--primary)">Search failed. Please try again.</div>';
    }
}

function toggleMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
    document.getElementById('mobileOverlay').classList.toggle('active');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toastContainer';
    div.className = 'toast-container';
    document.body.appendChild(div);
    return div;
}

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});
