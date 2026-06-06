// Compressão de imagens no client antes de salvar no Supabase.
// Resolve o problema de "statement timeout" quando o JSONB cresce demais
// (fotos de celular têm tipicamente 2-5MB cada).

const DEFAULTS = {
  maxWidth:  1280,
  maxHeight: 1280,
  quality:   0.82,
  maxBytes:  350 * 1024, // ~350KB final por foto
};

// Desenha a imagem em canvas, faz resize + JPEG + reduz qualidade se ainda passar do limite.
function desenharEReduzir(img, opts) {
  const { maxWidth, maxHeight, quality, maxBytes } = { ...DEFAULTS, ...opts };
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width  = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // Fundo branco — PNG transparente fica preto em JPEG senão.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  let iter = 0;
  while (dataUrl.length > maxBytes && q > 0.4 && iter++ < 6) {
    q -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  return dataUrl;
}

// Comprime um File (do input type=file) e devolve um data URL JPEG pequeno.
export function compressImageFile(file, opts = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Nenhum arquivo selecionado'));
    if (!/^image\//.test(file.type)) {
      return reject(new Error('O arquivo selecionado não é uma imagem'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao decodificar imagem'));
      img.onload  = () => resolve(desenharEReduzir(img, opts));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Comprime um data URL já existente (ex: foto antiga salva grande no banco).
export function compressImageDataURL(dataUrl, opts = {}) {
  return new Promise((resolve, reject) => {
    if (!dataUrl) return reject(new Error('Sem imagem'));
    const img = new Image();
    img.onerror = () => reject(new Error('Erro ao decodificar imagem'));
    img.onload  = () => resolve(desenharEReduzir(img, opts));
    img.src = dataUrl;
  });
}

// Quanto um data URL base64 ocupa em bytes (aproximado).
export function dataUrlBytes(dataUrl) {
  if (!dataUrl) return 0;
  return Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
}
