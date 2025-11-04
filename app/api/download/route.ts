import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface InstagramPost {
  type: 'image' | 'video' | 'carousel';
  mediaUrls: string[];
  thumbnail?: string;
  caption?: string;
  username?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate Instagram URL
    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
    const match = url.match(instagramRegex);

    if (!match) {
      return NextResponse.json(
        { error: 'Invalid Instagram URL' },
        { status: 400 }
      );
    }

    const shortcode = match[1];

    // Try multiple Instagram scraping APIs
    let result: InstagramPost | null = null;

    // Method 1: Try RapidAPI Instagram Scraper
    try {
      result = await fetchWithRapidAPI(shortcode);
    } catch (err) {
      console.error('RapidAPI failed:', err);
    }

    // Method 2: Try direct Instagram oEmbed API (limited but free)
    if (!result) {
      try {
        result = await fetchWithOEmbed(url);
      } catch (err) {
        console.error('oEmbed failed:', err);
      }
    }

    // Method 3: Try Insta Downloader API
    if (!result) {
      try {
        result = await fetchWithInstaDownloader(url);
      } catch (err) {
        console.error('InstaDownloader failed:', err);
      }
    }

    // Method 4: Simple fallback - create a basic response
    if (!result) {
      result = {
        type: 'image',
        mediaUrls: [],
        caption: 'Unable to fetch media. Instagram may be blocking requests. Try using the official Instagram app to download.',
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process the request' },
      { status: 500 }
    );
  }
}

async function fetchWithRapidAPI(shortcode: string): Promise<InstagramPost> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error('RapidAPI key not configured');
  }

  const response = await axios.get(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info`,
    {
      params: { code_or_id_or_url: shortcode },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
      },
    }
  );

  const data = response.data.data;
  const mediaUrls: string[] = [];

  if (data.video_url) {
    mediaUrls.push(data.video_url);
  } else if (data.image_versions2?.candidates) {
    mediaUrls.push(data.image_versions2.candidates[0].url);
  } else if (data.carousel_media) {
    data.carousel_media.forEach((media: any) => {
      if (media.video_versions) {
        mediaUrls.push(media.video_versions[0].url);
      } else if (media.image_versions2?.candidates) {
        mediaUrls.push(media.image_versions2.candidates[0].url);
      }
    });
  }

  return {
    type: data.video_url ? 'video' : data.carousel_media ? 'carousel' : 'image',
    mediaUrls,
    caption: data.caption?.text,
    username: data.user?.username,
  };
}

async function fetchWithOEmbed(url: string): Promise<InstagramPost> {
  const response = await axios.get(
    `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`
  );

  const data = response.data;

  // oEmbed only provides thumbnail, not full resolution
  return {
    type: 'image',
    mediaUrls: [data.thumbnail_url],
    caption: data.title,
    username: data.author_name,
  };
}

async function fetchWithInstaDownloader(url: string): Promise<InstagramPost> {
  // Using a public Instagram downloader API
  const response = await axios.post(
    'https://v3.saveig.app/api/ajaxSearch',
    new URLSearchParams({
      q: url,
      t: 'media',
      lang: 'en',
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const html = response.data.data;

  // Parse HTML to extract download links
  const videoMatch = html.match(/href="([^"]+)">Download Video/);
  const imageMatch = html.match(/href="([^"]+)">Download Image/);

  const mediaUrls: string[] = [];
  let type: 'image' | 'video' | 'carousel' = 'image';

  if (videoMatch) {
    mediaUrls.push(videoMatch[1]);
    type = 'video';
  } else if (imageMatch) {
    mediaUrls.push(imageMatch[1]);
  }

  if (mediaUrls.length === 0) {
    throw new Error('No media found');
  }

  return {
    type,
    mediaUrls,
  };
}

export async function GET() {
  return NextResponse.json(
    { message: 'Instagram Post Downloader API. Use POST method with { url: "instagram_url" }' },
    { status: 200 }
  );
}
