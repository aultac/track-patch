import http from 'http';
import { spawn } from 'child_process';
import path from 'path';

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

type BackendPayload = {
    vehicleId: number;
    orders: BackendOrder[];
    intervals: BackendInterval[];
};

type SolverResult = {
    assignedSeconds: number;
    assignments: {
        orderId: string;
        intervalId: string;
        seconds: number;
    }[];
};

const port = Number(process.env.MILP_SERVER_PORT || 4789);
const solverBinary = process.env.MILP_SOLVER_BIN
    ? process.env.MILP_SOLVER_BIN
    : path.resolve(process.cwd(), 'cpp-backend/build/milp_solver');

async function collectBody(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
    });
}

function encodePayload(payload: BackendPayload): string {
    const lines: string[] = [];
    lines.push(String(payload.vehicleId));
    lines.push(String(payload.orders.length));
    payload.orders.forEach((order) => {
        lines.push(`${order.id} ${order.day} ${Math.max(0, Math.floor(order.capacitySeconds))}`);
    });
    lines.push(String(payload.intervals.length));
    payload.intervals.forEach((interval) => {
        lines.push(`${interval.id} ${interval.day} ${Math.floor(interval.start)} ${Math.max(0, Math.floor(interval.durationSeconds))}`);
    });
    lines.push('');
    return lines.join('\n');
}

function decodeOutput(stdout: string): SolverResult {
    const lines = stdout.trim().split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error('Invalid solver output');
    }
    const assignedSeconds = Number(lines[0]);
    const assignmentCount = Number(lines[1]);
    const assignments = [];
    for (let i = 0; i < assignmentCount; i++) {
        const line = lines[2 + i];
        if (!line) continue;
        const [orderId = '', intervalId = '', secondsStr = '0'] = line.trim().split(' ');
        assignments.push({
            orderId,
            intervalId,
            seconds: Number(secondsStr),
        });
    }
    return { assignedSeconds, assignments };
}

async function runSolver(payload: BackendPayload): Promise<SolverResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(solverBinary, [], { stdio: ['pipe', 'pipe', 'inherit'] });
        let stdout = '';
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`milp_solver exited with code ${code}`));
                return;
            }
            try {
                resolve(decodeOutput(stdout));
            } catch (err) {
                reject(err);
            }
        });
        child.stdin.write(encodePayload(payload));
        child.stdin.end();
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/solve') {
        res.statusCode = 404;
        res.end('Not Found');
        return;
    }
    try {
        const body = await collectBody(req);
        const payload = JSON.parse(body.toString()) as BackendPayload;
        const result = await runSolver(payload);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            vehicleId: payload.vehicleId,
            assignedSeconds: result.assignedSeconds,
            assignments: result.assignments,
        }));
    } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err?.message || 'Solver error' }));
    }
});

server.listen(port, () => {
    console.log(`MILP server listening on port ${port} using solver ${solverBinary}`);
});
