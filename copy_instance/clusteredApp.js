const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const cpus = os.cpus().length;
    console.log(`Clustering to ${cpus} CPUs`);
    for (let i = 0; i < cpus; i++) {
        cluster.fork();
    }

    //handle error
    cluster.on('exit', (Worker, code) => {
        if (code != 0 && !Worker.suicide) {
            console.log('Worker crashed. Starting a new worker');
            cluster.fork();
        }
    })

    //零停机重启
    process.on('SIGUSR2', () => {
        const workers = Object.keys(cluster.workers);
        function restartWorker(i) {
            if (i >= workers.length) return;
            const worker = cluster.workers[workers[i]];
            console.log(`Stopping worker: ${worker.process.pid}`);
            worker.disconnect();
            worker.on('exit', () => {
                /* In Node.js 6.0.0, the worker.suicide was deprecated and replaced with a new worker.exitedAfterDisconnect property. */ 
                // if (!worker.suicide) return;
                if (!worker.exitedAfterDisconnect) return;
                const newWorker = cluster.fork();
                newWorker.on('listening', () => {
                    restartWorker(i + 1);
                })
            })
        }
        restartWorker(0);
    });

} else {
    require('./app')
}