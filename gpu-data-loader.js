/* Load the bundled GPU database without a server request (also works with file://). */
(() => {
  window.GPU_DATA_READY = (async () => {
    const encoded = window.GPU_DATABASE_GZIP_BASE64;
    if (!encoded) throw new Error('GPU database bundle is missing.');
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser does not support gzip decompression. Please use a recent browser.');
    }

    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    const decompressor = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(decompressor);
    const source = await new Response(stream).text();
    const script = document.createElement('script');
    script.textContent = source;
    document.head.appendChild(script);
    return Array.isArray(window.GPU_DATABASE) ? window.GPU_DATABASE : [];
  })().catch(error => {
    console.error('VRAMMatch GPU database failed to load:', error);
    window.GPU_DATABASE = [];
    return [];
  });
})();