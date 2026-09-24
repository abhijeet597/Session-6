const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert');

const Habit = require('../models/Habit');
const { deleteHabit } = require('../controllers/habitController');

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    send(data) { this.body = data; return this; },
  };
}

afterEach(() => { mock.restoreAll(); });

test('deleteHabit returns 404 for a non-existent id', async () => {
  mock.method(Habit, 'findOneAndDelete', async () => null);
  const res = mockRes();
  await deleteHabit({ userId: 'user-1', params: { id: 'x' } }, res);
  assert.strictEqual(res.statusCode, 404);
});

test('deleteHabit returns 204 on success', async () => {
  mock.method(Habit, 'findOneAndDelete', async (query) => ({ _id: query._id }));
  const res = mockRes();
  await deleteHabit({ userId: 'user-1', params: { id: '1' } }, res);
  assert.strictEqual(res.statusCode, 204);
});
