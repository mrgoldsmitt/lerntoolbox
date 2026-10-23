// QR Code Generator Tool Logic

let qrCodeObj = null;

async function generateQRCode() {
    const input = document.getElementById('qrcode-input');
    let text = input.value.trim();
    const container = document.getElementById('qrcode-container');
    const displayContainer = document.getElementById('qrcode-display-container');

    // New Inputs
    const colorDark = document.getElementById('qrcode-color').value || "#000000";
    const colorLight = document.getElementById('qrcode-bg-color').value || "#ffffff";
    const imageInput = document.getElementById('qrcode-image-input');
    const imagePosition = document.getElementById('qrcode-image-position').value;

    if (!text) {
        alert('Bitte geben Sie einen Text oder eine URL ein.');
        return;
    }

    // Auto-complete URL
    if (text && !/^https?:\/\//i.test(text) && /\./.test(text) && !/\s/.test(text) && !/@/.test(text)) {
        text = 'https://' + text;
    }

    // Clear previous
    container.innerHTML = '';
    displayContainer.style.display = 'none'; // Hide until ready

    try {
        // 1. Prepare QR Code Options
        // If we use a background image, we want the QR code background to be transparent
        let qrBgColor = colorLight;
        if (imagePosition === 'background' && imageInput.files && imageInput.files[0]) {
            qrBgColor = "rgba(0,0,0,0)";
        }

        // 2. Generate Basic QR Code in a temporary element
        const tempContainer = document.createElement('div');
        const qr = new QRCode(tempContainer, {
            text: text,
            width: 256,
            height: 256,
            colorDark: colorDark,
            colorLight: qrBgColor,
            correctLevel: QRCode.CorrectLevel.H // High error correction for center logo
        });

        // Wait a tick for the library to render (it's synchronous usually, but safe to wait)
        await new Promise(resolve => setTimeout(resolve, 10));

        const qrCanvas = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
        if (!qrCanvas) throw new Error("QR Code Generation failed internally.");

        // 3. Prepare Final Canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = 256;
        finalCanvas.height = 256;
        const ctx = finalCanvas.getContext('2d');

        // 4. Handle Background Image
        if (imagePosition === 'background' && imageInput.files && imageInput.files[0]) {
            const bgImg = await loadImage(imageInput.files[0]);
            // Draw background image (cover)
            drawImageProp(ctx, bgImg, 0, 0, 256, 256);
            // Draw QR Code on top
            ctx.drawImage(qrCanvas, 0, 0);
        } else {
            // Normal Background (Color) - already handled by QRCode lib usually, 
            // but if we used transparent for some reason, fill it here.
            // Actually, we passed qrBgColor to lib, so qrCanvas already has it.
            // Just draw the QR code.
            ctx.drawImage(qrCanvas, 0, 0);
        }

        // 5. Handle Center Image
        if (imagePosition === 'center' && imageInput.files && imageInput.files[0]) {
            const centerImg = await loadImage(imageInput.files[0]);
            // Calculate size (e.g., 20% of QR code size => ~51px)
            const size = 56; // slightly larger than 20% (256*0.2=51.2)
            const x = (256 - size) / 2;
            const y = (256 - size) / 2;
            
            // Draw a white styling backdrop for the logo? 
            // Optional: Draw a small box behind logo if it's transparent, for readability.
            // But user might want transparent. Let's stick to raw image.
            
            ctx.drawImage(centerImg, x, y, size, size);
        }

        // 6. Show Result
        container.appendChild(finalCanvas);
        displayContainer.style.display = 'flex';

    } catch (e) {
        console.error("QR Code Generation Error:", e);
        alert("Fehler beim Generieren des QR-Codes: " + e.message);
    }
}

// Helper to load image from file input
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Helper to draw image cover/contain style
function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
    if (arguments.length === 2) {
        x = y = 0;
        w = ctx.canvas.width;
        h = ctx.canvas.height;
    }

    // default offset is center
    offsetX = typeof offsetX === "number" ? offsetX : 0.5;
    offsetY = typeof offsetY === "number" ? offsetY : 0.5;

    // keep bounds [0.0, 1.0]
    if (offsetX < 0) offsetX = 0;
    if (offsetY < 0) offsetY = 0;
    if (offsetX > 1) offsetX = 1;
    if (offsetY > 1) offsetY = 1;

    var iw = img.width,
        ih = img.height,
        r = Math.min(w / iw, h / ih),
        nw = iw * r,   // new prop. width
        nh = ih * r,   // new prop. height
        cx, cy, cw, ch, ar = 1;

    // decide which gap to fill    
    if (nw < w) ar = w / nw;                             
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
    nw *= ar;
    nh *= ar;

    // calc source rectangle
    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    // make sure source rectangle is valid
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    // fill image in dest. rectangle
    ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
}

function downloadQRCode() {
    const container = document.getElementById('qrcode-container');

    // The library usually renders a canvas or an img tag.
    // We need to find it.
    let canvas = container.querySelector('canvas');
    let img = container.querySelector('img');

    if (canvas) {
        // Best method: canvas.toBlob
        canvas.toBlob(function (blob) {
            triggerDownload(blob);
        }, 'image/png');
    } else if (img && img.src && img.src.startsWith('data:')) {
        // Convert data URL to Blob (for older browsers or if lib renders img)
        const blob = dataURLToBlob(img.src);
        triggerDownload(blob);
    } else {
        alert('QR-Code konnte nicht gefunden werden. Bitte generieren Sie ihn erneut.');
    }
}

function dataURLToBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
}

function triggerDownload(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function updateFileName(input) {
    const span = document.getElementById('qrcode-file-name');
    if (span) {
        if (input.files && input.files.length > 0) {
            span.textContent = input.files[0].name;
        } else {
            span.textContent = 'Keine Datei ausgewählt';
        }
    }
}
