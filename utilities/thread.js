import { spawn } from "child_process";

/**
 * 1. LOW-LEVEL EXECUTION
 */
export async function execute(command) {
    if(command.includes("rm")) { 
        return; 
    }
    return new Promise((resolve, reject) => {
        const child = spawn(command, [], { shell: true });
        let fullOutput = "";
        let errorOutput = "";

        // Set a timeout to prevent infinite loops from hanging your server
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error("Execution Timed Out (15s limit)"));
        }, 15000);

        child.stdout.on('data', (data) => fullOutput += data.toString());
        child.stderr.on('data', (data) => errorOutput += data.toString());

        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(fullOutput);
            else reject(new Error(errorOutput || `Process exited with code ${code}`));
        });
    });
}

/**
 * 2. THE MASTER RUNNER MAP
 * This combines language names, aliases, and extensions into one source of truth.
 */
const runnerConfig = {
    // Scripts
    "js": { ext: "js", cmd: "node file.js" },
    "node": { ext: "js", cmd: "node file.js" },
    "javascript": { ext: "js", cmd: "node file.js" },
    "py": { ext: "py", cmd: "python3 file.py" },
    "python": { ext: "py", cmd: "python3 file.py" },
    "python3": { ext: "py", cmd: "python3 file.py" },
    "rb": { ext: "rb", cmd: "ruby file.rb" },
    "ruby": { ext: "rb", cmd: "ruby file.rb" },
    "php": { ext: "php", cmd: "php file.php" },
    "lua": { ext: "lua", cmd: "lua file.lua" },
    
    // Shell
    "sh": { ext: "sh", cmd: "bash file.sh" },
    "bash": { ext: "sh", cmd: "bash file.sh" },
    "zsh": { ext: "zsh", cmd: "zsh file.zsh" },

    // Compilers
    "c": { ext: "c", cmd: "gcc file.c -o main && ./main" },
    "cpp": { ext: "cpp", cmd: "g++ file.cpp -o main && ./main" },
    "c++": { ext: "cpp", cmd: "g++ file.cpp -o main && ./main" },
    "rs": { ext: "rs", cmd: "rustc file.rs -o main && ./main" },
    "rust": { ext: "rs", cmd: "rustc file.rs -o main && ./main" },
    "go": { ext: "go", cmd: "go run file.go" },
    "golang": { ext: "go", cmd: "go run file.go" },

    // JVM
    "java": { ext: "java", cmd: "javac file.java && java file" },
    "kt": { ext: "kt", cmd: "kotlinc file.kt -include-runtime -d main.jar && java -jar main.jar" },
    "kotlin": { ext: "kt", cmd: "kotlinc file.kt -include-runtime -d main.jar && java -jar main.jar" },
    
    // Others
    "ts": { ext: "ts", cmd: "npx ts-node file.ts" },
    "typescript": { ext: "ts", cmd: "npx ts-node file.ts" },
    "pl": { ext: "pl", cmd: "perl file.pl" },
    "perl": { ext: "pl", cmd: "perl file.pl" },
    "sql": { ext: "sql", cmd: "sqlite3 < file.sql" }
};

/**
 * 3. CORE LOGIC
 */
export async function main(text) {
    const trimmed = text.trim();
    
    // Extract language trigger (first word)
    const firstSpaceIndex = trimmed.search(/\s/);
    if (firstSpaceIndex === -1) return "Please provide code after the language name.";

    const langInput = trimmed.substring(0, firstSpaceIndex).toLowerCase();
    const code = trimmed.substring(firstSpaceIndex).trim();

    // Look up the configuration directly
    const config = runnerConfig[langInput];
    
    if (!config) {
        return `Language "${langInput}" is not supported. Supported: ${Object.keys(runnerConfig).join(", ")}`;
    }

    const { ext, cmd } = config;

    // Write file literally (using 'N' prevents shell from messing with variables)
    const writeCMD = `cat > "file.${ext}" << 'N'
${code}
N`;

    try {
        await execute(writeCMD);
        const output = await execute(cmd);
        
        // Cleanup
        await execute(`rm file.${ext} main main.jar 2>/dev/null || true`);
        return output;
    } catch (err) {
        await execute(`rm file.${ext} main main.jar 2>/dev/null || true`);
        return `--- ERROR ---\n${err.message}`;
    }
}

export async function executeCode(code) {
    return await main(code);
}