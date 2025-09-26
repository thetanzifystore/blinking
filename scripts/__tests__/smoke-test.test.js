const fs = require('fs');
const path = require('path');

test('detects keyword in HTML', () => {
  const html = fs.readFileSync(path.join(__dirname, 'mock.html'), 'utf8');
  expect(html.includes('Blinking')).toBe(true);
});
