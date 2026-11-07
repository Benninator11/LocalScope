window.GPU_DATA_READY.then(() => {
  (() => {
  'use strict';
  const db = Array.isArray(window.GPU_DATABASE) ? window.GPU_DATABASE : [];
  let models = Array.isArray(window.AI_MODEL_DATABASE) ? [...window.AI_MODEL_DATABASE] : [];
  const MODEL_API = 'https://ollama.kinduff.com/api/models';
  const MODEL_CACHE_KEY = 'vrammatch-ollama-catalog-v3';
  const LEGACY_MODEL_CACHE_KEY = 'vrammatch-ollama-catalog-v2';
  const MODEL_CACHE_TTL = 24 * 60 * 60 * 1000;
  let catalogLoadPromise = null;
  const $ = id => document.getElementById(id);
  const state = {
    selectedGpu: null, vram: 8, task: 'general', context: 8192,
    page: 1, pageSize: 14, catalogLimit: 12
  };
  const taskLabels = {
    general: 'Allround', coding: 'Programmieren',
    reasoning: 'Reasoning', vision: 'Bilder verstehen'
  };
  const fmtGB = v => {
    if (v === null || v === undefined || Number.isNaN(v)) return 'unbekannt';
    if (v < 1) return `${Math.round(v * 1024)} MB`;
    return `${Number.isInteger(v) ? v : v.toFixed(1)} GB`;
  };
  const quantizationFromTag = tag => {
    const text = String(tag || '').toUpperCase();
    const patterns = [
      ['NVFP4', /NVFP4/], ['MXFP8', /MXFP8/], ['MXFP4', /MXFP4/],
      ['BF16', /BF16/], ['FP16', /FP16|F16/], ['FP32', /FP32|F32/],
      ['Q8', /(?:^|[-_])Q8(?:_|$)/], ['Q6', /(?:^|[-_])Q6(?:_|$)/],
      ['Q5', /(?:^|[-_])Q5(?:_|$)/], ['Q4', /(?:^|[-_])Q4(?:_|$)/],
      ['Q3', /(?:^|[-_])Q3(?:_|$)/], ['Q2', /(?:^|[-_])Q2(?:_|$)/],
      ['IQ', /(?:^|[-_])IQ[0-9]/]
    ];
    for (const [label, pattern] of patterns) if (pattern.test(text)) return label;
    return 'DEFAULT';
  };
  const quantizationDetail = tag => {
    const text = String(tag || '');
    const match = text.match(/(?:^|[-_])((?:Q[2-8](?:_K_[SML]|_K|_[01])?|IQ[0-9][A-Z0-9_]*|FP16|FP32|BF16|F16|MXFP4|MXFP8|NVFP4))(?:$|[-_])/i);
    return match ? match[1].replace(/^q/i, 'Q').replace(/^fp/i, 'FP').replace(/^bf/i, 'BF').replace(/^mxfp/i, 'MXFP').replace(/^nvfp/i, 'NVFP') : 'Standard';
  };
  // Convert machine-friendly Ollama family ids into readable names.
  // Examples: qwen3.8 -> Qwen 3.8, llama3.2-vision -> Llama 3.2 Vision.
  const FAMILY_WORDS = {
    qwen: 'Qwen', llama: 'Llama', deepseek: 'DeepSeek', gemma: 'Gemma',
    phi: 'Phi', gpt: 'GPT', glm: 'GLM', mistral: 'Mistral',
    ministral: 'Ministral', nemotron: 'Nemotron', nvidia: 'NVIDIA',
    granite: 'Granite', cohere: 'Cohere', olmo: 'OLMo', aya: 'Aya',
    yi: 'Yi', falcon: 'Falcon', jamba: 'Jamba', vl: 'VL',
    oss: 'OSS', moe: 'MoE', ai: 'AI', r1: 'R1', r2: 'R2',
    v2: 'V2', v3: 'V3', v4: 'V4'
  };

  function inferModelVersion(family, tag, description) {
    const source = String(family || '').split('/').pop().trim();
    // Most Ollama family ids contain the generation directly, e.g. qwen3.8 or llama3.2.
    // Do not treat DeepSeek's architecture suffix "r1" as a generation number.
    const familyMatch = source.match(/^([a-z][a-z-]*?)-?(\d+(?:\.\d+)*)(?:-(.*))?$/i);
    if (familyMatch && !/(?:^|-)r$/i.test(familyMatch[1])) return familyMatch[2];

    const cleanTag = String(tag || '').trim();
    // Some libraries put the version before the parameter count in a tag,
    // while older Qwen tags encode it as "-v1.5".
    const leadingTagVersion = cleanTag.match(/^(?:v)?(\d+(?:\.\d+)+)(?=[:_-])/i);
    if (leadingTagVersion) return leadingTagVersion[1];
    const taggedVersion = cleanTag.match(/(?:^|[-_])v(\d+(?:\.\d+)+)(?=$|[-_])/i);
    if (taggedVersion) return taggedVersion[1];

    const knownFamily = source.match(/^(qwen|llama|gemma|phi|mistral|glm)$/i);
    if (knownFamily) {
      const escaped = knownFamily[1].replace(/[.*+?^${}()|[\]\\]/g, '\\  const guessProvider = modelName => {');
      const descriptionVersion = String(description || '').match(
        new RegExp('\\b' + escaped + '\\s*v?(\\d+(?:\\.\\d+)+)\\b', 'i')
      );
      if (descriptionVersion) return descriptionVersion[1];
    }
    return '';
  }

  function formatModelFamily(family, tag, description) {
    const source = String(family || '').split('/').pop().trim();
    const version = inferModelVersion(source, tag, description);
    let readable = source
      .replace(/([a-z])(?=\d)/gi, '$1 ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = readable.split(' ').filter(Boolean).map(word => {
      const key = word.toLowerCase();
      if (FAMILY_WORDS[key]) return FAMILY_WORDS[key];
      if (/^[a-z]\d+$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    readable = words.join(' ');
    if (version && !new RegExp('(?:^|\\s)' + version.replace(/[.*+?^\u0024{}()|[\]\\]/g, '\\  const guessProvider = modelName => {') + '(?:\\s|$)').test(readable)) {
      readable += ' ' + version;
    }
    return readable || source || 'Unbekanntes Modell';
  }

  function inferParameterSize(tag, model, item) {
    // The colon is important: tags like "27b-q4_K_M" begin directly after "qwen3.8:".
    const match = String(tag || '').match(/(?:^|[:_-])(\d+(?:\.\d+)?[mb])(?=$|[-_:])/i);
    let value = match?.[1];
    if (!value && Array.isArray(model?.sizes)) {
      value = model.sizes.find(size => String(tag || '').toLowerCase().includes(String(size).toLowerCase()));
    }
    if (!value) {
      value = item?.details?.parameter_size || item?.parameter_size ||
        item?.parameters || model?.parameter_size || model?.parameters;
    }
    const normalized = String(value || '').match(/\d+(?:\.\d+)?\s*[mb]/i);
    return normalized ? normalized[0].replace(/\s+/g, '').toUpperCase() :
      (value ? String(value).trim().toUpperCase() : 'Modellvariante');
  }

  function makeModelDisplayName(family, params, quantization) {
    return [family, params, quantization && quantization !== 'Standard' ? quantization : '']
      .filter(Boolean).join(' · ');
  }

  const guessProvider = modelName => {
    const n = String(modelName || '').toLowerCase();
    const pairs = [
      ['qwen', 'Alibaba'], ['deepseek', 'DeepSeek'], ['gemma', 'Google'], ['llama', 'Meta'],
      ['phi', 'Microsoft'], ['mistral', 'Mistral AI'], ['mixtral', 'Mistral AI'],
      ['nvidia', 'NVIDIA'], ['nemotron', 'NVIDIA'], ['granite', 'IBM'], ['command', 'Cohere'],
      ['starcoder', 'BigCode'], ['codestral', 'Mistral AI'], ['devstral', 'Mistral AI'],
      ['aya', 'Cohere'], ['yi', '01.AI'], ['glm', 'Z.ai'], ['minimax', 'MiniMax'],
      ['intern', 'Shanghai AI Lab'], ['falcon', 'TII'], ['jamba', 'AI21 Labs'], ['olmo', 'AI2']
    ];
    return pairs.find(([key]) => n.includes(key))?.[1] || 'Ollama Library';
  };
  const taskScoresFor = (modelName, description, capabilities, vision) => {
    const text = `${modelName} ${description}`.toLowerCase();
    const coding = /code|coder|coding|starcoder|codestral|devstral|deepcoder|codegemma/.test(text);
    const reasoning = /reason|thinking|deepseek|qwq|r1|olmo/.test(text);
    const general = /instruct|chat|assistant|general|llama|qwen|gemma|mistral/.test(text);
    const caps = Array.isArray(capabilities) ? capabilities : [];
    return {
      general: general ? 86 : 72,
      coding: coding ? 95 : (/coder|code/.test(text) ? 88 : 60),
      reasoning: reasoning ? 95 : 68,
      vision: vision || caps.includes('vision') ? 94 : 0
    };
  };
  const tagIsCloud = (tag, detail) => Boolean(detail?.cloud) || /(^|:)cloud($|[-_])/i.test(String(tag || ''));
  const modelSizeLabel = bytes => {
    const gb = bytes / 1e9;
    return gb < 1 ? `${Math.round(bytes / 1e6)} MB` : `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  };

  function convertRemoteFamily(model, detail) {
    const sourceFamily = String(model.name || '').split('/').pop().trim();
    const desc = model.description || `${sourceFamily} – lokales Modell aus der Ollama-Bibliothek.`;
    const capabilities = Array.isArray(model.capabilities) ? model.capabilities : [];
    const tagDetails = Array.isArray(detail.tag_details) ? detail.tag_details : [];
    const rawEntries = tagDetails.filter(item => {
      const tag = String(item.tag || '').trim();
      return tag && tag !== 'latest' && tag !== 'cloud' && !tagIsCloud(tag, item)
        && Number(item.size_bytes || item.size_bytes_max || 0) > 0;
    });

    // Ollama exposes aliases with identical digests. Keep one startable tag per weight set.
    // Prefer a precise quantization and then a descriptive instruct/thinking tag.
    const bestByDigest = new Map();
    for (const item of rawEntries) {
      const tag = String(item.tag).trim();
      const digest = item.digest ? `${model.name}:${item.digest}` : `${model.name}:${tag}`;
      const q = quantizationFromTag(tag);
      const score = (q !== 'DEFAULT' ? 10 : 0) + (/-instruct|thinking|chat/i.test(tag) ? 2 : 0) + (tag.length / 1000);
      const old = bestByDigest.get(digest);
      if (!old || score > old.score) bestByDigest.set(digest, { item, score });
    }

    return [...bestByDigest.values()].map(({ item }) => {
      const tag = String(item.tag);
      const bytes = Number(item.size_bytes_max || item.size_bytes || 0);
      const fileGB = bytes / 1e9;
      const input = Array.isArray(item.input) ? item.input : [];
      const vision = input.length ? input.includes('image') : capabilities.includes('vision');
      const context = Number(item.context || 8192);
      const quantization = quantizationDetail(tag);
      const params = inferParameterSize(tag, model, item);
      const displayFamily = formatModelFamily(sourceFamily, tag, desc);
      const sizeLabel = modelSizeLabel(bytes);
      const taskScores = taskScoresFor(sourceFamily, desc, capabilities, vision);
      return {
        name: makeModelDisplayName(displayFamily, params, quantization),
        family: displayFamily,
        sourceFamily,
        provider: guessProvider(model.name),
        tag: `${model.name}:${tag}`,
        params,
        quantization: quantization === 'Standard' ? 'DEFAULT' : quantizationFromTag(tag),
        quantizationDetail: quantization,
        fileGB,
        sizeLabel,
        minVRAM: Math.round((fileGB + Math.max(1.25, fileGB * 0.12 + 0.65)) * 10) / 10,
        quality: Math.max(taskScores.general, taskScores.coding, taskScores.reasoning),
        tasks: taskScores,
        vision,
        maxContext: context,
        typeLabel: vision ? 'Text + Bild' : 'Text',
        desc,
        note: item.updated_label ? `Ollama-Tag · aktualisiert ${item.updated_label}` : 'Ollama-Bibliothek',
        url: model.url || `https://ollama.com/library/${encodeURIComponent(sourceFamily)}`,
        multiGpu: fileGB > 36,
        special: false,
        digest: item.digest || '',
        input
      };
    });
  }

  function normalizeCachedModel(row) {
    const sourceFamily = String(row.sourceFamily || row.family || '').split('/').pop().trim();
    const fullTag = String(row.tag || '');
    const colon = fullTag.indexOf(':');
    const tag = colon >= 0 ? fullTag.slice(colon + 1) : fullTag;
    const pseudoModel = { name: sourceFamily, description: row.desc || '', sizes: [] };
    const params = inferParameterSize(tag, pseudoModel, null);
    const quantization = quantizationDetail(tag);
    const displayFamily = formatModelFamily(sourceFamily, tag, row.desc || '');
    return {
      ...row,
      name: makeModelDisplayName(displayFamily, params, quantization),
      family: displayFamily,
      sourceFamily,
      params,
      quantization: quantization === 'Standard' ? 'DEFAULT' : quantizationFromTag(tag),
      quantizationDetail: quantization
    };
  }

  function applyCatalogData(remoteModels, sourceLabel) {
    const byTag = new Map();
    for (const item of remoteModels) if (item?.tag) byTag.set(item.tag.toLowerCase(), item);
    models = [...byTag.values()];
    window.AI_MODEL_DATABASE = models;
    $('modelCountHero').textContent = models.length.toLocaleString('de-DE');
    if ($('catalogSourceCount')) $('catalogSourceCount').textContent = `${models.length.toLocaleString('de-DE')} Varianten`;
    if ($('catalogStatus')) {
      $('catalogStatus').textContent = sourceLabel;
      $('catalogStatus').className = 'catalog-status is-online';
    }
    renderAllModels();
  }

  function readCatalogCache() {
    try {
      // Read the previous cache once, upgrade its names, and store the normalized format.
      for (const key of [MODEL_CACHE_KEY, LEGACY_MODEL_CACHE_KEY]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const cache = JSON.parse(raw);
        if (!Array.isArray(cache.models) || cache.models.length < 500) continue;
        const normalized = cache.models.map(normalizeCachedModel);
        if (key !== MODEL_CACHE_KEY) {
          try {
            localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify({ ...cache, models: normalized }));
          } catch (_) { /* Keep the legacy cache usable even when storage is full. */ }
        }
        return { ...cache, models: normalized };
      }
      return null;
    } catch (_) { return null; }
  }

  function saveCatalogCache(rows) {
    try {
      localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), models: rows }));
    } catch (_) {
      // Browsers may disable storage for file:// pages; the live catalogue still works.
    }
  }

  async function fetchJson(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function refreshModelCatalog(force = false) {
    if (catalogLoadPromise) return catalogLoadPromise;
    catalogLoadPromise = (async () => {
      const cached = readCatalogCache();
      if (cached && !force) {
        applyCatalogData(cached.models, '✓ 500+ Varianten aus lokalem Cache');
        if (Date.now() - Number(cached.savedAt || 0) < MODEL_CACHE_TTL) return;
      } else if ($('catalogStatus')) {
        $('catalogStatus').textContent = 'Ollama-Katalog wird verbunden …';
        $('catalogStatus').className = 'catalog-status is-loading';
      }

      try {
        const index = await fetchJson(`${MODEL_API}?cloud=false`, 10000);
        const families = (index.models || [])
          .filter(model => model && model.name && !model.cloud && !String(model.name).includes('/'))
          .sort((a, b) => Number(b.tags || 0) - Number(a.tags || 0));
        if (!families.length) throw new Error('Keine lokalen Modellfamilien gefunden');

        const collected = new Map();
        let processed = 0;
        const maxFamilies = Math.min(families.length, 45);
        for (let offset = 0; offset < maxFamilies && collected.size < 550; offset += 5) {
          const batch = families.slice(offset, offset + 5);
          const details = await Promise.all(batch.map(async family => {
            try {
              return { family, detail: await fetchJson(`${MODEL_API}/${encodeURIComponent(family.name)}`, 6000) };
            } catch (_) { return { family, detail: null }; }
          }));
          for (const result of details) {
            processed++;
            if (!result.detail) continue;
            for (const row of convertRemoteFamily(result.family, result.detail)) {
              // Use the full, startable Ollama tag as a stable unique key.
              if (!collected.has(row.tag.toLowerCase())) collected.set(row.tag.toLowerCase(), row);
            }
          }
          if ($('catalogStatus')) {
            $('catalogStatus').textContent = `Modell-Tags geladen: ${collected.size.toLocaleString('de-DE')} · ${processed} Modellfamilien geprüft …`;
            $('catalogStatus').className = 'catalog-status is-loading';
          }
        }

        const remoteRows = [...collected.values()];
        if (remoteRows.length < 500) throw new Error(`Nur ${remoteRows.length} installierbare Tags gefunden`);
        // Replace the initial sample with real, local, installable Ollama variants.
        applyCatalogData(remoteRows, `✓ Live-Katalog · ${remoteRows.length.toLocaleString('de-DE')} echte Ollama-Tags`);
        saveCatalogCache(remoteRows);
      } catch (error) {
        if (cached && cached.models.length >= 500) {
          applyCatalogData(cached.models, '✓ Offline-Cache · 500+ Varianten');
        } else {
          if ($('catalogStatus')) {
            $('catalogStatus').textContent = `Online-Katalog nicht erreichbar · Offline-Auswahl: ${models.length} Varianten`;
            $('catalogStatus').className = 'catalog-status is-offline';
          }
          $('modelCountHero').textContent = models.length.toLocaleString('de-DE');
          if ($('catalogSourceCount')) $('catalogSourceCount').textContent = `${models.length.toLocaleString('de-DE')} lokal`;
        }
      }
    })().finally(() => { catalogLoadPromise = null; });
    return catalogLoadPromise;
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const vendorClass = v => String(v || '').toLowerCase().replace(/[^a-z]/g, '');
  const gpuSubtitle = g => `${g.vendor} · ${g.arch} · ${g.year || 'Jahr unbekannt'} · ${g.type}`;
  const modelContextExtra = () => Math.max(0, (state.context / 8192) - 1) * 0.42;
  const modelRequirement = m => Math.round((m.minVRAM + modelContextExtra()) * 10) / 10;

  function classifyModel(m, vram = state.vram) {
    const required = modelRequirement(m);
    const weightNeed = m.fileGB + Math.max(0, modelContextExtra() * 0.55) + 0.35;
    if (vram >= required) return 'fit';
    if (vram >= weightNeed) return 'tight';
    return 'too-big';
  }

  function refreshSelectedGpuCard() {
    const g = state.selectedGpu;
    if (!g) return;
    $('selectedGpu').classList.remove('empty-selected');
    const sourceMemory = g.memory === 'manuell' ? 'VRAM manuell eingetragen' : `Datenbank: ${g.memory}`;
    $('selectedGpu').innerHTML = `<span class="selected-symbol">▦</span><span><b>${esc(g.model)}</b><small>${esc(gpuSubtitle(g))} · ${esc(sourceMemory)} · verwendet: ${esc(fmtGB(state.vram))}</small></span>`;
  }

  function selectGpu(g) {
    state.selectedGpu = g;
    $('gpuSearch').value = g.model;
    $('gpuSuggestions').hidden = true;
    if (g.vramGB !== null && g.vramGB !== undefined) {
      state.vram = Number(g.vramGB.toFixed(2));
      $('vramInput').value = state.vram;
    }
    refreshSelectedGpuCard();
    updatePresets();
    renderAllModels();
  }

  function clearGpu() {
    state.selectedGpu = null;
    $('gpuSearch').value = '';
    $('selectedGpu').classList.add('empty-selected');
    $('selectedGpu').innerHTML = '<span class="selected-symbol">＋</span><span><b>Noch keine GPU ausgewählt</b><small>Du kannst auch nur deinen VRAM eintragen.</small></span>';
    $('gpuSuggestions').hidden = true;
    renderAllModels();
  }

  function renderSuggestions() {
    const q = $('gpuSearch').value.trim().toLowerCase();
    const box = $('gpuSuggestions');
    if (!q) { box.hidden = true; return; }
    const matches = db.filter(g => `${g.model} ${g.vendor} ${g.arch} ${g.series} ${g.year}`.toLowerCase().includes(q))
      .sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 12);
    let html = matches.map(g => `<button type="button" class="suggestion" data-gpu-index="${db.indexOf(g)}"><span><b>${esc(g.model)}</b><small>${esc(g.vendor)} · ${esc(g.arch)} · ${g.year}</small></span><span class="suggestion-vram">${esc(g.memory)}</span></button>`).join('');
    if (!matches.length) html = '<div class="suggestion-empty">Keine passende GPU in der Datenbank gefunden.</div>';
    html += `<button type="button" class="manual-use" id="useManualGpu">GPU manuell verwenden: „${esc($('gpuSearch').value.trim())}“</button>`;
    box.innerHTML = html;
    box.hidden = false;
    box.querySelectorAll('[data-gpu-index]').forEach(b => b.addEventListener('click', () => selectGpu(db[Number(b.dataset.gpuIndex)])));
    const manual = $('useManualGpu');
    if (manual) manual.addEventListener('click', () => {
      const name = $('gpuSearch').value.trim();
      state.selectedGpu = { model: name, vendor: 'Unbekannt', arch: 'Manuell', year: null, type: 'Manuell', memory: 'manuell', vramGB: null };
      refreshSelectedGpuCard();
      box.hidden = true;
      renderAllModels();
    });
  }

  function updatePresets() {
    document.querySelectorAll('[data-vram]').forEach(b => b.classList.toggle('active', Number(b.dataset.vram) === state.vram));
  }

  function getTaskModels() {
    return models.filter(m => state.task !== 'vision' || m.vision);
  }

  function renderRecommendations() {
    const result = $('resultContent');
    if (state.vram <= 0) {
      result.innerHTML = '<div class="empty-result"><div class="empty-icon">◫</div><h4>VRAM eingeben</h4><p>Trage den verfügbaren Grafikspeicher deiner GPU ein, damit wir passende lokale Modelle berechnen können.</p></div>';
      return;
    }
    const ranked = getTaskModels().map(m => ({ ...m, required: modelRequirement(m), fitState: classifyModel(m) }));
    const eligible = ranked.filter(m => m.fitState === 'fit').sort((a, b) => {
      const scoreA = a.tasks[state.task] + Math.min(8, Math.log2(a.fileGB + 1) * 1.3);
      const scoreB = b.tasks[state.task] + Math.min(8, Math.log2(b.fileGB + 1) * 1.3);
      return scoreB - scoreA;
    });
    const candidates = eligible.length ? eligible : ranked.sort((a, b) => a.required - b.required).slice(0, 4);
    if (!candidates.length) {
      result.innerHTML = '<div class="empty-result"><div class="empty-icon">⌁</div><h4>Kein Treffer</h4><p>Für diesen Einsatzzweck sind keine Modelle eingetragen.</p></div>';
      return;
    }
    const best = candidates[0];
    const isFit = best.fitState === 'fit';
    const status = isFit ? (state.vram - best.required >= Math.max(2.5, state.vram * .13) ? 'GUTER FIT' : 'PASST KNAPP') : 'KLEINSTE OPTION';
    const why = isFit
      ? `Geschätzter Bedarf: ${best.required.toFixed(1)} GB inklusive Laufzeit-Reserve für ${Math.round(state.context / 1024)}K Kontext. ${state.task === 'vision' ? 'Das Modell unterstützt Bild-Eingaben.' : `Auf „${taskLabels[state.task]}“ gewichtet.`}`
      : `Die Gewichte benötigen etwa ${best.sizeLabel}; empfohlen werden ${best.required.toFixed(1)} GB. Mit ${state.vram.toFixed(1)} GB wäre Auslagerung in den Arbeitsspeicher nötig oder ein kleineres Modell sinnvoll.`;
    const alternatives = ranked.filter(m => m.tag !== best.tag)
      .sort((a, b) => (b.tasks[state.task] - a.tasks[state.task]) || (a.required - b.required))
      .slice(0, 4);
    result.innerHTML = `
      <div class="featured-model">
        <span class="fit-label">${status}</span>
        <div class="match-label">✦ BESTER TREFFER FÜR ${esc(taskLabels[state.task].toUpperCase())}</div>
        <h4>${esc(best.name)}</h4>
        <div class="model-tag">${esc(best.tag)}</div>
        <p class="model-desc">${esc(best.desc)}</p>
        <div class="model-stats">
          <div class="stat-chip"><b>${esc(best.sizeLabel)}</b><small>DOWNLOADGRÖSSE*</small></div>
          <div class="stat-chip"><b>~${best.required.toFixed(1)} GB</b><small>EMPFOHLENER VRAM</small></div>
          <div class="stat-chip"><b>${best.tasks[state.task]}/100</b><small>AUFGABEN-FIT**</small></div>
        </div>
        <div class="reason-row"><span>✓</span><span>${esc(why)}</span></div>
        <div class="featured-actions"><button type="button" class="copy-command" data-copy="${esc(best.tag)}">OLLAMA-BEFEHL KOPIEREN</button><a class="model-link" href="${esc(best.url)}" target="_blank" rel="noopener">Modellseite ↗</a></div>
      </div>
      <div class="alternatives-head"><b>${isFit ? 'Weitere passende Modelle' : 'Kleinere / alternative Modelle'}</b><span>${eligible.length} PASSEN IN DEIN VRAM-BUDGET</span></div>
      <div class="alternative-list">${alternatives.length ? alternatives.map(m => `
        <div class="alternative"><div class="alternative-icon">AI</div><div><div class="alternative-name">${esc(m.name)}</div><div class="alternative-meta">${esc(m.tag)} · ${m.tasks[state.task]}/100 · ${m.fitState === 'fit' ? 'passt' : m.fitState === 'tight' ? 'knapp' : 'zu groß'}</div></div><div class="alternative-size">${esc(m.sizeLabel)}<small>~${m.required.toFixed(1)} GB VRAM</small></div></div>`).join('') : '<div class="alternative"><div class="alternative-icon">—</div><div><div class="alternative-name">Keine weitere Variante</div><div class="alternative-meta">Ändere VRAM oder Aufgabe für weitere Vorschläge.</div></div></div>'}</div>
      <div class="model-note">*Downloadgröße ist die in der Ollama-Bibliothek angegebene Modellgröße und hängt vom Tag ab. **Aufgaben-Fit ist eine grobe Orientierung, kein unabhängiger Benchmark. VRAM-Bedarf inklusive geschätzter Reserve; tatsächlicher Bedarf hängt stark von Backend, Kontext und Einstellungen ab. <a class="model-link" href="${esc(best.url)}" target="_blank" rel="noopener">Quelle öffnen ↗</a></div>`;
    result.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyOllamaCommand(b.dataset.copy, b)));
  }

  function renderTierButtons() {
    const tiers = [2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64, 80, 96, 128, 192, 256];
    const filtered = getTaskModels();
    $('vramTierSummary').innerHTML = tiers.map(gb => {
      const count = filtered.filter(m => classifyModel(m, gb) === 'fit').length;
      return `<button type="button" class="tier-button ${Number(gb) === state.vram ? 'active' : ''}" data-tier="${gb}"><b>${gb} GB</b><span>${count} Modelle</span></button>`;
    }).join('');
    $('vramTierSummary').querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => {
      $('vramInput').value = b.dataset.tier;
      state.vram = Number(b.dataset.tier);
      refreshSelectedGpuCard();
      updatePresets();
      renderAllModels();
    }));
  }

  function renderCatalog() {
    const search = $('modelSearch').value.trim().toLowerCase();
    const fitFilter = $('modelFitFilter').value;
    const sort = $('modelSort').value;
    const quantFilter = $('modelQuantFilter')?.value || 'all';
    const taskItems = getTaskModels();
    const stats = { fit: 0, tight: 0, 'too-big': 0 };
    taskItems.forEach(m => stats[classifyModel(m)]++);
    $('catalogStats').innerHTML = `
      <div class="catalog-stat is-fit"><b>${stats.fit}</b><span>PASSEN</span></div>
      <div class="catalog-stat is-tight"><b>${stats.tight}</b><span>KNAPP</span></div>
      <div class="catalog-stat is-big"><b>${stats['too-big']}</b><span>ZU GROSS</span></div>
      <div class="catalog-stat-total"><b>${taskItems.length}</b><span>MODELLE IM KATALOG</span></div>`;

    let list = taskItems.filter(m => {
      const haystack = `${m.name} ${m.family} ${m.provider} ${m.tag} ${m.params}`.toLowerCase();
      if (search && !haystack.includes(search)) return false;
      if (fitFilter !== 'all' && classifyModel(m) !== fitFilter) return false;
      if (quantFilter !== 'all' && (m.quantization || quantizationFromTag(m.tag)) !== quantFilter) return false;
      return true;
    });
    if (sort === 'small') list.sort((a, b) => a.fileGB - b.fileGB);
    else if (sort === 'large') list.sort((a, b) => b.fileGB - a.fileGB);
    else list.sort((a, b) => (b.tasks[state.task] - a.tasks[state.task]) || (a.minVRAM - b.minVRAM));
    $('catalogResultCount').textContent = `${list.length} Treffer für ${state.vram.toLocaleString('de-DE')} GB VRAM`;
    const shown = list.slice(0, state.catalogLimit);
    $('modelCatalog').innerHTML = shown.map(m => {
      const status = classifyModel(m);
      const statusLabel = status === 'fit' ? 'PASST' : status === 'tight' ? 'KNAPP' : 'ZU GROSS';
      const capText = m.vision ? 'Text + Bild' : 'Text';
      const multi = m.multiGpu ? '<span class="model-flag">Multi-GPU / großer RAM</span>' : '';
      const note = m.note ? `<p class="model-card-note">${esc(m.note)}</p>` : '';
      return `<article class="model-catalog-card status-${status}">
        <div class="model-card-top"><span class="model-provider">${esc(m.provider)}</span><span class="model-status">${statusLabel}</span></div>
        <h3>${esc(m.name)}</h3><div class="model-family">${esc(m.family)} · ${esc(m.params)} · ${capText} · ${esc(m.quantizationDetail || quantizationDetail(m.tag))}</div>
        <div class="model-card-metrics"><div><b>${esc(m.sizeLabel)}</b><small>DOWNLOAD</small></div><div><b>~${modelRequirement(m).toFixed(1)} GB</b><small>VRAM EMPFOHLEN</small></div><div><b>${Math.round(m.maxContext / 1024)}K</b><small>MAX. KONTEXT*</small></div></div>
        ${multi}${note}
        <div class="model-card-actions"><button type="button" class="copy-command" data-copy="${esc(m.tag)}">OLLAMA RUN KOPIEREN</button><a href="${esc(m.url)}" target="_blank" rel="noopener">Details ↗</a></div>
      </article>`;
    }).join('') || '<div class="catalog-empty">Keine Modelle für diese Filter gefunden. Wähle „Alle Speicherlagen“ oder ändere den Suchbegriff.</div>';
    $('showMoreModels').hidden = list.length <= state.catalogLimit;
    $('showMoreModels').textContent = `Weitere Modelle anzeigen (${list.length - state.catalogLimit} übrig)`;
    $('modelCatalog').querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyOllamaCommand(b.dataset.copy, b)));
  }

  async function copyOllamaCommand(tag, button) {
    const command = `ollama run ${tag}`;
    try {
      await navigator.clipboard.writeText(command);
      const old = button.textContent;
      button.textContent = 'KOPIERT ✓';
      button.classList.add('copied');
      window.setTimeout(() => { button.textContent = old; button.classList.remove('copied'); }, 1600);
    } catch (err) {
      window.prompt('Befehl manuell kopieren:', command);
    }
  }

  function renderAllModels() {
    const typedVram = Number($('vramInput').value);
    state.vram = Number.isFinite(typedVram) ? Math.max(0, typedVram) : 0;
    state.context = Number($('contextSelect').value) || 8192;
    updatePresets();
    refreshSelectedGpuCard();
    renderRecommendations();
    renderTierButtons();
    renderCatalog();
  }

  let filteredRows = [];
  function filterRows() {
    const q = $('dbSearch').value.trim().toLowerCase();
    const vendor = $('vendorFilter').value;
    const type = $('typeFilter').value;
    const year = $('yearFilter').value;
    filteredRows = db.filter(g => {
      if (vendor !== 'all' && g.vendor !== vendor) return false;
      if (type !== 'all' && g.type !== type) return false;
      if (year !== 'all') {
        const y = g.year || 0;
        if (year === '2001') { if (y > 2009) return false; }
        else if (y < Number(year)) return false;
      }
      if (q && !`${g.model} ${g.vendor} ${g.arch} ${g.series} ${g.type} ${g.year} ${g.memory}`.toLowerCase().includes(q)) return false;
      return true;
    });
    state.page = 1;
    renderTable();
  }

  function renderTable() {
    const pages = Math.max(1, Math.ceil(filteredRows.length / state.pageSize));
    state.page = Math.min(Math.max(state.page, 1), pages);
    const start = (state.page - 1) * state.pageSize;
    const items = filteredRows.slice(start, start + state.pageSize);
    $('gpuTableBody').innerHTML = items.map(g => {
      const idx = db.indexOf(g);
      return `<tr><td><span class="gpu-name">${esc(g.model)}</span></td><td><span class="vendor-mark"><i class="vendor-dot ${vendorClass(g.vendor)}"></i>${esc(g.vendor)}</span></td><td>${esc(g.arch)}</td><td class="gpu-year">${g.year || '—'}</td><td>${esc(g.type)}</td><td class="gpu-memory">${esc(g.memory)}</td><td><button class="pick-gpu" data-pick="${idx}" type="button">AUSWÄHLEN</button></td></tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#8d96a3">Keine GPUs für diesen Filter gefunden.</td></tr>';
    $('gpuCount').textContent = db.length.toLocaleString('de-DE');
    $('tableSummary').textContent = `Zeige ${filteredRows.length ? start + 1 : 0}–${Math.min(start + state.pageSize, filteredRows.length)} von ${filteredRows.length.toLocaleString('de-DE')} GPUs`;
    $('pageInfo').textContent = `${state.page} / ${pages}`;
    $('prevPage').disabled = state.page <= 1;
    $('nextPage').disabled = state.page >= pages;
    document.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
      selectGpu(db[Number(b.dataset.pick)]);
      $('finder').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  $('gpuSearch').addEventListener('input', renderSuggestions);
  $('gpuSearch').addEventListener('focus', () => { if ($('gpuSearch').value.trim()) renderSuggestions(); });
  $('clearGpu').addEventListener('click', clearGpu);
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap') && !e.target.closest('.suggestions')) $('gpuSuggestions').hidden = true;
  });
  $('vramInput').addEventListener('input', renderAllModels);
  $('contextSelect').addEventListener('change', renderAllModels);
  $('vramPresets').addEventListener('click', e => {
    const b = e.target.closest('[data-vram]');
    if (!b) return;
    $('vramInput').value = b.dataset.vram;
    renderAllModels();
  });
  $('taskGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-task]');
    if (!b) return;
    state.task = b.dataset.task;
    document.querySelectorAll('.task-option').forEach(el => el.classList.toggle('active', el === b));
    renderAllModels();
  });
  $('resetButton').addEventListener('click', () => {
    clearGpu();
    $('vramInput').value = 8;
    $('contextSelect').value = '8192';
    state.vram = 8;
    state.task = 'general';
    $('taskGrid').querySelectorAll('.task-option').forEach(b => b.classList.toggle('active', b.dataset.task === 'general'));
    renderAllModels();
  });
  ['dbSearch', 'vendorFilter', 'typeFilter', 'yearFilter'].forEach(id => $(id).addEventListener(id === 'dbSearch' ? 'input' : 'change', filterRows));
  $('prevPage').addEventListener('click', () => { state.page--; renderTable(); });
  $('nextPage').addEventListener('click', () => { state.page++; renderTable(); });
  $('modelSearch').addEventListener('input', () => { state.catalogLimit = 12; renderCatalog(); });
  $('modelFitFilter').addEventListener('change', () => { state.catalogLimit = 12; renderCatalog(); });
  $('modelSort').addEventListener('change', () => { state.catalogLimit = 12; renderCatalog(); });
  if ($('modelQuantFilter')) $('modelQuantFilter').addEventListener('change', () => { state.catalogLimit = 12; renderCatalog(); });
  if ($('refreshCatalog')) $('refreshCatalog').addEventListener('click', () => { refreshModelCatalog(true); });
  $('showMoreModels').addEventListener('click', () => { state.catalogLimit += 12; renderCatalog(); });

  function setupMotionReveal() {
    const targets = [...document.querySelectorAll(
      '.workspace > .section-heading, .hardware-panel, .result-panel, ' +
      '.model-catalog-section > .section-heading, .model-library-panel, ' +
      '.database-section > .section-heading, .database-panel, ' +
      '.how-section > .section-kicker, .how-section > h2, .how-grid article, .notice'
    )];
    targets.forEach((element, index) => {
      element.classList.add('motion-reveal');
      element.style.setProperty('--reveal-delay', `${(index % 4) * 75}ms`);
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(element => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(element => observer.observe(element));
  }

  setupMotionReveal();

  if (!db.length) { $('gpuSearch').placeholder = 'GPU-Datenbank konnte nicht geladen werden'; $('gpuCount').textContent = '0'; }
  $('modelCountHero').textContent = models.length.toLocaleString('de-DE');
  if ($('catalogSourceCount')) $('catalogSourceCount').textContent = `${models.length.toLocaleString('de-DE')} Offline-Varianten`;
  filteredRows = db.slice();
  renderTable();
  renderAllModels();
  refreshModelCatalog(false);
  })();
});