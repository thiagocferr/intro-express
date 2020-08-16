import request from 'supertest';

import { app, bootstrap } from '../src/app';

describe('our app', () => {
  let db;

  beforeAll(async () => (db = await bootstrap()));

  beforeEach(async () => {
    await db.dropDatabase(process.env.DB_NAME + '_test');
  });

  afterAll(async () => await db.close());

  /**
   * Creates a project
   * @summary Since we need to create a new project for every test, this functions does that,
   * reducing code repetition. The HTTP request works as intended based on TEST 2
   * @param {String} project_name - The name of the project to be created. Default to 'Awesome'
   * @return {Object} Returns object with two fields: 'project', which is a object representing the
   * structure of the created project ({slug (String), boards (Array)}), and 'response' as the body
   * of the HTTP response (which includes the project) for the project creation
   */
  async function createProject(project_name = 'Awesome') {
    const project_info = { name: project_name };

    const response = await request(app).post('/projects').send(project_info);

    const { project } = response.body;

    return { project, response };
  }

  /**
   * Creates a board inside a project
   * @summary Since some tests depend on the previous creation of a board, this functions does that,
   * reducing code repetition. The HTTP request works as intended based on TEST 4
   * @param {String} slug - The slug of the project in which to create a board
   * @param {String} board_name - The name of the board to be created. Default to 'todo'
   * @return {Object} Returns object with two fields: 'board', which is a object representing the
   * structure of the created board ({ name (String), tasks (Array), _id_counter (Number)};), and
   * 'response' as the body of the HTTP response (which includes the board) for the board creation
   */
  async function createBoard(slug, board_name = 'todo') {
    const response = await request(app)
      .post(`/projects/${slug}/boards`)
      .send({ name: board_name });

    const { board } = response.body;

    return { board, response };
  }

  //! TEST 1
  test('GET / returns a "hello world"', async () => {
    const { body } = await request(app).get('/');

    expect(body.message).toBeDefined();
    expect(body.message).toBe('hello world');
  });

  //! TEST 2
  // Project creation
  test('POST /projects returns a new project slug', async () => {
    const { body } = await request(app)
      .post('/projects')
      .send({ name: 'Awesome' });

    expect(body.project).toBeDefined();
    expect(body.project.slug).toBe('awesome');
  });

  //! TEST 3
  // Project getter
  test('GET /projects/:slug returns a matching project', async () => {
    await request(app).post('/projects').send({ name: 'Awesome' });

    const { body } = await request(app).get('/projects/awesome');

    expect(body.project).toBeDefined();
    expect(body.project.slug).toBe('awesome');
  });

  //! TEST 4
  // Board creation
  test('POST /projects/:slug/boards adds a new board into a project', async () => {
    const {
      project: { slug },
    } = await createProject('Awesome');
    const name = 'todo';

    // Receives the board structure on response variable
    const { body } = await request(app)
      .post(`/projects/${slug}/boards`)
      .send({ name });

    expect(body.board).toBeDefined();
    expect(body.board.name).toBe(name);
  });

  //! TEST 5
  // Board creation name uniquiness. This test was added to show that the changes made to the board
  // creation function in the server (so that two projects with the same name on the same project
  // cannot exist) don't cause unexpected results
  test('POST /projects/:slug/boards fails when adding two boards with the same name inside the same project', async () => {
    const {
      project: { slug },
    } = await createProject('Awesome');

    const name = 'test';
    const name2 = 'test';

    // Trying to create duplicate boards
    await createBoard(slug, name);
    const {
      board,
      response: { statusCode },
    } = await createBoard(slug, name2);

    // No board returned and error 400 (board already exists)
    expect(board).toBeUndefined();
    expect(statusCode).not.toBe(200);
  });

  // ! Testing new funtionalities for the activity

  //! TEST 6
  // Project deletion
  // * First rout
  test('DELETE /projects/:slug deletes a project with a specific slug', async () => {
    const {
      project: { slug },
    } = await createProject('Awesome');

    // Delete project
    const { body, statusCode: deletion_statusCode } = await request(app).delete(
      `/projects/${slug}`
    );

    // Trying to get deleted project from DB
    const { statusCode: error_statusCode } = await request(app).get(
      `/projects/${slug}`
    );

    expect(body.project).toBeDefined();
    expect(deletion_statusCode).toBe(200);
    expect(error_statusCode).not.toBe(200);
  });

  //! TEST 7
  // Board deletion
  // * Second rout
  test('DELETE /projects/:slug/boards/:name deletes a board inside a project with a specific name', async () => {
    const {
      project: { slug },
    } = await createProject('Awesome');

    const board_name = 'todo';
    await createBoard(slug, board_name);

    // Deleting board
    await request(app).delete(`/projects/${slug}/boards/${board_name}`);

    // Getting project from DB (to check if board still exists)
    const {
      body: { project: project_after_delete },
    } = await request(app).get(`/projects/${slug}`);

    // Number of boards with the specified name after deletion (shoud be 0)
    const num_boards_after_delete = project_after_delete.boards.filter(
      (e) => e.name === board_name
    ).length;

    //fail();
    expect(num_boards_after_delete).toBe(0);
  });

  //! TEST 8
  // Board deletion - Non-existant board (testing middleware 'findBoard')
  // * Second rout
  test('DELETE /projects/:slug/boards/:name gives an error when trying to delete a non-existant board', async () => {
    const {
      project: { slug },
    } = await createProject('Awesome');

    const board_name = 'todo';

    // Deleting board (non-existant)
    const { body, statusCode } = await request(app).delete(
      `/projects/${slug}/boards/${board_name}`
    );

    expect(body.board).toBeUndefined();
    expect(statusCode).not.toBe(200);
  });

  //! TEST 9
  // Task creation
  // * Third rout
  test('POST /projects/:slug/boards/:name/tasks creates a new task inside a board related to a project', async () => {
    const {
      project: { slug },
    } = await createProject('Awesome');

    const board_name = 'todo';
    await createBoard(slug, board_name);

    const task_description = 'Kilroy Was Here';

    // Receives the task structure in response variable
    // Task structure: { id_task (Number), description (String) };
    const { body } = await request(app)
      .post(`/projects/${slug}/boards/${board_name}/tasks`)
      .send({ description: task_description });

    expect(body.task).toBeDefined();
    expect(body.task.description).toBe(task_description);
  });

  //! TEST 10
  // Task deletion (using id)
  // * Fourth rout

  test('DELETE /projects/:slug/boards/name/tasks/:id deletes a task using its ID', async () => {
    // Creating project and board
    const {
      project: { slug: project_slug },
    } = await createProject('Awesome');
    const {
      board: { name: board_name },
    } = await createBoard(project_slug, 'todo');

    // Creating task and getting its ID (id_task)
    const task_description = 'Kilroy Was Here';
    const {
      body: {
        task: { id_task },
      },
    } = await request(app)
      .post(`/projects/${project_slug}/boards/${board_name}/tasks`)
      .send({ description: task_description, test: 'test' });

    // Deleting task
    const { statusCode } = await request(app).delete(
      `/projects/${project_slug}/boards/${board_name}/tasks/${id_task}`
    );

    // Searching for task info on 'tasks' database (to see if it still exits). Should return null
    const no_task = await db.collection('tasks').findOne({
      id_task: id_task,
      project_slug: project_slug,
      board_name: board_name,
    });

    expect(statusCode).toBe(200);
    expect(no_task).toBeNull();
  });

  //! TEST 11
  // Task deletion (of non-existant task). Testing 'findTask' middleware
  // * Fourth rout
  test('DELETE /projects/:slug/boards/name/tasks/:id gives an error when trying to delete a non-existant taks', async () => {
    // Creating project and board
    const {
      project: { slug: project_slug },
    } = await createProject('Awesome');
    const {
      board: { name: board_name },
    } = await createBoard(project_slug, 'todo');

    const id_task = 42;

    // Trying to delete non-existant task
    const { body, statusCode } = await request(app).delete(
      `/projects/${project_slug}/boards/${board_name}/tasks/${id_task}`
    );

    expect(body.task).toBeUndefined();
    expect(statusCode).not.toBe(200);
  });
});
