const URL_WEBAPP_GOOGLE = 'https://script.google.com/macros/s/AKfycbyu2nh6fpoibQfi-zAfMg12o_LRdQNGSCD_tASwFYG8qZZlCPozC4n3gRR9x9EstCxt/exec';

const especialidadesMedicas = [
    { nombre: 'Medicina General', descuento: 250 },
    { nombre: 'Traumatología', descuento: 300 },
    { nombre: 'Cardiología', descuento: 350 },
    { nombre: 'Dermatología', descuento: 200 },
    { nombre: 'Pediatría', descuento: 220 },
    { nombre: 'Odontología', descuento: 180 },
    { nombre: 'Neurología', descuento: 320 },
    { nombre: 'Oftalmología', descuento: 210 },
    { nombre: 'Ginecología', descuento: 240 },
    { nombre: 'Psiquiatría', descuento: 230 }
];

const descuentoPorEspecialidad = especialidadesMedicas.reduce((map, item) => {
    map[item.nombre] = item.descuento;
    return map;
}, {});

const especialidadSelect = document.getElementById('especialidad');
const montoInput = document.getElementById('monto');
const montoReintegrarInput = document.getElementById('montoReintegrar');

function actualizarMontoReintegrar() {
    const monto = parseFloat(montoInput.value);
    const especialidad = especialidadSelect.value;
    const descuento = descuentoPorEspecialidad[especialidad] || 0;

    if (!especialidad || isNaN(monto)) {
        montoReintegrarInput.value = '';
        return;
    }

    const reintegro = monto - descuento;
    montoReintegrarInput.value = reintegro >= 0 ? reintegro.toFixed(2) : '0.00';
}

especialidadSelect.addEventListener('change', actualizarMontoReintegrar);
montoInput.addEventListener('input', actualizarMontoReintegrar);

document.getElementById('archivo').addEventListener('change', function (e) {
    const files = Array.from(e.target.files || []);
    const fileNameDisplay = document.getElementById('fileName');

    if (files.length === 0) {
        fileNameDisplay.style.display = 'none';
        fileNameDisplay.textContent = '';
        return;
    }

    const validFiles = [];
    const errors = [];

    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            errors.push(`❌ ${file.name} excede los 5MB`);
        } else {
            validFiles.push(file);
        }
    });

    // Mostrar lista de archivos válidos y errores
    let html = '';
    if (validFiles.length) {
        html += '<div>✓ Archivos adjuntos:</div><ul style="margin:0.25rem 0 0 1rem; padding:0;">';
        validFiles.forEach(f => {
            html += `<li style="list-style:none; margin-bottom:4px;">• ${f.name}</li>`;
        });
        html += '</ul>';
    }
    if (errors.length) {
        html += '<div style="margin-top:6px; color: var(--text-muted);">' + errors.join('<br>') + '</div>';
    }

    if (validFiles.length) {
        fileNameDisplay.innerHTML = html;
        fileNameDisplay.style.color = 'var(--primary)';
        fileNameDisplay.style.backgroundColor = 'rgba(75, 106, 61, 0.08)';
        fileNameDisplay.style.borderColor = 'rgba(75, 106, 61, 0.12)';
        fileNameDisplay.style.display = 'block';
    } else {
        fileNameDisplay.innerHTML = html || '❌ Ningún archivo válido seleccionado';
        fileNameDisplay.style.color = 'var(--error)';
        fileNameDisplay.style.backgroundColor = 'rgba(208, 71, 71, 0.08)';
        fileNameDisplay.style.borderColor = 'rgba(208, 71, 71, 0.12)';
        fileNameDisplay.style.display = 'block';
        // If no valid files, clear input so user can reselect
        e.target.value = '';
    }
});

document.getElementById('reintegroForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = document.getElementById('loader');

    // UI Loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';

    const fileInput = document.getElementById('archivo');
    const files = Array.from(fileInput.files || []);

    try {
        if (files.length === 0) throw new Error('No se seleccionaron archivos válidos');

        // Re-validate sizes and prepare base64 array
        const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
        if (validFiles.length === 0) throw new Error('Ningún archivo válido (tamaño máximo 5MB)');

        const base64Array = await Promise.all(validFiles.map(f => getBase64(f).then(s => s.split(',')[1])));

        const formData = {
            afiliado: document.getElementById('afiliado').value,
            nombre: document.getElementById('nombre').value,
            especialidad: document.getElementById('especialidad').value,
            factura: document.getElementById('factura').value,
            monto: document.getElementById('monto').value,
            montoReintegrar: document.getElementById('montoReintegrar').value,
            estado: document.getElementById('estado').value,
            fileNames: validFiles.map(f => f.name),
            mimeTypes: validFiles.map(f => f.type),
            fileBase64: base64Array
        };

        // We use mode: 'no-cors' so the browser doesn't block the request due to CORS
        // Google Apps Script doPost will correctly process the text/plain body 
        await fetch(URL_WEBAPP_GOOGLE, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(formData)
        });

        // Since no-cors hides the response, we assume success if no JS error
        document.getElementById('reintegroForm').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
        document.getElementById('errorMessage').style.display = 'none';

    } catch (error) {
        console.error('Error al enviar:', error);
        document.getElementById('reintegroForm').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        loader.style.display = 'none';
    }
});

document.getElementById('resetBtn').addEventListener('click', function () {
    document.getElementById('reintegroForm').reset();
    document.getElementById('reintegroForm').style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('fileName').style.display = 'none';
});

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
