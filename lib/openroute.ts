export async function getDirections(start: [number, number], end: [number, number]) {
  let apiKey = process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;
  
  // Try local storage if env is not set
  if (!apiKey && typeof window !== 'undefined') {
    apiKey = localStorage.getItem('NEXT_PUBLIC_OPENROUTE_API_KEY') || '';
  }

  if (!apiKey) {
    console.warn("OpenRouteService API Key is missing.");
    return null;
  }

  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenRouteService error: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch directions:", error);
    return null;
  }
}
