import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Euler, Quaternion, Vector3 } from 'three';
import { orientationToQuaternion } from '../src/lib/capture/orientation.ts';
import { nativePose } from '../../mobile/src/lib/capture/nativePose.ts';
import { buildCaptureManifest } from '../../shared/capturePolicy.ts';

test('native radians and browser degrees describe the same rear-camera poses', () => {
  const rad = Math.PI/180;
  for (const screen of [0, 90, 180, -90]) {
    for (let i = 0; i < 100; i++) {
      const alpha = i*3.6, beta = i*3.6-180, gamma = i*1.8-90;
      const web = orientationToQuaternion(alpha, beta, gamma, screen);
      const mobile = nativePose({ alpha: alpha*rad, beta: beta*rad, gamma: gamma*rad }, screen);
      const reference = new Quaternion().setFromEuler(new Euler(beta*rad, alpha*rad, -gamma*rad, 'YXZ'))
        .multiply(new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -screen*rad));
      assert.ok(web.angleTo(reference) < 1e-6);
      assert.ok(web.angleTo(new Quaternion(mobile[1], mobile[2], mobile[3], mobile[0])) < 1e-6);
    }
  }
});

test('variable automatic photo counts serialize indexed poses into the common upload manifest', () => {
  for (const count of [17,24,32,47]) {
    const frames = Array.from({length:count}, (_,id) => ({ targetId: id,
      uri: 'file:///private/photo.jpg', orientation: [1, 0, 0, 0] }));
    const manifest = buildCaptureManifest('Kamar', frames);
    assert.equal(manifest.frames.length, count);
    assert.deepEqual(manifest.frames[0], { index: 0, orientation: [1, 0, 0, 0] });
    assert.ok(!JSON.stringify(manifest).includes('file:'));
  }
});
