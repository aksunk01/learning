export async function fetchDashboard(token, semesterId) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';

  const response = await fetch(`${baseUrl}/api/v1/dashboard${query}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
