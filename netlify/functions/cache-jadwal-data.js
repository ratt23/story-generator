async function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        throw new Error('Terlalu banyak pengalihan (redirect).');
    }
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            // Handle redirect dengan method GET yang benar
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                const redirectUrl = new URL(res.headers.location, url).href;
                console.log(`Redirecting to: ${redirectUrl}`);
                return resolve(fetchData(redirectUrl, redirectCount + 1));
            }
            
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP status code ${res.statusCode}`));
            }
            
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Gagal mem-parsing respons JSON.'));
                }
            });
        });
        
        req.on('error', (err) => reject(err));
        
        // Tambahkan timeout
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout setelah 10 detik'));
        });
    });
}