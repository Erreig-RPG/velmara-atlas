/* ═══════════════════════════════════════════════
   VELMARA — Mapa Interativo
   app.js — Lógica principal
   ═══════════════════════════════════════════════

   COMO USAR:
   1. Coloque a imagem do mapa na raiz: velmara.png
   2. Ajuste MAP_CONFIG.width e MAP_CONFIG.height para as
      dimensões reais da sua imagem
   3. Edite locations.json para adicionar/editar locais
   4. Coordenadas nos JSON são em % [x%, y%] — 0,0 = topo-esquerdo

   MODO MESTRE:
   Clique 5 vezes no título "VELMARA" no header para abrir o login
   ═══════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────
   1. CONFIGURAÇÕES
──────────────────────────────────────────── */
const MAP_CONFIG = {
  imageUrl:    'velmara.png',
  width:       2048,   // ← Ajuste para largura da sua imagem (pixels)
  height:      1300,   // ← Ajuste para altura da sua imagem (pixels)
  minZoom:     -2,
  maxZoom:      2,
  defaultZoom: -1,
};

// Hash simples da senha do Mestre — não é criptografia real,
// apenas previne acesso acidental. Quem olhar o código-fonte vê.
// Para Velmara isso é suficiente — o objetivo é separar, não proteger.
const MASTER_HASH = btoa('bbrae'); // 'YmJyYWU='

/* ────────────────────────────────────────────
   2. ESTADO DA APLICAÇÃO
──────────────────────────────────────────── */
const state = {
  isMaster:       false,
  showSecrets:    false,
  activeFilter:   'all',
  activePanel:    null,
  activePanelTab: 0,
  locations:      [],
  markers:        {},   // id → marcador Leaflet
  map:            null,
  addMode:        false,
  clickCount:     0,
  clickTimer:     null,
};

/* ────────────────────────────────────────────
   3. CONFIGURAÇÕES DE TIPOS DE LOCAL
──────────────────────────────────────────── */
const LOCATION_TYPES = {
  cidade:  { label: 'Cidade',           icon: '🏰', bg: '#c4849a', glow: '#e8b4c8', size: 32 },
  vila:    { label: 'Vila',             icon: '🏘️', bg: '#5a9e7a', glow: '#a8d4bc', size: 26 },
  ruina:   { label: 'Ruína',           icon: '🏚️', bg: '#7a6090', glow: '#c8b8e8', size: 28 },
  dungeon: { label: 'Dungeon',          icon: '💀', bg: '#3d2050', glow: '#9050c0', size: 28 },
  pdi:     { label: 'Ponto de Interesse', icon: '⭐', bg: '#b89040', glow: '#e8d090', size: 26 },
  cristal: { label: 'Cristal Elemental', icon: '💎', bg: '#4090b8', glow: '#a8c8e8', size: 30 },
  portal:  { label: 'Portal',           icon: '🌀', bg: '#8a70b8', glow: '#c8b8e8', size: 28 },
  santuario:{ label: 'Santuário',       icon: '⛩️', bg: '#b8904a', glow: '#f0c060', size: 28 },
  secreto: { label: 'Local Secreto',    icon: '🔍', bg: '#802050', glow: '#ff4080', size: 24 },
};

/* ────────────────────────────────────────────
   4. INICIALIZAÇÃO DO MAPA
──────────────────────────────────────────── */
function initMap() {
  const bounds = [[0, 0], [MAP_CONFIG.height, MAP_CONFIG.width]];

  state.map = L.map('map', {
    crs:              L.CRS.Simple,
    minZoom:          MAP_CONFIG.minZoom,
    maxZoom:          MAP_CONFIG.maxZoom,
    zoomControl:      false,
    attributionControl: false,
  });

  // Imagem do mapa como overlay
  const overlay = L.imageOverlay(MAP_CONFIG.imageUrl, bounds);
  overlay.addTo(state.map);

  overlay.on('load', () => {
    document.getElementById('loading-screen').classList.add('hidden');
  });

  overlay.on('error', () => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('map-placeholder').classList.remove('hidden');
  });

  state.map.fitBounds(bounds);
  state.map.setMaxBounds(bounds.map(b => [b[0] - 300, b[1] - 300]));

  // Zoom control no canto inferior esquerdo
  L.control.zoom({ position: 'bottomleft' }).addTo(state.map);

  // Clique no mapa vazio fecha o painel
  state.map.on('click', onMapClick);
}

/* Converte coordenadas percentuais [x%, y%] → pixel Leaflet [lat, lng] */
function pctToLeaflet(xPct, yPct) {
  return [
    MAP_CONFIG.height * (1 - yPct / 100),
    MAP_CONFIG.width  * (xPct / 100),
  ];
}

/* ────────────────────────────────────────────
   5. MARCADORES
──────────────────────────────────────────── */
function createMarkerIcon(location, typeConfig) {
  const size = typeConfig.size;
  const isSecret = location.visibility === 'secret';

  return L.divIcon({
    html: `
      <div class="velmara-marker ${isSecret ? 'marker-secret' : ''}"
           style="--marker-bg:${typeConfig.bg}; --marker-glow:${typeConfig.glow};">
        <div class="marker-inner" style="width:${size}px;height:${size}px;">
          ${typeConfig.icon}
        </div>
        <span class="marker-label">${location.name}</span>
      </div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function addMarker(location) {
  const typeConfig = LOCATION_TYPES[location.type] || LOCATION_TYPES.pdi;
  const coords = pctToLeaflet(location.coords[0], location.coords[1]);
  const icon = createMarkerIcon(location, typeConfig);

  const marker = L.marker(coords, { icon }).addTo(state.map);
  marker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    openPanel(location.id);
  });

  state.markers[location.id] = { marker, location };
  return marker;
}

function renderAllMarkers() {
  // Limpa marcadores existentes
  Object.values(state.markers).forEach(({ marker }) => marker.remove());
  state.markers = {};

  state.locations.forEach(loc => {
    const isSecret = loc.visibility === 'secret';
    if (isSecret && !state.isMaster) return; // Oculto para jogadores
    if (isSecret && !state.showSecrets) return; // Oculto mesmo para Mestre se desativado

    if (state.activeFilter !== 'all' && loc.type !== state.activeFilter) return;

    addMarker(loc);
  });
}

/* ────────────────────────────────────────────
   6. PAINEL LATERAL
──────────────────────────────────────────── */
function openPanel(locationId) {
  const loc = state.locations.find(l => l.id === locationId);
  if (!loc) return;

  state.activePanel = locationId;
  state.activePanelTab = 0;

  renderPanel(loc);
  document.getElementById('location-panel').classList.remove('hidden');
}

function closePanel() {
  state.activePanel = null;
  document.getElementById('location-panel').classList.add('hidden');
}

function renderPanel(loc) {
  const typeConfig = LOCATION_TYPES[loc.type] || LOCATION_TYPES.pdi;

  // Define quais tabs mostrar
  const tabs = [{ key: 'geral', label: 'Geral' }];
  if (loc.history)                 tabs.push({ key: 'historia', label: 'História' });
  if (loc.npcs?.length)            tabs.push({ key: 'npcs', label: 'NPCs' });
  if (loc.quests?.length)          tabs.push({ key: 'quests', label: 'Quests' });
  if (loc.sublocations?.length)    tabs.push({ key: 'sublocais', label: 'Sublocais' });
  if (state.isMaster && loc.master) tabs.push({ key: 'mestre', label: '⚔ Mestre' });

  const activeTab = tabs[state.activePanelTab] || tabs[0];

  document.getElementById('panel-content').innerHTML = `
    <!-- Hero -->
    <div class="panel-hero">
      <div class="panel-type-badge">${typeConfig.icon} ${typeConfig.label}</div>
      <h2 class="panel-location-name">${loc.name}</h2>
      ${loc.short ? `<p class="panel-short">${loc.short}</p>` : ''}
      ${loc.region ? `<span class="panel-region-tag">📍 ${loc.region}</span>` : ''}
      ${loc.visibility === 'secret' ? `<span class="panel-region-tag" style="color:var(--rose);border-color:var(--rose-dark);margin-left:6px;">🔒 Secreto</span>` : ''}
      ${loc.tags?.length ? `
        <div class="panel-tags" style="margin-top:12px;">
          ${loc.tags.map(t => `<span class="panel-tag">${t}</span>`).join('')}
        </div>` : ''}
    </div>

    <!-- Tabs -->
    <div class="panel-tabs">
      ${tabs.map((t, i) => `
        <button class="panel-tab ${i === state.activePanelTab ? 'active' : ''}"
                data-tab="${i}">${t.label}</button>`).join('')}
    </div>

    <!-- Corpo -->
    <div class="panel-body">
      ${renderPanelTab(activeTab.key, loc)}
    </div>
  `;

  // Eventos dos tabs
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activePanelTab = parseInt(btn.dataset.tab);
      renderPanel(loc);
    });
  });
}

function renderPanelTab(tabKey, loc) {
  switch (tabKey) {

    case 'geral': {
      return `
        ${loc.description ? `
          <div class="panel-section">
            <div class="panel-section-title">Descrição</div>
            <p class="panel-text">${loc.description}</p>
          </div>` : ''}

        ${loc.atmosphere ? `
          <div class="panel-section">
            <div class="panel-section-title">Atmosfera</div>
            <p class="panel-text" style="font-style:italic;color:rgba(255,255,255,0.5);">${loc.atmosphere}</p>
          </div>` : ''}

        ${loc.factions?.length ? `
          <div class="panel-section">
            <div class="panel-section-title">Facções Presentes</div>
            <div class="panel-tags">
              ${loc.factions.map(f => `<span class="panel-tag">⚑ ${f}</span>`).join('')}
            </div>
          </div>` : ''}

        ${loc.connections?.length ? `
          <div class="panel-section">
            <div class="panel-section-title">Conexões</div>
            ${loc.connections.map(c => `
              <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;"
                   class="connection-link" data-id="${c.id}"
                   onmouseover="this.style.color='var(--lavender)'"
                   onmouseout="this.style.color=''">
                <span style="font-family:'Cinzel',serif;font-size:0.75rem;color:rgba(255,255,255,0.7);">
                  → ${c.name}
                </span>
                ${c.note ? `<span style="font-size:0.8rem;color:rgba(255,255,255,0.35);margin-left:8px;">${c.note}</span>` : ''}
              </div>`).join('')}
          </div>` : ''}
      `;
    }

    case 'historia': {
      return `
        <div class="panel-section">
          <div class="panel-section-title">História</div>
          <p class="panel-text">${loc.history}</p>
        </div>`;
    }

    case 'npcs': {
      return `
        <div class="panel-section">
          <div class="panel-section-title">NPCs Conhecidos</div>
          ${loc.npcs.map(n => `
            <div class="npc-card">
              <div class="npc-name">${n.name}</div>
              ${n.role ? `<div class="npc-role">${n.role}</div>` : ''}
              ${n.description ? `<div class="npc-desc">${n.description}</div>` : ''}
            </div>`).join('')}
        </div>`;
    }

    case 'quests': {
      return `
        <div class="panel-section">
          <div class="panel-section-title">Quests Disponíveis</div>
          ${loc.quests.map(q => `
            <div class="quest-card">
              <div class="quest-name">⚔ ${q.name}</div>
              ${q.description ? `<div class="quest-desc">${q.description}</div>` : ''}
            </div>`).join('')}
        </div>`;
    }

    case 'sublocais': {
      return `
        <div class="panel-section">
          <div class="panel-section-title">Sublocais</div>
          ${loc.sublocations.map(s => `
            <div class="sublocation-item">
              <span class="sublocation-icon">${s.icon || '📍'}</span>
              <div>
                <div class="sublocation-name">${s.name}</div>
                ${s.description ? `<div class="sublocation-desc">${s.description}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>`;
    }

    case 'mestre': {
      const m = loc.master;
      return `
        ${m.secrets ? `
          <div class="panel-master-section">
            <div class="panel-master-title">⚔ Segredos</div>
            <p class="panel-master-text">${m.secrets}</p>
          </div>` : ''}

        ${m.notes ? `
          <div class="panel-master-section">
            <div class="panel-master-title">📝 Notas do Narrador</div>
            <p class="panel-master-text">${m.notes}</p>
          </div>` : ''}

        ${m.hiddenNpcs?.length ? `
          <div class="panel-section">
            <div class="panel-section-title">NPCs Ocultos</div>
            ${m.hiddenNpcs.map(n => `
              <div class="npc-card" style="border-color:rgba(196,132,154,0.2);">
                <div class="npc-name">${n.name}</div>
                ${n.role ? `<div class="npc-role">${n.role}</div>` : ''}
                ${n.description ? `<div class="npc-desc">${n.description}</div>` : ''}
              </div>`).join('')}
          </div>` : ''}

        ${m.hiddenQuests?.length ? `
          <div class="panel-section">
            <div class="panel-section-title">Quests Ocultas</div>
            ${m.hiddenQuests.map(q => `
              <div class="quest-card" style="border-left-color:var(--rose-dark);">
                <div class="quest-name" style="color:var(--rose);">🔒 ${q.name}</div>
                ${q.description ? `<div class="quest-desc">${q.description}</div>` : ''}
              </div>`).join('')}
          </div>` : ''}
      `;
    }

    default: return '';
  }
}

/* ────────────────────────────────────────────
   7. MODO MESTRE
──────────────────────────────────────────── */
function initMasterTrigger() {
  const trigger = document.getElementById('master-trigger');
  const modal   = document.getElementById('master-modal');
  const input   = document.getElementById('master-password-input');
  const error   = document.getElementById('master-error');
  const badge   = document.getElementById('master-badge');
  const toolbar = document.getElementById('master-toolbar');

  // 5 cliques rápidos no título abre o modal
  trigger.addEventListener('click', () => {
    state.clickCount++;
    clearTimeout(state.clickTimer);
    state.clickTimer = setTimeout(() => { state.clickCount = 0; }, 1500);

    if (state.clickCount >= 5) {
      state.clickCount = 0;
      if (!state.isMaster) {
        modal.classList.remove('hidden');
        setTimeout(() => input.focus(), 50);
      }
    }
  });

  // Confirmar senha
  document.getElementById('btn-master-enter').addEventListener('click', tryMasterLogin);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryMasterLogin();
    if (e.key === 'Escape') closeMasterModal();
    error.classList.add('hidden');
  });

  // Cancelar
  document.getElementById('btn-master-cancel').addEventListener('click', closeMasterModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMasterModal();
  });

  // Sair do modo Mestre
  document.getElementById('btn-master-exit').addEventListener('click', () => {
    state.isMaster = false;
    state.showSecrets = false;
    sessionStorage.removeItem('velmara_master');
    badge.classList.add('hidden');
    toolbar.classList.add('hidden');
    document.getElementById('secrets-icon').textContent = '🔒';
    document.getElementById('btn-add-mode').classList.remove('active');
    renderAllMarkers();
    closePanel();
  });

  // Restaurar sessão de Mestre (recarregar página)
  if (sessionStorage.getItem('velmara_master') === MASTER_HASH) {
    activateMasterMode();
  }
}

function tryMasterLogin() {
  const input = document.getElementById('master-password-input');
  const error = document.getElementById('master-error');
  const val = input.value.trim();

  if (btoa(val) === MASTER_HASH) {
    sessionStorage.setItem('velmara_master', MASTER_HASH);
    closeMasterModal();
    activateMasterMode();
    input.value = '';
  } else {
    error.classList.remove('hidden');
    input.value = '';
    input.focus();
    // Pequena animação de erro
    input.style.borderColor = '#e88';
    setTimeout(() => { input.style.borderColor = ''; }, 1000);
  }
}

function closeMasterModal() {
  document.getElementById('master-modal').classList.add('hidden');
  document.getElementById('master-password-input').value = '';
  document.getElementById('master-error').classList.add('hidden');
}

function activateMasterMode() {
  state.isMaster = true;
  document.getElementById('master-badge').classList.remove('hidden');
  document.getElementById('master-toolbar').classList.remove('hidden');
  renderAllMarkers();
}

/* ────────────────────────────────────────────
   8. CONTROLES DO MESTRE
──────────────────────────────────────────── */
function initMasterControls() {
  // Toggle segredos visíveis
  document.getElementById('btn-toggle-secrets').addEventListener('click', () => {
    state.showSecrets = !state.showSecrets;
    document.getElementById('secrets-icon').textContent = state.showSecrets ? '🔓' : '🔒';
    renderAllMarkers();
  });

  // Modo adição
  document.getElementById('btn-add-mode').addEventListener('click', () => {
    state.addMode = !state.addMode;
    document.getElementById('btn-add-mode').classList.toggle('active', state.addMode);
    document.getElementById('add-mode-tip').classList.toggle('hidden', !state.addMode);
    state.map.getContainer().style.cursor = state.addMode ? 'crosshair' : '';
  });

  document.getElementById('btn-cancel-add').addEventListener('click', cancelAddMode);
}

function cancelAddMode() {
  state.addMode = false;
  document.getElementById('btn-add-mode').classList.remove('active');
  document.getElementById('add-mode-tip').classList.add('hidden');
  state.map.getContainer().style.cursor = '';
}

/* ────────────────────────────────────────────
   9. CLIQUE NO MAPA
──────────────────────────────────────────── */
function onMapClick(e) {
  if (state.addMode && state.isMaster) {
    // Calcula coordenadas percentuais do clique
    const xPct = (e.latlng.lng / MAP_CONFIG.width * 100).toFixed(1);
    const yPct = ((1 - e.latlng.lat / MAP_CONFIG.height) * 100).toFixed(1);

    const name = prompt('Nome do novo local:');
    if (!name) { cancelAddMode(); return; }

    const type = prompt(
      'Tipo do local:\ncidade / vila / ruina / dungeon / pdi / cristal / portal / santuario / secreto',
      'pdi'
    );

    const newLoc = {
      id:          name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '-' + Date.now(),
      name,
      type:        type || 'pdi',
      coords:      [parseFloat(xPct), parseFloat(yPct)],
      visibility:  type === 'secreto' ? 'secret' : 'public',
      region:      '',
      short:       'Novo local — edite em locations.json',
      description: '',
    };

    state.locations.push(newLoc);
    addMarker(newLoc);
    cancelAddMode();

    // Mostra as coordenadas para o usuário copiar para o JSON
    const coordInfo = `Local criado!\n\nCopie estas coordenadas para o JSON:\n"coords": [${xPct}, ${yPct}]\n\nAdicione manualmente em locations.json para persistir.`;
    alert(coordInfo);
    return;
  }

  // Clique fora de marcador fecha o painel
  closePanel();
}

/* ────────────────────────────────────────────
   10. FILTROS
──────────────────────────────────────────── */
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.type;
      renderAllMarkers();
    });
  });
}

/* ────────────────────────────────────────────
   11. BUSCA
──────────────────────────────────────────── */
function initSearch() {
  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    clearTimeout(state.searchTimeout);
    const q = input.value.trim().toLowerCase();

    if (q.length < 2) {
      results.classList.add('hidden');
      return;
    }

    state.searchTimeout = setTimeout(() => {
      const matches = state.locations.filter(loc => {
        if (loc.visibility === 'secret' && !state.isMaster) return false;
        return (
          loc.name.toLowerCase().includes(q)         ||
          loc.short?.toLowerCase().includes(q)       ||
          loc.description?.toLowerCase().includes(q) ||
          loc.region?.toLowerCase().includes(q)      ||
          loc.tags?.some(t => t.toLowerCase().includes(q)) ||
          loc.npcs?.some(n => n.name.toLowerCase().includes(q))
        );
      }).slice(0, 8);

      if (!matches.length) {
        results.innerHTML = `
          <div style="padding:14px;text-align:center;color:rgba(255,255,255,0.3);
               font-style:italic;font-size:0.85rem;">Nenhum resultado</div>`;
        results.classList.remove('hidden');
        return;
      }

      results.innerHTML = matches.map(loc => {
        const tc = LOCATION_TYPES[loc.type] || LOCATION_TYPES.pdi;
        return `
          <div class="search-item" data-id="${loc.id}">
            <span class="search-item-icon">${tc.icon}</span>
            <div>
              <div class="search-item-name">${loc.name}</div>
              <div class="search-item-type">${tc.label}${loc.region ? ' · ' + loc.region : ''}</div>
            </div>
          </div>`;
      }).join('');

      results.classList.remove('hidden');

      results.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const loc = state.locations.find(l => l.id === item.dataset.id);
          if (loc) {
            // Voa para o marcador
            const coords = pctToLeaflet(loc.coords[0], loc.coords[1]);
            state.map.setView(coords, 1, { animate: true });
            openPanel(loc.id);
          }
          results.classList.add('hidden');
          input.value = '';
        });
      });

    }, 200);
  });

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      results.classList.add('hidden');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      results.classList.add('hidden');
      input.blur();
    }
  });
}

/* ────────────────────────────────────────────
   12. FECHAR PAINEL
──────────────────────────────────────────── */
function initPanelClose() {
  document.getElementById('panel-close').addEventListener('click', closePanel);

  // Esc fecha o painel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('master-modal').classList.contains('hidden')) {
        closeMasterModal();
      } else {
        closePanel();
      }
    }
  });

  // Swipe down fecha no mobile
  let touchStartY = 0;
  const panel = document.getElementById('location-panel');
  panel.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
  panel.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - touchStartY > 80) closePanel();
  }, { passive: true });
}

/* ────────────────────────────────────────────
   13. CARREGAMENTO DE DADOS
──────────────────────────────────────────── */
async function loadLocations() {
  try {
    const resp = await fetch('locations.json');
    if (!resp.ok) throw new Error('locations.json não encontrado');
    const data = await resp.json();
    state.locations = data.locations || [];
  } catch (err) {
    console.warn('Erro ao carregar locations.json:', err);
    state.locations = [];
  }
}

/* ────────────────────────────────────────────
   14. INICIALIZAÇÃO
──────────────────────────────────────────── */
async function init() {
  await loadLocations();
  initMap();
  initMasterTrigger();
  initMasterControls();
  initFilters();
  initSearch();
  initPanelClose();
  renderAllMarkers();

  console.log(
    '%c✦ VELMARA ✦%c Mapa carregado. ' + state.locations.length + ' locais registrados.',
    'color:#e8d090;font-family:serif;font-weight:bold;font-size:14px;',
    'color:#c8b8e8;font-family:serif;'
  );
}

document.addEventListener('DOMContentLoaded', init);
