type BackendOrder = {
    id: string;
    day: string;
    capacitySeconds: number;
};

type BackendInterval = {
    id: string;
    day: string;
    start: number;
    durationSeconds: number;
};

export type BackendPayload = {
    vehicleId: number;
    orders: BackendOrder[];
    intervals: BackendInterval[];
};

export type BackendAssignment = {
    orderId: string;
    intervalId: string;
    seconds: number;
};

export type BackendSolveResponse = {
    vehicleId: number;
    assignedSeconds: number;
    assignments: BackendAssignment[];
};

const backendBaseUrl = (import.meta.env.VITE_MILP_BACKEND_URL || '').trim();

export function isMilpBackendAvailable(): boolean {
    return backendBaseUrl.length > 0;
}

export async function solveVehicleWithBackend(payload: BackendPayload): Promise<BackendSolveResponse> {
    if (!isMilpBackendAvailable()) {
        throw new Error('MILP backend URL is not configured');
    }
    const url = `${backendBaseUrl.replace(/\/$/, '')}/solve`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`MILP backend failed with status ${response.status}`);
    }
    const data = await response.json();
    return data as BackendSolveResponse;
}

