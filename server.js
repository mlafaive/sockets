/*
  This is the SocketCluster master controller file.
  It is responsible for bootstrapping the SocketCluster master process.
  Be careful when modifying the options object below.
  If you plan to run SCC on Kubernetes or another orchestrator at some point
  in the future, avoid changing the environment variable names below as
  each one has a specific meaning within the SC ecosystem.
*/
var scHotReboot = require('sc-hot-reboot');

var SocketCluster = require('socketcluster');

var environment = process.env.ENV || 'dev';

var options = {
  workers: 1,
  brokers: 1,
  port: process.env.PORT || 8000,
  wsEngine: 'sc-uws',
  workerController: __dirname + '/worker.js',

  /* JS file which you can use to configure each of your
   * brokers - Useful for scaling horizontally across multiple machines (optional)
   */
  brokerController: __dirname + '/broker.js',

  // Whether or not to reboot the worker in case it crashes (defaults to true)
  rebootWorkerOnCrash: true
};

var socketCluster = new SocketCluster(options);

socketCluster.on(socketCluster.EVENT_WORKER_CLUSTER_START, function (workerClusterInfo) {
  console.log('   >> WorkerCluster PID:', workerClusterInfo.pid);
});

if (socketCluster.options.environment === 'dev') {
  // This will cause SC workers to reboot when code changes anywhere in the app directory.
  // The second options argument here is passed directly to chokidar.
  // See https://github.com/paulmillr/chokidar#api for details.
  console.log(`   !! The sc-hot-reboot plugin is watching for code changes in the ${__dirname} directory`);
  scHotReboot.attach(socketCluster, {
    cwd: __dirname,
    ignored: ['public', 'node_modules', 'README.md', 'server.js', 'broker.js', /[\/\\]\./, '*.log']
  });
}

