const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const { doctors, theme, logo } = event.queryStringParameters;
    
    if (!doctors) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Parameter doctors diperlukan' }),
      };
    }

    // URL Google Sheets untuk data cuti
    const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
    
    // URL Google Sheets untuk data jadwal (untuk foto dan spesialis)
    const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

    // Fetch data dari Google Sheets
    const [cutiData, jadwalData] = await Promise.all([
      fetch(`${GOOGLE_SCRIPT_CUTI_URL}?t=${Date.now()}`).then(res => res.json()),
      fetch(`${GOOGLE_SCRIPT_JADWAL_URL}?t=${Date.now()}`).then(res => res.json())
    ]);

    // Process doctor data
    const selectedDoctorIds = doctors.split(',');
    
    function createDoctorSlug(doctorName) {
      if (!doctorName) return '';
      return doctorName
          .toLowerCase()
          .replace(/\b(dr|drg)\b\.?\s*/g, '')
          .replace(/\bsp\.[a-z]+\b/gi, '')
          .replace(/\bm\.[a-z]+\b/gi, '')
          .replace(/\bsubsp\.[a-z]+\b/gi, '')
          .replace(/[.,()]/g, '')
          .trim()
          .replace(/\s+/g, '-');
    }

    // Build map of doctor details from jadwal data
    const allDoctors = new Map();
    for (const key in jadwalData) {
      if (jadwalData[key] && Array.isArray(jadwalData[key].doctors)) {
        jadwalData[key].doctors.forEach(doc => {
          if (!doc || !doc.name) return;
          const doctorKey = createDoctorSlug(doc.name);
          const imageUrl = doctorKey ? `asset/webp/${doctorKey}.webp` : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';
          
          if (!allDoctors.has(doctorKey)) {
            allDoctors.set(doctorKey, {
              nama: doc.name,
              spesialis: jadwalData[key].title,
              fotourl: imageUrl
            });
          }
        });
      }
    }

    // Filter and prepare selected doctors
    const selectedDoctors = cutiData
      .map((cuti, index) => {
        const doctorKey = createDoctorSlug(cuti.NamaDokter);
        const details = allDoctors.get(doctorKey);
        
        return {
          id: `doc-${index}`,
          nama: details ? details.nama : cuti.NamaDokter,
          cutiMulai: cuti.TanggalMulaiCuti,
          cutiSelesai: cuti.TanggalSelesaiCuti,
          spesialis: details ? details.spesialis : 'N/A',
          fotourl: details ? details.fotourl : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo'
        };
      })
      .filter(doctor => selectedDoctorIds.includes(doctor.id));

    // Format date function
    function formatFullDate(dateStr) {
      if (!dateStr) return '';
      const [day, month, year] = dateStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
    }

    // Generate doctor list HTML
    let doctorListHTML = '';
    selectedDoctors.forEach(doctor => {
      const leaveDatesText = (doctor.cutiMulai === doctor.cutiSelesai)
        ? formatFullDate(doctor.cutiMulai)
        : `${formatFullDate(doctor.cutiMulai)} - ${formatFullDate(doctor.cutiSelesai)}`;
      
      const isLightTheme = ['solid-white', 'solid-white-dots'].includes(theme);
      const cardClass = isLightTheme 
        ? 'bg-slate-100 text-slate-800 border border-slate-200'
        : 'bg-white/20 text-white';

      doctorListHTML += `
        <div class="flex items-center w-full rounded-2xl p-4 shadow-md ${cardClass}">
          <img src="${doctor.fotourl}" class="w-24 h-24 rounded-full object-cover border-4 border-white flex-shrink-0" alt="Foto ${doctor.nama}" onerror="this.src='https://placehold.co/200x200/e2e8f0/475569?text=No+Photo'">
          <div class="ml-4 text-left">
            <h3 class="text-2xl font-bold">${doctor.nama}</h3>
            <p class="text-lg opacity-90">${doctor.spesialis}</p>
            <p class="text-lg mt-1"><strong class="font-semibold">${leaveDatesText}</strong></p>
          </div>
        </div>`;
    });

    // Generate final HTML
    const themeClass = theme || 'theme-gradient-blue';
    const logoSrc = logo || 'asset/logo/logo.png';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Story Cuti Dokter</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Poppins', sans-serif; margin: 0; }
        #story-preview {
            font-family: 'Poppins', sans-serif;
            width: 1080px; height: 1920px;
            position: relative; overflow: hidden;
            display: flex; flex-direction: column;
            padding: 64px;
            transform-origin: center;
            transition: transform 0.2s ease-in-out, background 0.3s, color 0.3s;
        }
        .montserrat { font-family: 'Montserrat', sans-serif; }
        #story-preview img { object-fit: cover; }
        #story-preview .flex .items-center img.rounded-full { object-position: center 10%; }

        #story-preview.theme-gradient-blue { 
            background: linear-gradient(160deg, #192670, #4c9b32); color: white;
        }
        #story-preview.theme-gradient-purple { 
            background: linear-gradient(160deg, #5a189a, #c1121f, #f77f00); color: white;
        }
        #story-preview.theme-gradient-orange { 
            background: linear-gradient(160deg, #f7b267, #f79d65, #f4845f); color: white;
        }
        
        #story-preview.theme-solid-white { 
            background-color: #ffffff;
            background-image:
                radial-gradient(circle, #E5E7EB 1px, transparent 1.5px),
                radial-gradient(circle at 0% 0%, rgba(229, 231, 235, 0.5) 0%, transparent 40%),
                radial-gradient(circle at 100% 100%, rgba(229, 231, 235, 0.5) 0%, transparent 40%);
            background-size:
                20px 20px,
                120% 120%,
                120% 120%;
            color: #1e293b;
        }
        
        #story-preview.theme-solid-white-dots {
            background-color: #ffffff;
            background-image: radial-gradient(circle, #D1D5DB 1px, transparent 1.5px);
            background-size: 35px 35px;
            color: #1e293b;
        }
    </style>
</head>
<body>
    <div id="story-preview" class="${themeClass}">
        <div class="flex-shrink-0 flex justify-center items-center relative z-10">
            <img id="story-logo" src="${logoSrc}" class="h-28" alt="Logo">
        </div>

        <div class="flex-grow flex flex-col justify-start items-center text-center pt-20 relative z-10">
            <div class="mb-12">
                <p class="text-5xl tracking-widest montserrat">PEMBERITAHUAN</p>
                <h2 class="text-9xl font-extrabold mt-2 montserrat">DOKTER CUTI</h2>
            </div>
            <div class="w-full flex flex-col items-center justify-center flex-grow space-y-6 px-12 relative z-10">
                ${doctorListHTML}
            </div>
        </div>

        <div class="flex-shrink-0 text-center relative z-10">
            <p class="text-3xl font-semibold">Siloam Hospitals Ambon</p>
        </div>
    </div>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
      body: html,
    };

  } catch (error) {
    console.error('Error in generate-story function:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error: ' + error.message }),
    };
  }
};