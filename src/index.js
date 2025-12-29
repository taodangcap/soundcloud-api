// Cloudflare Worker for SoundCloud API Proxy
// This worker runs on Cloudflare's Edge network

// Configuration - can be overridden via environment variables in wrangler.toml
const CONFIG = {
  soundcloud: {
    // Client ID - Set via wrangler.toml secrets or hardcode here
    clientId: 'KKzJxmw11tYpCs6T24P4uUYhqmjalG6M', // ← Hardcode here or use env.SOUNDCLOUD_CLIENT_ID
    apiBaseUrl: 'https://api-v2.soundcloud.com',
    defaultLimit: 10,
    maxLimit: 50,
  },
  server: {
    name: 'SoundCloud Proxy Server',
    version: '1.0.0',
  }
}

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle OPTIONS request for CORS preflight
function handleOptions() {
  return new Response(null, {
    headers: corsHeaders,
  })
}

// Transform SoundCloud track data
function transformTrack(track) {
  return {
    id: track.id?.toString() || track.permalink_url || `sc_${Date.now()}_${Math.random()}`,
    title: track.title || 'Untitled',
    description: track.description || '',
    thumbnail: track.artwork_url || track.user?.avatar_url || '',
    channelTitle: track.user?.username || track.user?.full_name || 'Unknown Artist',
    duration: track.duration || 0,
    viewCount: track.playback_count || 0,
    publishedAt: track.created_at || new Date().toISOString(),
    source: 'soundcloud',
    streamUrl: track.stream_url,
    permalinkUrl: track.permalink_url || `https://soundcloud.com/${track.user?.permalink}/${track.permalink}`,
  }
}

// Main handler
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions()
    }

    const url = new URL(request.url)
    const path = url.pathname

    // Health check endpoint
    if (path === '/health') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          service: CONFIG.server.name,
          version: CONFIG.server.version 
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // SoundCloud search endpoint
    if (path === '/api/soundcloud/search') {
      try {
        const { searchParams } = url
        const q = searchParams.get('q')
        const limit = searchParams.get('limit') || CONFIG.soundcloud.defaultLimit
        const client_id = searchParams.get('client_id')

        if (!q) {
          return new Response(
            JSON.stringify({ error: 'Query parameter "q" is required' }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          )
        }

        // Use client_id from query, env, or config (priority order)
        const clientId = client_id || env.SOUNDCLOUD_CLIENT_ID || CONFIG.soundcloud.clientId

        if (!clientId) {
          return new Response(
            JSON.stringify({ 
              error: 'Client ID is required. Set SOUNDCLOUD_CLIENT_ID secret or pass it as query parameter' 
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          )
        }

        // Validate and limit the search limit
        const searchLimit = Math.min(
          parseInt(limit) || CONFIG.soundcloud.defaultLimit,
          CONFIG.soundcloud.maxLimit
        )
        const searchQuery = encodeURIComponent(q)
        const apiUrl = `${CONFIG.soundcloud.apiBaseUrl}/search/tracks?q=${searchQuery}&limit=${searchLimit}&client_id=${clientId}`

        // Fetch from SoundCloud API
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          return new Response(
            JSON.stringify({
              error: `SoundCloud API error: ${response.status}`,
              details: errorText,
            }),
            {
              status: response.status,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          )
        }

        const data = await response.json()
        
        // Transform the data
        const tracks = (data.collection || []).map(transformTrack)

        return new Response(
          JSON.stringify(tracks),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            message: error.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  },
}

