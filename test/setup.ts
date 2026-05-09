/**
 * Jest setup script — runs once before tests are collected.
 *
 * Silences hap-nodejs's bridge-instance warnings (it logs to stdout when
 * Service / Characteristic instances are constructed without a parent
 * Accessory, which is normal for our unit tests).
 */
process.env.NODE_ENV = 'test';

// hap-nodejs writes a couple of `console.warn` lines about debug mode at
// import time when it sees `NODE_DEBUG=hap*` etc. Keep stderr clean.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('hap-nodejs') || msg.includes('Characteristic') && msg.includes('UUID')) {
    return;
  }
  originalWarn(...args);
};
