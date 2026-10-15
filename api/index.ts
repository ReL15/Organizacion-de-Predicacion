import type { Request, Response } from 'express';

let appPromise: Promise<typeof import('../server.ts')> | undefined;

export default async function handler(req: Request, res: Response) {
  try {
    appPromise ??= import('../server.ts').catch((error) => {
      appPromise = undefined;
      throw error;
    });
    const { default: app } = await appPromise;
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const originalPath = requestUrl.searchParams.get('__vercel_path');

    if (originalPath?.startsWith('/api/')) {
      requestUrl.searchParams.delete('__vercel_path');
      req.url = `${originalPath}${requestUrl.search}`;
    }

    return app(req, res);
  } catch (error) {
    console.error('No se pudo inicializar la API de Vercel:', error);
    return res.status(503).json({
      error: 'La API no pudo iniciar. Verifica DATABASE_URL o POSTGRES_URL en las variables de entorno de Vercel y revisa los logs de la función.',
    });
  }
}
