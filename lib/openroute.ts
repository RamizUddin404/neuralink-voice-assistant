const OPENROUTE_API_KEY = process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;

export async function getDirections(start: [number, number], end: [number, number]) {
  if (!OPENROUTE_API_KEY) {
    console.warn("OpenRouteService API Key is missing.");
    return null;
  }

  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTE_API_KEY}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`;

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
