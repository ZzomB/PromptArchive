import { NextResponse } from 'next/server';
import { getPrompts } from '@/lib/notion';

export async function GET() {
  try {
    const prompts = await getPrompts();
    
    const urlElements = prompts.map(prompt => `
  <url>
    <loc>https://www.wedodare.com/function/PromptArchive/prompt/${prompt.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.wedodare.com/function/PromptArchive</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urlElements}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return minimal fallback sitemap on error
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.wedodare.com/function/PromptArchive</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}
