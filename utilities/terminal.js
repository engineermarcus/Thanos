import { spawn } from "child_process";

export async function execute(command, args = []) {
    return new Promise((resolve, reject) => {
        // ADD { shell: true } as the third argument
        // This allows > and << to work properly
        const child = spawn(command, args, { shell: true });

        let fullOutput = "";
        let errorOutput = "";

        child.stdout.on('data', (data) => {
            fullOutput += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(fullOutput);
            } else {
                reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
            }
        });
    });
}

