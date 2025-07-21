import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import pool from '../config/db.js';
import redis from '../utils/redisClient.js';
import path from 'path';
import { title } from 'process';

jest.setTimeout(90000);


// ------------------- Creating a user to test tasks ------------------------------------- //


let taskTesterLoginToken;
let taskTesterConfirmToken;
let taskTesterId;

let taskTester = {
  email: `taskTester_${Date.now()}@example.com`,
  username: `taskTester_${Date.now()}`,
  password: 'taskTester12345',
};


beforeAll(async () => {
  // register the test user
  const res = await request(app).post('/api/v1/users').send(taskTester);

  // extract confirmation token
  taskTesterConfirmToken = res.body.confirmationToken;

  // confirm email for registration
  const confirmRes = await request(app).get(`/api/v1/users/confirm-email?token=${taskTesterConfirmToken}`)
  console.log('Email confirmation response:', confirmRes.body);

  // Ensure the user is verified in the DB
  const result = await pool.query('SELECT verified FROM users WHERE email = $1', [taskTester.email]);
  expect(result.rows[0].verified).toBe(true); // Ensure the user is verified


  // get testUser Id
  const testUserResult = await pool.query('SELECT id FROM users WHERE email = $1', [res.body.user.email]);
  taskTesterId = testUserResult.rows[0].id;


  // taskTester login
  const taskTesterLoginRes = await request(app).post('/api/v1/users/login').send({
    identifier: taskTester.email,
    password: 'taskTester12345',
  });

  taskTesterLoginToken = taskTesterLoginRes.body.token;


  await request(app)
    .post('/api/v1/tasks/create-task')
    .set('Authorization', `Bearer ${taskTesterLoginToken}`)
    .send({ title: 'Task A', description: 'Test A' });

  await request(app)
    .post('/api/v1/tasks/create-task')
    .set('Authorization', `Bearer ${taskTesterLoginToken}`)
    .send({ title: 'Task B', description: 'Test B' });

  await request(app)
    .post('/api/v1/tasks/create-task')
    .set('Authorization', `Bearer ${taskTesterLoginToken}`)
    .send({ title: 'Task C', description: 'Test C' });

  await request(app)
    .post('/api/v1/tasks/create-task')
    .set('Authorization', `Bearer ${taskTesterLoginToken}`)
    .send({ title: 'Project Alpha', description: 'Planning phase' });

  await request(app)
    .post('/api/v1/tasks/create-task')
    .set('Authorization', `Bearer ${taskTesterLoginToken}`)
    .send({ title: 'Grocery shopping', description: 'Buy vegetables and fruits' });

  await request(app)
    .post('/api/v1/tasks/create-task')
    .set('Authorization', `Bearer ${taskTesterLoginToken}`)
    .send({ title: 'Alpha Review', description: 'Peer review' });

  console.log(` this is the token ${taskTesterLoginToken}`)
});


let taskIdToUpdate;

describe('taskTester_Routes', () => {

  test('✅ User should create task.', async () => {
    try {
      const res = await request(app)
        .post('/api/v1/tasks/create-task')
        .set('Authorization', `Bearer ${taskTesterLoginToken}`)
        .field('title', 'Task with media.')
        .field('description', 'Lets see if this one works out too.')
        .attach('audio', path.resolve('tests/test-audio.mp3'))
        .attach('image', path.resolve('tests/test-image.png'))

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message')
      expect(res.body).toHaveProperty('task')

      taskIdToUpdate = res.body.task.id;

    } catch (err) {
      console.error('Supertest stream error: ', err);
      throw err;
    };
  });

  test('❌ No task should be created without either title or description.', async () => {
    const res = await request(app)
      .post('/api/v1/tasks/create-task')
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)
      .send({
        title: "",
        description: ""
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Task must have atleast title or description.')
  });


  test('❌ No task should be created with a file size larger than 10 MB.', async () => {
    const res = await request(app)
      .post('/api/v1/tasks/create-task')
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)
      .field('title', 'Too big audio')
      .attach('audio', path.resolve('tests/just-over-10mb.mp3'));

    console.log('Status:', res.statusCode);
    console.log('Body:', res.body);

    expect(res.statusCode).toBe(413);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message.toLowerCase()).toMatch(/file too large/);
  });


  test('✅ User should be able to retrive task list.', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tasks');
  });


  test('❌ Should not allow access without token', async () => {
    const res = await request(app)
      .get('/api/v1/tasks'); // no auth header

    expect(res.statusCode).toBe(401);
    expect(res.body.message.toLowerCase()).toMatch(/unauthorized|token/i);
  });


  test('✅ Should return tasks matching search query', async () => {
    const res = await request(app)
      .get('/api/v1/tasks/search?query=Alpha')
      .set('Authorization', `Bearer ${taskTesterLoginToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.tasks.length).toBeGreaterThan(0);

    for (const task of res.body.tasks) {
      const text = `${task.title} ${task.description}`.toLowerCase();
      expect(text).toMatch(/alpha/);
    }
  });

  test('❌ Should not search if query parameter is missing', async () => {
    const res = await request(app)
      .get('/api/v1/tasks/search')
      .set('Authorization', `Bearer ${taskTesterLoginToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message.toLowerCase()).toMatch(/search query is required/);
  });


  test('✅ Should return empty array when no match found', async () => {
    const res = await request(app)
      .get('/api/v1/tasks/search?query=nonexistentword')
      .set('Authorization', `Bearer ${taskTesterLoginToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.tasks.length).toBe(0);
  });

  test('❌ Should not allow search without valid token', async () => {
    const res = await request(app)
      .get('/api/v1/tasks/search')

    expect(res.statusCode).toBe(401);
  });


  test('✅ Should update user\'s task', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskIdToUpdate}`)
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)
      .send({
        title: 'Updated Task Title',
        description: 'Updated description',
        is_completed: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('title', 'Updated Task Title');
    expect(res.body).toHaveProperty('description', 'Updated description');
    expect(res.body).toHaveProperty('is_completed', true);
  });


  test('❌ Should return 404 if task does not exist', async () => {
    const fakeId = '123123'; // assuming UUID format
    const res = await request(app)
      .put(`/api/v1/tasks/${fakeId}`)
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)
      .send({
        title: 'This will not work'
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message.toLowerCase()).toMatch(/task not found/);
  });


  test('❌ Should not allow update without token', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskIdToUpdate}`)
      .send({ title: 'Won\'t work' });

    expect(res.statusCode).toBe(401);
  });


  test('✅ Should delete user\'s own task.', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskIdToUpdate}`)
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(new RegExp(taskIdToUpdate))
  });


  test('❌ Should return 404 when deleting a non existing task.', async () => {
    const fakeTaskId = '1233453303';
    const res = await request(app)
      .delete(`/api/v1/tasks/${fakeTaskId}`)
      .set('Authorization', `Bearer ${taskTesterLoginToken}`)

    expect(res.statusCode).toBe(404);
    expect(res.body.message.toLowerCase()).toMatch(/task not found/);
  });


  test('❌ unauthorized access to delete task.', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskIdToUpdate}`)

    expect(res.statusCode).toBe(401);
    expect(res.body.message.toLowerCase()).toMatch(/unauthorized|token/);
  });
});


// --------------------------------------Admin taskTester tests -------------------------------------//

let taskTesterAdminLoginToken;

beforeAll(async () => {

  // Promote taskTester to admin
  await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [taskTesterId]);

  // admin login
  const loginAdminRes = await request(app).post('/api/v1/users/login').send({
    identifier: taskTester.email,
    password: 'taskTester12345',
  });

  taskTesterAdminLoginToken = loginAdminRes.body.token;
});


test('✅ Admin should be able to retrive all the tasks in database.', async () => {
  const res = await request(app)
    .get('/api/v1/tasks/admin/getalltasks')
    .set('Authorization', `Bearer ${taskTesterAdminLoginToken}`)

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.tasks)).toBe(true);
  expect(res.body).toHaveProperty('totalTasks');
});


test('❌ Should return 401 without token', async () => {
  const res = await request(app)
    .get('/api/v1/tasks/admin/getalltasks');

  expect(res.statusCode).toBe(401);
  expect(res.body.message.toLowerCase()).toMatch(/unauthorized|token/);
});


test('❌ Non-admin user should not access admin task list', async () => {
  const res = await request(app)
    .get('/api/v1/tasks/admin/getalltasks')
    .set('Authorization', `Bearer {Use Dummy Token}`); // not admin

  expect(res.statusCode).toBe(403);
  expect(res.body.message.toLowerCase()).toMatch(/admin/);
});
