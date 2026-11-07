/*
 * Offline model catalogue for VRAMMatch.
 * Download sizes come from the corresponding Ollama library tags where listed.
 * Recommended VRAM is a conservative estimate including runtime/context headroom.
 */
(() => {
  const models = [];
  const profiles = {
    general:    { general: 88, coding: 72, reasoning: 78, vision: 18 },
    coding:     { general: 73, coding: 94, reasoning: 83, vision: 18 },
    reasoning:  { general: 80, coding: 79, reasoning: 96, vision: 18 },
    multimodal: { general: 84, coding: 78, reasoning: 84, vision: 94 },
    vision:     { general: 80, coding: 68, reasoning: 79, vision: 94 }
  };

  function add(family, provider, variants, options = {}) {
    for (const v of variants) {
      const fileGB = v.fileGB;
      const minVRAM = v.minVRAM ?? Math.max(fileGB + (fileGB < 3 ? 1.35 : fileGB < 10 ? 2.0 : 3.0), fileGB * 1.12 + 0.9);
      models.push({
        name: v.name || `${family} · ${v.params}`,
        family,
        provider,
        tag: v.tag,
        params: v.params,
        fileGB,
        sizeLabel: v.sizeLabel || `ca. ${fileGB} GB`,
        minVRAM: Math.round(minVRAM * 10) / 10,
        quality: v.quality || 75,
        tasks: { ...(profiles[options.profile || 'general']), ...(v.tasks || {}) },
        vision: v.vision ?? options.vision ?? false,
        maxContext: v.maxContext || options.maxContext || 32768,
        typeLabel: v.typeLabel || (v.vision ?? options.vision ? 'Text + Bild' : 'Text'),
        desc: v.desc || options.desc || `${family}-Variante für lokale Inferenz.`,
        note: v.note || options.note || '',
        url: v.url || options.url,
        multiGpu: Boolean(v.multiGpu),
        special: Boolean(v.special)
      });
    }
  }

  const q35 = 'https://ollama.com/library/qwen3.5';
  const q36 = 'https://ollama.com/library/qwen3.6';
  const q38 = 'https://ollama.com/library/qwen3.8';
  const gemma4 = 'https://ollama.com/library/gemma4';
  const q3 = 'https://ollama.com/library/qwen3';
  const q3vl = 'https://ollama.com/library/qwen3-vl';
  const qcoder = 'https://ollama.com/library/qwen2.5-coder';
  const deepseek = 'https://ollama.com/library/deepseek-r1';
  const gptoss = 'https://ollama.com/library/gpt-oss';
  const gemma3 = 'https://ollama.com/library/gemma3';

  add('Qwen 3.5', 'Alibaba', [
    {params:'0.8B',tag:'qwen3.5:0.8b',fileGB:1.2,sizeLabel:'1.2–1.3 GB',minVRAM:3.0,quality:52},
    {params:'2B',tag:'qwen3.5:2b',fileGB:2.7,sizeLabel:'2.7–3.1 GB',minVRAM:4.5,quality:62},
    {params:'4B',tag:'qwen3.5:4b',fileGB:3.3,sizeLabel:'3.3–4.0 GB',minVRAM:5.8,quality:72},
    {params:'9B',tag:'qwen3.5:9b',fileGB:6.6,sizeLabel:'6.6–7.6 GB',minVRAM:9.0,quality:84},
    {params:'27B',tag:'qwen3.5:27b',fileGB:17,sizeLabel:'17–20 GB',minVRAM:21,quality:92},
    {params:'35B',tag:'qwen3.5:35b',fileGB:22,sizeLabel:'ca. 22 GB',minVRAM:27,quality:94},
    {params:'122B',tag:'qwen3.5:122b',fileGB:81,sizeLabel:'ca. 81 GB',minVRAM:96,quality:98,multiGpu:true}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:q35,desc:'Multimodale Qwen-Familie mit Bildverständnis, Werkzeugnutzung und Thinking-Modus.'});

  add('Qwen 3.6', 'Alibaba', [
    {params:'27B',tag:'qwen3.6:27b',fileGB:18,sizeLabel:'18–19 GB',minVRAM:22,quality:94},
    {params:'35B-A3B',tag:'qwen3.6:35b-a3b',fileGB:23,sizeLabel:'ca. 23 GB',minVRAM:27,quality:96}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:q36,desc:'Neuere Qwen-Reihe mit Fokus auf Coding, Agenten-Workflows und Bildverständnis.'});

  add('Qwen 3.8', 'Alibaba', [
    {params:'27B',tag:'qwen3.8:27b',fileGB:18,sizeLabel:'ca. 18 GB',minVRAM:22,quality:95}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:q38,desc:'Qwen-Modellgeneration mit Schwerpunkt auf Coding, Recherche und längeren Agenten-Aufgaben.'});

  add('Gemma 4', 'Google', [
    {params:'E2B',tag:'gemma4:e2b',fileGB:4.6,sizeLabel:'4.6–7.5 GB',minVRAM:6.6,quality:70},
    {params:'E4B',tag:'gemma4:e4b',fileGB:6.6,sizeLabel:'6.6–9.5 GB',minVRAM:9.2,quality:81},
    {params:'12B',tag:'gemma4:12b',fileGB:7.7,sizeLabel:'7.7–8.0 GB',minVRAM:10.5,quality:87},
    {params:'26B A4B',tag:'gemma4:26b',fileGB:16,sizeLabel:'16–19 GB',minVRAM:21,quality:93},
    {params:'31B',tag:'gemma4:31b',fileGB:19,sizeLabel:'19–20 GB',minVRAM:23.5,quality:95}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:gemma4,desc:'Multimodal: Text und Bilder; E2B/E4B sind effiziente Edge-Varianten, 26B ist ein MoE-Modell.'});

  add('Qwen 3', 'Alibaba', [
    {params:'0.6B',tag:'qwen3:0.6b',fileGB:0.523,sizeLabel:'523 MB',minVRAM:2.0,quality:43,maxContext:40960},
    {params:'1.7B',tag:'qwen3:1.7b',fileGB:1.4,sizeLabel:'1.4 GB',minVRAM:2.9,quality:57,maxContext:40960},
    {params:'4B',tag:'qwen3:4b',fileGB:2.5,sizeLabel:'2.5 GB',minVRAM:4.2,quality:70,maxContext:262144},
    {params:'8B',tag:'qwen3:8b',fileGB:5.2,sizeLabel:'5.2 GB',minVRAM:7.4,quality:82,maxContext:40960},
    {params:'14B',tag:'qwen3:14b',fileGB:9.3,sizeLabel:'9.3 GB',minVRAM:12,quality:88,maxContext:40960},
    {params:'30B A3B',tag:'qwen3:30b',fileGB:19,sizeLabel:'19 GB',minVRAM:23,quality:92,maxContext:262144},
    {params:'32B',tag:'qwen3:32b',fileGB:20,sizeLabel:'20 GB',minVRAM:24,quality:93,maxContext:40960},
    {params:'235B A22B',tag:'qwen3:235b',fileGB:142,sizeLabel:'142 GB',minVRAM:166,quality:98,maxContext:262144,multiGpu:true}
  ], {profile:'general',url:q3,desc:'Dichte und Mixture-of-Experts-Modelle für Chat, Wissen, Werkzeuge und Reasoning.'});

  add('Qwen 3 VL', 'Alibaba', [
    {params:'2B',tag:'qwen3-vl:2b',fileGB:1.9,sizeLabel:'1.9 GB',minVRAM:3.4,quality:59},
    {params:'4B',tag:'qwen3-vl:4b',fileGB:3.3,sizeLabel:'3.3 GB',minVRAM:5.2,quality:72},
    {params:'8B',tag:'qwen3-vl:8b',fileGB:6.2,sizeLabel:'6.2 GB',minVRAM:8.8,quality:85},
    {params:'30B A3B',tag:'qwen3-vl:30b',fileGB:20,sizeLabel:'20 GB',minVRAM:24,quality:93},
    {params:'32B',tag:'qwen3-vl:32b',fileGB:21,sizeLabel:'21 GB',minVRAM:25,quality:94},
    {params:'235B A22B',tag:'qwen3-vl:235b',fileGB:143,sizeLabel:'143 GB',minVRAM:167,quality:98,multiGpu:true}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:q3vl,desc:'Vision-Language-Modelle: können Bilder zusammen mit Text analysieren.'});

  add('Qwen 2.5 Coder', 'Alibaba', [
    {params:'0.5B',tag:'qwen2.5-coder:0.5b',fileGB:0.398,sizeLabel:'398 MB',minVRAM:1.8,quality:48},
    {params:'1.5B',tag:'qwen2.5-coder:1.5b',fileGB:0.986,sizeLabel:'986 MB',minVRAM:2.4,quality:59},
    {params:'3B',tag:'qwen2.5-coder:3b',fileGB:1.9,sizeLabel:'1.9 GB',minVRAM:3.4,quality:70},
    {params:'7B',tag:'qwen2.5-coder:7b',fileGB:4.7,sizeLabel:'4.7 GB',minVRAM:6.8,quality:82},
    {params:'14B',tag:'qwen2.5-coder:14b',fileGB:9,sizeLabel:'9.0 GB',minVRAM:11.5,quality:90},
    {params:'32B',tag:'qwen2.5-coder:32b',fileGB:20,sizeLabel:'20 GB',minVRAM:24,quality:96}
  ], {profile:'coding',url:qcoder,desc:'Auf Code-Generierung, Code-Verständnis und Fehlerbehebung spezialisiert.'});

  add('DeepSeek R1', 'DeepSeek', [
    {params:'1.5B Distill',tag:'deepseek-r1:1.5b',fileGB:1.1,sizeLabel:'1.1 GB',minVRAM:2.5,quality:61},
    {params:'7B Distill',tag:'deepseek-r1:7b',fileGB:4.7,sizeLabel:'4.7 GB',minVRAM:6.8,quality:78},
    {params:'8B Distill',tag:'deepseek-r1:8b',fileGB:5.2,sizeLabel:'5.2 GB',minVRAM:7.4,quality:81},
    {params:'14B Distill',tag:'deepseek-r1:14b',fileGB:9,sizeLabel:'9.0 GB',minVRAM:11.5,quality:88},
    {params:'32B Distill',tag:'deepseek-r1:32b',fileGB:20,sizeLabel:'20 GB',minVRAM:24,quality:94},
    {params:'70B Distill',tag:'deepseek-r1:70b',fileGB:43,sizeLabel:'43 GB',minVRAM:50,quality:97,multiGpu:true},
    {params:'671B',tag:'deepseek-r1:671b',fileGB:404,sizeLabel:'404 GB',minVRAM:460,quality:99,multiGpu:true}
  ], {profile:'reasoning',url:deepseek,desc:'Reasoning-orientierte Modelle; die Distill-Varianten basieren auf kleineren Modellfamilien.'});

  add('GPT-OSS', 'OpenAI', [
    {params:'20B',tag:'gpt-oss:20b',fileGB:14,sizeLabel:'14 GB',minVRAM:16,quality:91,special:true,note:'MXFP4; Ollama nennt 16 GB als kleinste Speicherklasse. Kompatible Runtime/Kernels nötig.'},
    {params:'120B',tag:'gpt-oss:120b',fileGB:65,sizeLabel:'65 GB',minVRAM:80,quality:98,special:true,multiGpu:true,note:'MXFP4; als Zielgröße wird eine einzelne 80-GB-GPU genannt. Kompatible Runtime/Kernels nötig.'}
  ], {profile:'reasoning',url:gptoss,maxContext:131072,desc:'Open-weight Reasoning- und Agentenmodelle mit nativer MXFP4-Quantisierung.'});

  add('Gemma 3', 'Google', [
    {params:'270M',tag:'gemma3:270m',fileGB:0.292,sizeLabel:'292 MB',minVRAM:1.6,quality:36,vision:false,maxContext:32768},
    {params:'1B',tag:'gemma3:1b',fileGB:0.806,sizeLabel:'806 MB',minVRAM:2.2,quality:54,vision:false,maxContext:32768},
    {params:'4B',tag:'gemma3:4b',fileGB:3.4,sizeLabel:'3.4 GB',minVRAM:5.3,quality:73,vision:true,maxContext:131072},
    {params:'12B',tag:'gemma3:12b',fileGB:8.2,sizeLabel:'8.2 GB',minVRAM:10.8,quality:87,vision:true,maxContext:131072},
    {params:'27B',tag:'gemma3:27b',fileGB:17,sizeLabel:'17 GB',minVRAM:21,quality:94,vision:true,maxContext:131072}
  ], {profile:'multimodal',vision:false,url:gemma3,desc:'Kompakte Google-Modelle. Ab 4B unterstützen die Standardvarianten Bild-Eingaben.'});

  add('Llama 3.2', 'Meta', [
    {params:'1B',tag:'llama3.2:1b',fileGB:1.3,sizeLabel:'1.3 GB',minVRAM:2.7,quality:56,maxContext:131072},
    {params:'3B',tag:'llama3.2:3b',fileGB:2.0,sizeLabel:'2.0 GB',minVRAM:3.6,quality:68,maxContext:131072}
  ], {profile:'general',url:'https://ollama.com/library/llama3.2',desc:'Kleine Textmodelle für Chat, Zusammenfassungen und einfache Aufgaben.'});

  add('Llama 3.2 Vision', 'Meta', [
    {params:'11B',tag:'llama3.2-vision',fileGB:7.9,sizeLabel:'7.9 GB',minVRAM:10.5,quality:86,vision:true,maxContext:131072},
    {params:'90B',tag:'llama3.2-vision:90b',fileGB:55,sizeLabel:'55 GB',minVRAM:64,quality:96,vision:true,maxContext:131072,multiGpu:true}
  ], {profile:'multimodal',vision:true,url:'https://ollama.com/library/llama3.2-vision',desc:'Meta-Modelle mit Bildverständnis und Textausgabe.'});

  add('Llama 3.1', 'Meta', [
    {params:'8B',tag:'llama3.1:8b',fileGB:4.9,sizeLabel:'4.9 GB',minVRAM:7.1,quality:82,maxContext:131072},
    {params:'70B',tag:'llama3.1:70b',fileGB:43,sizeLabel:'43 GB',minVRAM:51,quality:96,maxContext:131072,multiGpu:true},
    {params:'405B',tag:'llama3.1:405b',fileGB:231,sizeLabel:'231 GB',minVRAM:265,quality:99,maxContext:131072,multiGpu:true}
  ], {profile:'general',url:'https://ollama.com/library/llama3.1',desc:'Meta Llama 3.1 in mehreren Größen für allgemeine Sprachaufgaben.'});

  add('Llama 3.3', 'Meta', [
    {params:'70B',tag:'llama3.3:70b',fileGB:43,sizeLabel:'43 GB',minVRAM:51,quality:96,maxContext:131072,multiGpu:true}
  ], {profile:'general',url:'https://ollama.com/library/llama3.3',desc:'70B-Textmodell für anspruchsvolle allgemeine Sprachaufgaben.'});

  add('Phi-4', 'Microsoft', [
    {params:'14B',tag:'phi4:14b',fileGB:9.1,sizeLabel:'9.1 GB',minVRAM:11.6,quality:88,maxContext:16384}
  ], {profile:'reasoning',url:'https://ollama.com/library/phi4',desc:'Kompaktes 14B-Modell mit Fokus auf logisches Denken und Forschung.'});

  add('Phi-3', 'Microsoft', [
    {params:'Mini 3.8B',tag:'phi3:latest',fileGB:2.3,sizeLabel:'2.3 GB',minVRAM:4.0,quality:68,maxContext:4096},
    {params:'Medium 14B',tag:'phi3:medium',fileGB:7.9,sizeLabel:'7.9 GB',minVRAM:10.3,quality:83,maxContext:4096}
  ], {profile:'general',url:'https://ollama.com/library/phi3',desc:'Ältere, weiterhin verfügbare Microsoft-Modelle in kleinen und mittleren Größen.'});

  add('Mistral', 'Mistral AI', [
    {params:'7B',tag:'mistral:latest',fileGB:4.4,sizeLabel:'4.4 GB',minVRAM:6.6,quality:79,maxContext:32768}
  ], {profile:'general',url:'https://ollama.com/library/mistral',desc:'Klassisches 7B-Allround-Modell für lokale Textaufgaben.'});

  add('Mistral NeMo', 'Mistral AI / NVIDIA', [
    {params:'12B',tag:'mistral-nemo:12b',fileGB:7.1,sizeLabel:'7.1 GB',minVRAM:9.5,quality:86,maxContext:131072}
  ], {profile:'general',url:'https://ollama.com/library/mistral-nemo',desc:'12B-Modell mit großem Kontextfenster und guten Sprach- und Coding-Fähigkeiten.'});

  add('Moondream', 'Moondream', [
    {params:'1.8B Vision',tag:'moondream',fileGB:1.7,sizeLabel:'1.7 GB',minVRAM:3.2,quality:58,vision:true,maxContext:2048}
  ], {profile:'vision',vision:true,url:'https://ollama.com/library/moondream',desc:'Sehr kleines Vision-Modell für einfache Bildfragen.'});


  // Additional 2025/2026 families with published Ollama tag sizes.
  add('Gemma 3n', 'Google', [
    {params:'E2B',tag:'gemma3n:e2b',fileGB:7.8,sizeLabel:'7.8 GB',minVRAM:10.2,quality:78,vision:true,maxContext:32768},
    {params:'E4B',tag:'gemma3n:e4b',fileGB:9.8,sizeLabel:'9.8 GB',minVRAM:12.5,quality:85,vision:true,maxContext:32768}
  ], {profile:'multimodal',vision:true,url:'https://ollama.com/library/gemma3n',desc:'Effiziente multimodale Modelle für Laptops und Alltagsgeräte; nutzen selektive Parameteraktivierung.'});

  add('GLM-4.7-Flash', 'Z.ai', [
    {params:'30B-A3B · Q4_K_M',tag:'glm-4.7-flash:q4_K_M',fileGB:19,sizeLabel:'19 GB (Q4_K_M)',minVRAM:23,quality:94,maxContext:198000,note:'Benötigt eine neuere Ollama-Version; die Modellseite nennt derzeit Ollama 0.14.3 als Voraussetzung.'}
  ], {profile:'reasoning',url:'https://ollama.com/library/glm-4.7-flash',desc:'30B-A3B-MoE-Modell mit Fokus auf Reasoning, Agenten-Workflows und Coding.'});

  add('Qwen 3 Coder Next', 'Alibaba', [
    {params:'80B-A3B · Q4_K_M',tag:'qwen3-coder-next:q4_K_M',fileGB:52,sizeLabel:'52 GB (Q4_K_M)',minVRAM:61,quality:97,maxContext:262144,multiGpu:true}
  ], {profile:'coding',url:'https://ollama.com/library/qwen3-coder-next',desc:'Agentisches Coding-Modell mit 80B Gesamtparametern und 3B aktiven Parametern pro Token.'});

  add('Phi-4 Mini', 'Microsoft', [
    {params:'3.8B',tag:'phi4-mini:3.8b',fileGB:2.5,sizeLabel:'2.5 GB',minVRAM:4.2,quality:75,maxContext:131072}
  ], {profile:'reasoning',url:'https://ollama.com/library/phi4-mini',desc:'Kleines Reasoning-Modell mit 128K-Kontext und Werkzeugaufrufen.'});

  add('Ministral 3', 'Mistral AI', [
    {params:'3B',tag:'ministral-3:3b',fileGB:3.0,sizeLabel:'3.0 GB',minVRAM:4.8,quality:72,vision:true,maxContext:262144},
    {params:'8B',tag:'ministral-3:8b',fileGB:6.0,sizeLabel:'6.0 GB',minVRAM:8.5,quality:84,vision:true,maxContext:262144},
    {params:'14B',tag:'ministral-3:14b',fileGB:9.1,sizeLabel:'9.1 GB',minVRAM:11.8,quality:90,vision:true,maxContext:262144}
  ], {profile:'multimodal',vision:true,url:'https://ollama.com/library/ministral-3',desc:'Edge-orientierte Modellfamilie mit Bildverständnis, Mehrsprachigkeit und Agentenfunktionen.'});

  add('Nemotron 3 Nano', 'NVIDIA', [
    {params:'4B',tag:'nemotron-3-nano:4b',fileGB:2.8,sizeLabel:'2.8–2.9 GB',minVRAM:4.6,quality:72,maxContext:262144},
    {params:'30B',tag:'nemotron-3-nano:30b',fileGB:18,sizeLabel:'18–24 GB',minVRAM:23,quality:91,maxContext:262144}
  ], {profile:'reasoning',url:'https://ollama.com/library/nemotron-3-nano',desc:'Textmodelle für effiziente agentische Aufgaben; 30B-Variante mit MoE-Architektur.'});

  add('Mistral Small 3.1', 'Mistral AI', [
    {params:'24B',tag:'mistral-small3.1:24b',fileGB:15,sizeLabel:'15 GB',minVRAM:19,quality:91,vision:true,maxContext:131072}
  ], {profile:'multimodal',vision:true,url:'https://ollama.com/library/mistral-small3.1',desc:'24B-Modell mit Bildverständnis, großem Kontext und Werkzeugfunktionen.'});

  add('Devstral Small 2', 'Mistral AI', [
    {params:'24B',tag:'devstral-small-2:24b',fileGB:15,sizeLabel:'15 GB',minVRAM:19,quality:94,vision:true,maxContext:393216}
  ], {profile:'coding',vision:true,url:'https://ollama.com/library/devstral-small-2',desc:'Agentisches Software-Engineering-Modell zum Erkunden von Codebasen und Bearbeiten mehrerer Dateien.'});

  add('LFM 2.5 Thinking', 'Liquid AI', [
    {params:'1.2B',tag:'lfm2.5-thinking:1.2b',fileGB:0.731,sizeLabel:'731 MB',minVRAM:2.1,quality:61,maxContext:32768}
  ], {profile:'reasoning',url:'https://ollama.com/library/lfm2.5-thinking',desc:'Sehr kompaktes Hybrid-Reasoning-Modell für lokale Geräte.'});


  // Zusätzliche, explizit gelistete Quantisierungen: gleiche Modellfamilie,
  // aber unterschiedliche Download- und VRAM-Größen.
  add('Qwen 3.5', 'Alibaba', [
    {name:'Qwen 3.5 2B · Q4_K_M',params:'2B · Q4_K_M',tag:'qwen3.5:2b-q4_K_M',fileGB:1.9,sizeLabel:'1.9 GB · Q4_K_M',minVRAM:3.2,quality:61},
    {name:'Qwen 3.5 2B · Q8_0',params:'2B · Q8_0',tag:'qwen3.5:2b-q8_0',fileGB:2.7,sizeLabel:'2.7 GB · Q8_0',minVRAM:4.0,quality:64},
    {name:'Qwen 3.5 4B · Q4_K_M',params:'4B · Q4_K_M',tag:'qwen3.5:4b-q4_K_M',fileGB:3.3,sizeLabel:'3.3 GB · Q4_K_M',minVRAM:5.0,quality:72},
    {name:'Qwen 3.5 9B · Q4_K_M',params:'9B · Q4_K_M',tag:'qwen3.5:9b-q4_K_M',fileGB:6.6,sizeLabel:'6.6 GB · Q4_K_M',minVRAM:8.8,quality:84},
    {name:'Qwen 3.5 9B · Q8_0',params:'9B · Q8_0',tag:'qwen3.5:9b-q8_0',fileGB:10,sizeLabel:'10 GB · Q8_0',minVRAM:12.5,quality:87},
    {name:'Qwen 3.5 27B · Q4_K_M',params:'27B · Q4_K_M',tag:'qwen3.5:27b-q4_K_M',fileGB:17,sizeLabel:'17 GB · Q4_K_M',minVRAM:21,quality:92},
    {name:'Qwen 3.5 27B · Q8_0',params:'27B · Q8_0',tag:'qwen3.5:27b-q8_0',fileGB:30,sizeLabel:'30 GB · Q8_0',minVRAM:35,quality:95}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:q35,desc:'Explizit quantisierte Q4_K_M- und Q8_0-Tags; Q4 spart Speicher, Q8 erhält mehr Gewichtspräzision.'});

  add('Qwen 3.6', 'Alibaba', [
    {name:'Qwen 3.6 27B · Q4_K_M',params:'27B · Q4_K_M',tag:'qwen3.6:27b-q4_K_M',fileGB:17,sizeLabel:'17 GB · Q4_K_M',minVRAM:21,quality:94},
    {name:'Qwen 3.6 27B · Q8_0',params:'27B · Q8_0',tag:'qwen3.6:27b-q8_0',fileGB:30,sizeLabel:'30 GB · Q8_0',minVRAM:35,quality:96}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:q36,desc:'Explizite Q4_K_M- und Q8_0-Varianten des 27B-Modells.'});

  add('Gemma 4', 'Google', [
    {name:'Gemma 4 E2B · Q4_K_M',params:'E2B · Q4_K_M',tag:'gemma4:e2b-it-q4_K_M',fileGB:4.6,sizeLabel:'4.6 GB · Q4_K_M',minVRAM:6.5,quality:71},
    {name:'Gemma 4 E2B · Q8_0',params:'E2B · Q8_0',tag:'gemma4:e2b-it-q8_0',fileGB:6.0,sizeLabel:'6.0 GB · Q8_0',minVRAM:8.0,quality:74},
    {name:'Gemma 4 12B · Q4_K_M',params:'12B · Q4_K_M',tag:'gemma4:12b-it-q4_K_M',fileGB:8.0,sizeLabel:'8.0 GB · Q4_K_M',minVRAM:10.5,quality:88},
    {name:'Gemma 4 12B · Q8_0',params:'12B · Q8_0',tag:'gemma4:12b-it-q8_0',fileGB:13,sizeLabel:'13 GB · Q8_0',minVRAM:16.0,quality:91},
    {name:'Gemma 4 26B-A4B · Q4_K_M',params:'26B-A4B · Q4_K_M',tag:'gemma4:26b-a4b-it-q4_K_M',fileGB:18,sizeLabel:'18 GB · Q4_K_M',minVRAM:22,quality:94},
    {name:'Gemma 4 26B-A4B · Q8_0',params:'26B-A4B · Q8_0',tag:'gemma4:26b-a4b-it-q8_0',fileGB:28,sizeLabel:'28 GB · Q8_0',minVRAM:33,quality:96}
  ], {profile:'multimodal',vision:true,maxContext:262144,url:gemma4,desc:'Quantisierte Gemma-4-Tags. Die Speicherangabe steht für die konkrete Quantisierung, nicht nur für die Parameterzahl.'});

  add('Qwen 2.5 VL', 'Alibaba', [
    {params:'3B',tag:'qwen2.5vl:3b',fileGB:3.2,sizeLabel:'3.2 GB',minVRAM:5.0,quality:70},
    {params:'7B',tag:'qwen2.5vl:7b',fileGB:6.0,sizeLabel:'6.0 GB',minVRAM:8.2,quality:83},
    {params:'32B',tag:'qwen2.5vl:32b',fileGB:21,sizeLabel:'21 GB',minVRAM:26,quality:94,multiGpu:true},
    {params:'72B',tag:'qwen2.5vl:72b',fileGB:49,sizeLabel:'49 GB',minVRAM:58,quality:97,multiGpu:true}
  ], {profile:'multimodal',vision:true,maxContext:128000,url:'https://ollama.com/library/qwen2.5vl',desc:'Ältere Qwen-Vision-Language-Familie als zusätzliche Alternative zu Qwen 3 VL.'});

  add('LLaVA 1.6', 'LLaVA', [
    {params:'7B',tag:'llava:7b',fileGB:4.7,sizeLabel:'4.7 GB',minVRAM:7.0,quality:77,maxContext:32768},
    {params:'13B',tag:'llava:13b',fileGB:8.0,sizeLabel:'8.0 GB',minVRAM:10.5,quality:84,maxContext:4096},
    {params:'34B',tag:'llava:34b',fileGB:20,sizeLabel:'20 GB',minVRAM:25,quality:91,maxContext:4096,multiGpu:true}
  ], {profile:'multimodal',vision:true,maxContext:32768,url:'https://ollama.com/library/llava',desc:'Bild- und Textmodell für visuelle Fragen, Bildbeschreibung und visuelle Analyse.'});

  add('Code Llama', 'Meta', [
    {params:'7B',tag:'codellama:7b',fileGB:3.8,sizeLabel:'3.8 GB',minVRAM:6.0,quality:72,maxContext:16384},
    {params:'13B',tag:'codellama:13b',fileGB:7.4,sizeLabel:'7.4 GB',minVRAM:9.8,quality:82,maxContext:16384},
    {params:'34B',tag:'codellama:34b',fileGB:19,sizeLabel:'19 GB',minVRAM:24,quality:90,maxContext:16384,multiGpu:true},
    {params:'70B',tag:'codellama:70b',fileGB:39,sizeLabel:'39 GB',minVRAM:47,quality:94,maxContext:2048,multiGpu:true}
  ], {profile:'coding',url:'https://ollama.com/library/codellama',desc:'Code-Spezialist für das Generieren, Erklären und Überarbeiten von Programmcode.'});

  // Expose one immutable-style catalogue object for the main UI.
  window.AI_MODEL_DATABASE = models;
})();