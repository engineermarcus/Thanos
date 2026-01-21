export async function chunk(text, callback) {
    const chunked = text.split(" ");
    const mem = [];
    let i = 0;

    const interval = setInterval(() => {
        mem.push(chunked[i]);
        const block = mem.join(" ");
        callback(block);
        if (++i >= chunked.length) clearInterval(interval);
    }, 100);
}
