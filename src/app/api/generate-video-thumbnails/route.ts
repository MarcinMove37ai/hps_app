// src/app/api/generate-video-thumbnails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Promisify fs functions
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// Konfiguracja połączenia z bazą danych
const getDbClient = async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    ssl: {
      rejectUnauthorized: false
    }
  });
  await client.connect();
  return client;
};

// Inicjalizacja klienta S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Funkcja do pobierania wideo z S3
async function downloadVideoFromS3(s3Key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'ebooks-app',
      Key: s3Key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Nie można odczytać pliku wideo z S3');
    }

    // Konwersja readable stream na buffer
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    console.error('Błąd podczas pobierania wideo z S3:', error);
    throw error;
  }
}

// Funkcja do generowania miniatur przy użyciu FFmpeg
async function generateThumbnails(videoPath: string, count: number): Promise<string[]> {
  try {
    // Utworzenie tymczasowego katalogu na miniatury
    const thumbnailDir = path.join('/tmp', uuidv4());
    await mkdirAsync(thumbnailDir, { recursive: true });

    // Pobranie długości wideo przy użyciu ffprobe
    const getDurationPromise = new Promise<number>((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe process exited with code ${code}`));
          return;
        }

        const duration = parseFloat(output.trim());
        resolve(duration);
      });

      ffprobe.on('error', (err) => {
        reject(err);
      });
    });

    // Pobierz długość wideo
    const duration = await getDurationPromise;

    // Oblicz odstępy czasowe dla miniatur
    const thumbnailPaths: string[] = [];
    const interval = duration / (count + 1);

    // Generowanie miniatur w równych odstępach czasu
    const promises = [];

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;
      const thumbnailPath = path.join(thumbnailDir, `thumbnail_${i}.png`);
      thumbnailPaths.push(thumbnailPath);

      const promise = new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-ss', timestamp.toString(),
          '-i', videoPath,
          '-vframes', '1',
          '-vf', 'scale=320:-1',
          '-q:v', '2',
          thumbnailPath
        ]);

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`ffmpeg process exited with code ${code}`));
            return;
          }
          resolve();
        });

        ffmpeg.on('error', (err) => {
          reject(err);
        });
      });

      promises.push(promise);
    }

    // Czekaj na zakończenie generowania wszystkich miniatur
    await Promise.all(promises);

    return thumbnailPaths;
  } catch (error) {
    console.error('Błąd generowania miniatur:', error);
    throw error;
  }
}

// Funkcja do przesyłania miniatury do S3
async function uploadThumbnailToS3(thumbnailPath: string, originalS3Key: string, index: number): Promise<string> {
  try {
    // Odczytaj plik miniatury
    const fileContent = await fs.promises.readFile(thumbnailPath);

    // Generowanie unikalnej nazwy pliku
    const fileBaseName = originalS3Key.split('/').pop()?.split('.')[0] || uuidv4();
    const thumbnailFileName = `${fileBaseName}_thumbnail_${index}_${Date.now()}.png`;
    const s3Key = `videos/mockup/${thumbnailFileName}`;

    // Zapisz miniaturę w S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'ebooks-app',
        Key: s3Key,
        Body: fileContent,
        ContentType: 'image/png',
        ACL: 'public-read',
      })
    );

    // Zwróć publiczny URL do miniatury
    const bucketName = process.env.S3_BUCKET_NAME || 'ebooks-app';
    const region = process.env.AWS_REGION || 'eu-central-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
  } catch (error) {
    console.error('Błąd przesyłania miniatury do S3:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  let videoPath = '';
  let thumbnailPaths: string[] = [];

  try {
    const data = await request.json();
    const { pageId, s3Key, count = 5 } = data;

    if (!pageId || !s3Key) {
      return NextResponse.json({ error: 'Brak wymaganych parametrów' }, { status: 400 });
    }

    // Sprawdź, czy strona istnieje w bazie danych
    let client;
    try {
      client = await getDbClient();
      const result = await client.query('SELECT id, video_embed_url FROM pages WHERE id = $1', [pageId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Nie znaleziono strony o podanym identyfikatorze' }, { status: 404 });
      }

      // Użyj zapisanego URL, jeśli istnieje
      const videoEmbedUrl = result.rows[0].video_embed_url;
      if (videoEmbedUrl && videoEmbedUrl.startsWith('http')) {
        console.log(`Znaleziono zapisany URL wideo: ${videoEmbedUrl}`);
      }
    } finally {
      if (client) await client.end();
    }

    // Pobierz wideo z S3
    const videoBuffer = await downloadVideoFromS3(s3Key);

    // Zapisz wideo tymczasowo na dysku
    videoPath = path.join('/tmp', `${uuidv4()}.mp4`);
    await writeFileAsync(videoPath, videoBuffer);

    // Wygeneruj miniatury
    thumbnailPaths = await generateThumbnails(videoPath, count);

    // Prześlij miniatury do S3 i pobierz ich URL
    const thumbnailUrls = [];
    for (let i = 0; i < thumbnailPaths.length; i++) {
      const url = await uploadThumbnailToS3(thumbnailPaths[i], s3Key, i);
      thumbnailUrls.push(url);
    }

    // Zwróć URL miniatur
    return NextResponse.json({
      success: true,
      thumbnails: thumbnailUrls
    });

  } catch (error) {
    console.error('Błąd podczas generowania miniatur wideo:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas generowania miniatur wideo', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    // Usuń tymczasowe pliki
    try {
      if (videoPath && fs.existsSync(videoPath)) {
        await unlinkAsync(videoPath);
      }

      for (const thumbnailPath of thumbnailPaths) {
        if (fs.existsSync(thumbnailPath)) {
          await unlinkAsync(thumbnailPath);
        }
      }
    } catch (cleanupError) {
      console.error('Błąd podczas czyszczenia tymczasowych plików:', cleanupError);
    }
  }
}