'use strict';

// ─── Test Suite: sendSuccess helper ─────────────────────────────────────────────
// sendSuccess() is the single function used by every controller to send a
// successful HTTP response.  It enforces a consistent JSON shape:
//   { success: true, data: <payload>, message?: <string> }
// Keeping this shape stable means frontend code can always rely on it.

const { sendSuccess } = require('../../utils/response');

// Build a minimal mock Express Response object that records what was called.
const makeRes = () => {
  const res = {};
  // res.status() and res.json() chain on the same object (Express pattern)
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe('sendSuccess', () => {
  // ── Default status code ───────────────────────────────────────────────
  it('responds with HTTP 200 and success:true when no status code is supplied', () => {
    const res = makeRes();
    sendSuccess(res, { id: 1 });

    expect(res.status).toHaveBeenCalledWith(200);             // default status
    expect(res.json).toHaveBeenCalledWith({                   // shape check
      success: true,
      data: { id: 1 },
    });
  });

  // ── message field is optional ──────────────────────────────────────────
  it('omits the message key entirely when no message argument is passed', () => {
    const res = makeRes();
    sendSuccess(res, null);                           // no message → key absent
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('message');      // consumers must not rely on it
  });

  it('includes message when the third argument is provided', () => {
    const res = makeRes();
    sendSuccess(res, [], 'Items fetched');            // pass a message string
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Items fetched');      // message key present
  });

  // ── Custom status codes ───────────────────────────────────────────────
  it('uses the custom HTTP statusCode when provided as the 4th argument', () => {
    const res = makeRes();
    sendSuccess(res, { created: true }, 'Created', 201); // 201 Created
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // ── Return value ───────────────────────────────────────────────────────
  it('returns the response object so controllers can optionally chain on it', () => {
    const res = makeRes();
    const result = sendSuccess(res, {});
    expect(result).toBe(res);                        // Express chain contract
  });

  // ── Data pass-through ─────────────────────────────────────────────────
  it('passes the data payload through to JSON without modification', () => {
    const res = makeRes();
    const data = { nested: { arr: [1, 2, 3] } };
    sendSuccess(res, data);
    // data must arrive unchanged — no cloning or serialisation side-effects
    expect(res.json.mock.calls[0][0].data).toEqual(data);
  });
});
