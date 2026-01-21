
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

const analysisCache = new Map<string, Promise<BoundingBox | null>>();

export function analyzeImageContent(imageUrl: string): Promise<BoundingBox | null> {
    if (analysisCache.has(imageUrl)) {
        return analysisCache.get(imageUrl)!;
    }

    const promise = new Promise<BoundingBox | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(null);
                    return;
                }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                let minX = canvas.width;
                let minY = canvas.height;
                let maxX = 0;
                let maxY = 0;
                let found = false;

                // Scan pixels
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const alpha = data[(y * canvas.width + x) * 4 + 3];
                        if (alpha > 10) { // Threshold for "transparency"
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                            found = true;
                        }
                    }
                }

                if (!found) {
                    resolve(null);
                } else {
                    resolve({
                        x: minX / canvas.width,
                        y: minY / canvas.height,
                        width: (maxX - minX + 1) / canvas.width,
                        height: (maxY - minY + 1) / canvas.height
                    });
                }
            } catch (e) {
                console.error("Failed to analyze image", e);
                resolve(null);
            }
        };

        img.onerror = () => {
            resolve(null);
        };

        img.src = imageUrl;
    });

    analysisCache.set(imageUrl, promise);
    return promise;
}
