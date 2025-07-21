import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import pool from '../config/db.js';
import redis from '../utils/redisClient.js';

jest.setTimeout(90000);

// ----------------------------- User route testing ----------------------------------------//

let testUser = {
  email: `login_test_${Date.now()}@example.com`,
  username: `login_user_${Date.now()}`,
  password: 'test12345',
};

let confirmToken;
let loginToken;
let resetToken;
let userToDelete;

beforeAll(async () => {

  // Register user
  const res = await request(app).post('/api/v1/users').send(testUser);

  // Extract confirmation token from response body
  confirmToken = res.body.confirmationToken;

  // Confirm the email using the confirmation token
  const confirmRes = await request(app).get(`/api/v1/users/confirm-email?token=${confirmToken}`);
  console.log('Email confirmation response:', confirmRes.body); // Log for debugging

  // Ensure the user is verified in the DB
  const result = await pool.query('SELECT verified FROM users WHERE email = $1', [testUser.email]);
  expect(result.rows[0].verified).toBe(true); // Ensure the user is verified
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
  userToDelete = userResult.rows[0].id;
});


afterAll(async () => {

  console.log('🧹 Starting cleanup...');

  // Redis cleanup
  if (redis.isOpen) {
    const ping = await redis.ping(); console.log('✅ Redis ping result:', ping);

    await redis.flushAll();
    console.log('🧹 Redis flushed.');

    await redis.quit();
    console.log('✅ Redis connection closed.');
  } else {
    console.log('⚠️ Redis client was not open.');
  }
});


describe('User login route', () => {
  test('✅ Should login with valid credentials.', async () => {
    const res = await request(app).post('/api/v1/users/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('name');
    loginToken = res.body.token;
  }, 10000);


  test('❌ Should fail with wrong password.', async () => {
    const res = await request(app).post('/api/v1/users/login').send({
      identifier: testUser.email,
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch('Invalid credentials. Try again.');
  }, 10000);


  test('❌ Should fail if user is not found.', async () => {
    const res = await request(app).post('/api/v1/users/login').send({
      identifier: 'notTestUser@example.com',
      password: 'randomepassword',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch('User not found. Please register.');
  }, 10000);
});


describe('Password reset route', () => {
  test('✅ Should send a password reset email and get token.', async () => {
    const res = await request(app).post('/api/v1/users/forgot-password').send({
      email: testUser.email,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Password reset link sent.');
    expect(res.body).toHaveProperty('resetToken');
    resetToken = res.body.resetToken;
  });


  test('❌ Should fail if email is not registered.', async () => {
    const res = await request(app).post('/api/v1/users/forgot-password').send({
      email: 'randomEmail@example.com'
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('User not registered.');
  });
});


describe('Password reset functionality', () => {

  test('✅ Should reset password successfully with valid token and new password.', async () => {
    const res = await request(app)
      .post(`/api/v1/users/reset-password?token=${resetToken}`)
      .send({
        newPassword: 'newPassword123',
      });
    console.log(`/api/v1/users/reset-password?token=${resetToken}`);
    console.log(resetToken);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Password reset successfully.');
  });


  test('❌ Should fail with an invalid or expired reset token.', async () => {
    const res = await request(app)
      .post('/api/v1/users/reset-password?token=invalidToken')
      .send({
        newPassword: 'newPassword123',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid or expired token.');
  });
});


describe('Get logged-in user profile.', () => {

  test('✅ Should return logged in user profile.', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${loginToken}`)

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('username');
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('isAdmin');
  });
});


// -----------------Admin route testing -------------------------------//

let adminLoginToken;
let adminConfirmToken;
let modifyUserConfirmToken;
let adminUserId;
let userToModifyId;

let adminUser = {
  email: `adminUser_${Date.now()}@example.com`,
  username: `adminUser_${Date.now()}`,
  password: 'adminTest12345',
};

let userToModify = {
  email: `userToModify_${Date.now()}@example.com`,
  username: `userToModify_${Date.now()}`,
  password: 'userToModify12345',
}

beforeAll(async () => {
  // register admin user and the test user
  const res = await request(app).post('/api/v1/users').send(adminUser);
  const testRes = await request(app).post('/api/v1/users').send(userToModify);

  // extract confirmation token
  adminConfirmToken = res.body.confirmationToken;
  modifyUserConfirmToken = testRes.body.confirmationToken;

  // confirm email for registration
  const confirmRes = await request(app).get(`/api/v1/users/confirm-email?token=${adminConfirmToken}`)
  const modifyUserConfirmRes = await request(app).get(`/api/v1/users/confirm-email?token=${modifyUserConfirmToken}`)
  console.log('Email confirmation response:', confirmRes.body);
  console.log('Email confirmation response:', modifyUserConfirmRes.body);

  // Ensure the user is verified in the DB
  const result = await pool.query('SELECT verified FROM users WHERE email = $1', [adminUser.email]);
  expect(result.rows[0].verified).toBe(true); // Ensure the user is verified

  const modifyUserResult = await pool.query('SELECT verified FROM users WHERE email = $1', [userToModify.email]);
  expect(modifyUserResult.rows[0].verified).toBe(true); // Ensure the user is verified


  // Get admin ID
  const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [res.body.user.email]);
  adminUserId = adminResult.rows[0].id;

  // Get userToModify ID
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [testRes.body.user.email]);
  userToModifyId = userResult.rows[0].id;
  console.log('modifyUser created has id:', userToModifyId)

  // Promote to admin
  await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

  // admin login
  const loginAdminRes = await request(app).post('/api/v1/users/login').send({
    identifier: adminUser.email,
    password: 'adminTest12345',
  });

  adminLoginToken = loginAdminRes.body.token;
});


describe('Admin routes', () => {

  test('✅ Admin should get all users profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/allUserProfiles')
      .set('Authorization', `Bearer ${adminLoginToken}`)

    expect(res.statusCode).toBe(200);
  });


  test('✅ Admin should update a user', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${userToModifyId}`)
      .set('Authorization', `Bearer ${adminLoginToken}`)
      .send({
        username: 'updatedByAdmin',
      })

    expect(res.statusCode).toBe(200);
  });


  test('✅ Admin should delete a user', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${userToModifyId}`)
      .set('Authorization', `Bearer ${adminLoginToken} `)

    expect(res.statusCode).toBe(200);
  });
});
