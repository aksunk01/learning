import { baseUrlOrThrow, handleResponse } from "@/lib/api-helpers";

export async function fetchTodayPlan(token, semesterId) {
  const baseUrl = baseUrlOrThrow();
  const params = semesterId ? `?semester_id=${semesterId}` : '';

  const response = await fetch(`${baseUrl}/api/v1/planner/today${params}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to fetch today plan');
}
