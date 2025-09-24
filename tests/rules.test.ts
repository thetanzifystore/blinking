const { assert } = require('chai');
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');

describe('Firestore and Storage rules', function() {
  let env: RulesTestEnvironment;

  before(async () => {
    // Prefer explicit emulator host/port from environment so tests can run outside of firebase emulators:exec.
    // Expected env vars:
    // - FIRESTORE_EMULATOR_HOST (e.g. "localhost:8080")
    // - FIREBASE_STORAGE_EMULATOR_HOST (e.g. "localhost:9199")
    const fsHost = process.env.FIRESTORE_EMULATOR_HOST || null;
    const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || null;

    if (!fsHost) {
      throw new Error(
        'Firestore emulator host not detected. Start the emulators and re-run tests, or set FIRESTORE_EMULATOR_HOST.\n' +
        "Quick options:\n" +
        " 1) Run with Firebase CLI automatic discovery:\n" +
        "    npx firebase emulators:exec \"npm run test:rules\"\n" +
        " 2) Start selected emulators in background and run tests:\n" +
        "    npx firebase emulators:start --only firestore,storage\n" +
        "    (then in another shell: npm run test:rules)\n" +
        " 3) Or set env vars (example):\n" +
        "    export FIRESTORE_EMULATOR_HOST=localhost:8080; export FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199; npm run test:rules\n"
      );
    }

    const [fsHostOnly, fsPortStr] = fsHost.split(':');
    const fsPort = parseInt(fsPortStr, 10) || undefined;

    let storageConfig: any = undefined;
    if (storageHost) {
      const [stHostOnly, stPortStr] = storageHost.split(':');
      const stPort = parseInt(stPortStr, 10) || undefined;
      storageConfig = { host: stHostOnly, port: stPort, rules: readFileSync('./storage.rules', 'utf8') };
    } else {
      // If storage emulator host not set we'll still allow Firestore-only testing but warn.
      storageConfig = { rules: readFileSync('./storage.rules', 'utf8') };
    }

    env = await initializeTestEnvironment({
      projectId: 'blinking-test',
      firestore: {
        host: fsHostOnly,
        port: fsPort,
        rules: readFileSync('./firebase.rules', 'utf8'),
      },
      storage: storageConfig,
    });
  });

  after(async () => {
    await env.clearFirestore();
    await env.cleanup();
  });

  it('allows authenticated user to create their own shot', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    const shots = alice.collection('shots');
    const res = shots.doc('s1').set({
      authorId: 'alice',
      mediaUrl: 'https://example.com/a.png',
      createdAt: new Date(),
    });
    await assertSucceeds(res);
  });

  it('prevents user creating a shot with different authorId', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    const res = bob.collection('shots').doc('s2').set({
      authorId: 'alice',
      mediaUrl: 'https://example.com/b.png',
      createdAt: new Date(),
    });
    await assertFails(res);
  });

  it('prevents unauthenticated write to shots', async () => {
    const anon = env.unauthenticatedContext().firestore();
    const res = anon.collection('shots').doc('s3').set({ authorId: 'anon', mediaUrl: 'x', createdAt: new Date() });
    await assertFails(res);
  });

  // Storage rules test: uploads under shots/{userId}
  it('allows authenticated user to upload image under their shots path', async () => {
    // Some test environment/storage APIs require supplying the bucket name explicitly.
    const alice = env.authenticatedContext('alice').storage();
  // Use the storage test client's ref API to write bytes via putString (base64)
  const fileRef = alice.ref('shots/alice/photo.png');
  // putString with base64 + metadata should exercise write rules (contentType check)
  await assertSucceeds(fileRef.putString('eA==', 'base64', { contentType: 'image/png' }));
  });

});
