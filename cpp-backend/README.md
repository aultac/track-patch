# C++ MILP Backend

This directory contains a lightweight C++ solver that mirrors the linear MILP
formulation used by the work order app.  It reads a vehicle/job definition from
stdin, computes the optimal allocation using a max–flow model (units are
seconds), and prints the assignments back to stdout.  The `@track-patch/cli`
workspace exposes an HTTP wrapper (`milp-server`) that spawns this binary for
each request.

## Build

```
cd cpp-backend
cmake -S . -B build
cmake --build build -j
```

This produces `build/milp_solver`.

## Running the server

```
MILP_SOLVER_BIN=../cpp-backend/build/milp_solver \
MILP_SERVER_PORT=4789 \
yarn workspace @track-patch/cli milp-server
```

Set `VITE_MILP_BACKEND_URL=http://localhost:4789` for the workorder app so that
each vehicle is offloaded to this backend.

