const childProcess = require('node:child_process');
const { EventEmitter } = require('node:events');

const originalExec = childProcess.exec;

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => true;

  process.nextTick(() => {
    child.emit('close', 0);
    child.emit('exit', 0);
  });

  return child;
}

childProcess.exec = function patchedExec(command, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (typeof command === 'string' && command.trim().toLowerCase() === 'net use') {
    const child = fakeChild();
    if (typeof callback === 'function') {
      process.nextTick(() => callback(null, '', ''));
    }
    return child;
  }

  return originalExec.call(this, command, options, callback);
};
