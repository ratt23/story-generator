<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generator Brosur Jadwal Dokter</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Poppins', sans-serif; }
        .preview-container {
            transform-origin: top left;
            transform: scale(0.3);
            width: 333%;
            height: 333%;
        }
        .preview-wrapper {
            width: 350px;
            height: 250px;
            overflow: hidden;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
        }
    </style>
</head>
<body class="bg-slate-100 min-h-screen flex flex-col">
    <nav class="bg-white shadow-md w-full flex-shrink-0">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex h-16 items-center justify-between">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <span class="font-bold text-xl text-slate-800">Kumpulan Tools</span>
                    </div>
                </div>
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-4">
                        <a href="index.html" class="text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md px-3 py-2 text-sm font-medium">Design Story Cuti Dokter</a>
                        <a href="brochure-generator.html" class="bg-blue-600 text-white rounded-md px-3 py-2 text-sm font-medium" aria-current="page">Brochure Jadwal Dokter</a>
                        <a href="#" class="text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md px-3 py-2 text-sm font-medium">Public Holiday Operational</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <main class="flex-grow">
        <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Panel Kontrol -->
                <div class="bg-white p-8 rounded-xl shadow-lg">
                    <h1 class="text-3xl font-bold text-slate-800 mb-4">Generator Brosur Jadwal Dokter</h1>
                    <p class="text-slate-600 mb-6">
                        Tekan tombol di bawah ini untuk menghasilkan pratinjau brosur jadwal dokter terbaru dalam format HTML.
                        Data akan diambil langsung dari Google Sheets.
                    </p>
                    <p class="text-sm text-slate-500 mb-6">
                        Setelah pratinjau muncul di tab baru, gunakan fitur "Print" (Ctrl+P atau Cmd+P) di browser Anda dan pilih "Save as PDF" untuk membuat file PDF final.
                    </p>

                    <button id="generate-button" class="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 mb-4">
                        <span id="button-text">Generate Pratinjau Brosur</span>
                    </button>
                    
                    <div id="status-container" class="text-left space-y-2">
                        <!-- Status messages will appear here -->
                    </div>

                    <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 class="font-semibold text-yellow-800 mb-2">Petunjuk Cetak:</h3>
                        <ul class="text-sm text-yellow-700 list-disc list-inside space-y-1">
                            <li>Setelah preview terbuka, tekan <kbd class="px-2 py-1 bg-gray-200 rounded">Ctrl+P</kbd> (Windows) atau <kbd class="px-2 py-1 bg-gray-200 rounded">Cmd+P</kbd> (Mac)</li>
                            <li>Pilih printer "Save as PDF"</li>
                            <li>Settings: Landscape, Margin -> None, Scale -> 100%</li>
                            <li>Brosur dirancang untuk dicetak 2 halaman (trifold)</li>
                        </ul>
                    </div>
                </div>

                <!-- Panel Preview -->
                <div class="bg-white p-8 rounded-xl shadow-lg">
                    <h2 class="text-2xl font-bold text-slate-800 mb-4">Pratinjau Brosur</h2>
                    <p class="text-slate-600 mb-4">
                        Preview akan muncul di sini setelah brosur di-generate. Skala preview: 30% dari ukuran asli.
                    </p>
                    
                    <div class="preview-wrapper mb-4">
                        <div id="preview-content" class="preview-container">
                            <!-- Preview akan dimuat di sini -->
                            <div class="flex items-center justify-center h-full text-slate-500">
                                <div class="text-center">
                                    <div class="text-4xl mb-2">📄</div>
                                    <p>Preview akan muncul di sini</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center text-sm text-slate-500">
                        <p>Halaman 1 (Dalam) & Halaman 2 (Luar) - Format Trifold</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generate-button');
    const buttonText = document.getElementById('button-text');
    const statusContainer = document.getElementById('status-container');
    const previewContent = document.getElementById('preview-content');

    const addStatus = (message, isError = false) => {
        const p = document.createElement('p');
        p.textContent = message;
        p.className = isError ? 'text-red-600' : 'text-green-600';
        statusContainer.appendChild(p);
        
        // Auto-remove status messages after 10 seconds
        setTimeout(() => {
            if (p.parentElement) {
                p.remove();
            }
        }, 10000);
    };

    const clearStatus = () => {
        statusContainer.innerHTML = '';
    };

    const updatePreview = (htmlContent) => {
        previewContent.innerHTML = htmlContent;
        
        // Adjust iframe content for preview
        const iframes = previewContent.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            iframe.style.width = '297mm';
            iframe.style.height = '210mm';
        });
    };

    const generateBrochure = async () => {
        generateButton.disabled = true;
        buttonText.textContent = 'Memproses...';
        clearStatus();
        addStatus('Menghubungi server...');

        try {
            const response = await fetch('/.netlify/functions/generate-brochure');
            addStatus('Menerima respons dari server...');
            
            if (!response.ok) {
                throw new Error(`Server merespons dengan status: ${response.status}`);
            }

            const htmlContent = await response.text();
            addStatus('Berhasil membuat HTML, memperbarui preview...');

            // Update preview
            updatePreview(htmlContent);
            addStatus('Preview berhasil diperbarui!');

            // Also open in new tab for printing
            addStatus('Membuka tab baru untuk printing...');
            const newTab = window.open();
            newTab.document.open();
            newTab.document.write(htmlContent);
            newTab.document.close();
            
            addStatus('Selesai! Silakan simpan sebagai PDF dari tab baru.');

        } catch (error) {
            console.error("Gagal men-generate brosur:", error);
            addStatus(`Terjadi kesalahan: ${error.message}`, true);
            
            // Show error in preview
            previewContent.innerHTML = `
                <div class="flex items-center justify-center h-full bg-red-50">
                    <div class="text-center text-red-600">
                        <div class="text-4xl mb-2">❌</div>
                        <p class="font-semibold">Error</p>
                        <p class="text-sm">${error.message}</p>
                    </div>
                </div>
            `;
        } finally {
            generateButton.disabled = false;
            buttonText.textContent = 'Generate Pratinjau Brosur';
        }
    };

    generateButton.addEventListener('click', generateBrochure);
});

/**
 * Optimasi data untuk memastikan tidak lebih dari 2 halaman
 */
function optimizeDataForTwoPages(data) {
    const maxDoctorsPerPage = 25; // Estimasi maksimal dokter per halaman
    
    // Jika data terlalu banyak, potong atau optimasi
    if (data.length > maxDoctorsPerPage * 2) {
        console.warn(`Data terlalu banyak (${data.length} dokter), melakukan optimasi...`);
        
        // Prioritaskan spesialisasi dengan jadwal paling lengkap
        return data
            .map(spec => ({
                ...spec,
                priority: spec.doctors.reduce((acc, doc) => {
                    const scheduleCount = Object.values(doc.schedule || {}).filter(time => 
                        time && time.trim() !== '' && time.trim() !== '-'
                    ).length;
                    return acc + scheduleCount;
                }, 0)
            }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, maxDoctorsPerPage * 2)
            .map(({ priority, ...spec }) => spec); // Hapus property priority
    }
    
    return data;
}

// Dalam handler utama, tambahkan optimasi data:
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        let allData = await getJadwalDataFromCache();
        
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }
        
        console.log(`Data berhasil diambil: ${allData.length} spesialisasi`);
        
        // Optimasi data untuk 2 halaman
        allData = optimizeDataForTwoPages(allData);
        console.log(`Data setelah optimasi: ${allData.length} spesialisasi`);
        
        // Pisahkan data untuk halaman dalam dan luar
        const outsideSpecializations = ["Urologi", "Kulit & Kelamin"];
        const outsidePageData = allData.filter(spec => outsideSpecializations.includes(spec.title));
        const insidePageData = allData.filter(spec => !outsideSpecializations.includes(spec.title));
        
        // ... kode selanjutnya tetap sama
    } catch (error) {
        // ... error handling
    }
};
</script>
</body>
</html>