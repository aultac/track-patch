declare module 'javascript-lp-solver' {
    const solver: {
        Solve(model: any, precision?: number, full?: boolean, timeout?: number): any;
    };
    export = solver;
}

