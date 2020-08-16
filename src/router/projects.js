import express from 'express';
import bodyParser from 'body-parser';

const projectsRouter = express.Router();
projectsRouter.use(bodyParser.urlencoded({ extended: true }));
projectsRouter.use(bodyParser.json());

export async function defineProjectsRouter(db) {
  //! ROUT: Project creation

  //* Needs to receive 'name' property on request body (name of project to create)
  projectsRouter.post('/', async (req, res) => {
    const { name } = req.body;

    const slug = name.toLowerCase();

    /**
     * A project
     * @property {String} slug - The slug of the project (will serve as a "key")
     * @property {Array} boards - Array of boards (Objects representing boards. See board creation
     * rout to more info)
     */
    const project = {
      slug,
      boards: [],
    };

    const existingProject = await db.collection('projects').findOne({ slug });

    if (existingProject) {
      res.status(400).json({ error: `project "${slug}" already exists` });
    } else {
      await db.collection('projects').insertOne(project);
      res.json({ project });
    }
  });

  //! MIDDLEWARE: Check if project exists an return project inside request body
  //* Needs to receive 'slug' property on request parameters (slug of project to find)
  const findProject = async (req, res, next) => {
    const { slug } = req.params;

    const project = await db.collection('projects').findOne({ slug });

    if (!project) {
      res.status(400).json({ error: `project "${slug}" does not exist` });
    } else {
      req.body.project = project;
      next();
    }
  };

  //! ROUT: Project getter
  projectsRouter.get('/:slug', findProject, async (req, res) => {
    const { project } = req.body;
    res.json({ project });
  });

  //! ROUT: Project delete (Exercice 1 Rout)
  projectsRouter.delete('/:slug', findProject, async (req, res) => {
    const { project } = req.body;

    const deleted_result = await db
      .collection('projects')
      .deleteOne({ slug: project.slug });

    if (!deleted_result || deleted_result.deletedCount == 0) {
      res.status(500).json({
        error: `couldn't delete project "${project.slug}". Database request failed`,
      });
    } else {
      res.json({ project });
    }
  });

  //! ROUT: Board creation (changes made to original)
  //* Needs to receive 'name' property on request body (name of board to be created)
  projectsRouter.post('/:slug/boards', findProject, async (req, res) => {
    const { name, project } = req.body;

    //* Making sure all board names inside a project are unique. Change from base code here
    const existing_board = await db.collection('projects').findOne({
      slug: project.slug,
      'boards.name': name,
    });

    if (existing_board) {
      res.status(400).json({
        error: `board "${name}" inside project "${project.slug}" already exists`,
      });
    } else {
      /**
       * A board (that's going to be inside a project)
       * @property {String} name - The name of the board (will serve as a "key")
       * @property {Array} tasks - Array of tasks (Objects representing tasks (the minimal version).
       * See task creation rout to more info)
       * @property {Integer} _id_counter - A counter to help on the creation of tasks. Internal usage
       * only
       */
      const board = { name, tasks: [], _id_counter: 0 };
      project.boards.push(board);

      await db
        .collection('projects')
        .findOneAndReplace({ slug: project.slug }, project);

      res.json({ board });
    }
  });

  //! MIDDLEWARE: Check if board inside project exists and return board inside request body
  //* Needs to receive 'slug' and 'name' property on request parameters (slug of project and name of
  //*  board to be found)
  const findBoard = async (req, res, next) => {
    const { slug, name } = req.params;

    const project = await db.collection('projects').findOne({
      slug: slug,
      'boards.name': name,
    });

    if (!project) {
      res.status(400).json({
        error: `board "${name}" inside project "${slug}" does not exist`,
      });
    } else {
      // Get board from project (DB return a document with the whole project)
      const board = project.boards.find((board) => board.name == name);

      req.body.board = board;
      next();
    }
  };

  //! ROUT: Board deletion (Exercice 2 Rout)
  projectsRouter.delete(
    '/:slug/boards/:name',
    findProject,
    findBoard,
    async (req, res) => {
      const { project, board } = req.body;

      const update_result = await db
        .collection('projects')
        .updateOne(
          { slug: project.slug },
          { $pull: { boards: { name: board.name } } }
        );

      if (!update_result || update_result.modifiedCount == 0) {
        res.status(500).json({
          error: `couldn't delete board "${board.name}" from project "${project.slug}". Database request failed`,
        });
      } else {
        res.json({ board });
      }
    }
  );

  //! ROUT: Task creation (id_task starts at 0) (Exercice 3 Rout)
  //* Needs to receive 'description' property on request body (description of the task to be created)
  // NOTE: Two databases operate on the tasks: the 'projects' database and the 'tasks' database,
  // where the first has all information of the project strucure (as nested arrays of objects), and
  // the second has 'flat' information about the tasks (one document represent one tasks). The
  // second one was created for facilitating acess to the task information. This way, the first
  // database will receive the basic information of the tasked nested inside its structure and the
  // second will receive the information about the task and information about the project and board
  // where this task is located
  projectsRouter.post(
    '/:slug/boards/:name/tasks',
    findProject,
    findBoard,
    async (req, res) => {
      const { project, board, description: task_description } = req.body;

      // Getting id for the task to be created (stored on board object inside 'projects' db,
      // automatically incremented by one on every task creation)
      const next_id = board._id_counter;

      /**
       * A task (that's going to be inside of a board). This one is the simplified version that's
       * going in the 'projects' database (minimal version)
       * @property {Integer} id_task - The id of the task (always incremented when creation request
       * is called with a specific board) (will serve as a "key")
       * @property {String} description - The task description
       */
      const new_task = { id_task: next_id, description: task_description };

      const update_result = await db.collection('projects').updateOne(
        { slug: project.slug, 'boards.name': board.name },
        {
          $push: { 'boards.$.tasks': new_task },
          $inc: { 'boards.$._id_counter': 1 },
        }
      );

      /**
       * A task (that's going to be inside a board). This one has more information because it will be
       * put inside the 'tasks' database (specific for task acess)
       * @property {Integer} id_task - The id of the task (always incremented when creation request
       * is called with a specific board) (will serve as a "key")
       * @property {String} description - The task description
       * @property {String} project_slug - The slug of a project, as seen on the 'project' object
       * @property {String} board_name - The name of a board, as seen on the 'board' object
       */
      const new_task_db = {
        id_task: next_id,
        description: task_description,
        project_slug: project.slug,
        board_name: board.name,
      };

      const insert_result = await db.collection('tasks').insertOne(new_task_db);

      if (!update_result || !insert_result) {
        res.status(500).json({
          error: `couldn't create task "${task_description}" in board "${board.name}" from project "${project.slug}". Database request failed`,
        });
      } else {
        res.json({ task: new_task });
      }
    }
  );

  //! MIDDLEWARE: Check if board inside project exists and return board inside request body
  //* Needs to receive 'slug', 'name' and 'id' property on request parameters (slug of project, name
  //*  of board and id of task to be found)
  const findTask = async (req, res, next) => {
    const { slug, name, id: id_string } = req.params;
    const id = parseInt(id_string);

    const task = await db
      .collection('tasks')
      .findOne({ id_task: id, project_slug: slug, board_name: name });

    if (!task) {
      res.status(400).json({
        error: `task id "${id}" from board "${name}" inside project "${slug}" does not exist`,
      });
    } else {
      // Get board from project (DB return a document with the whole project)
      const task_base_info = {
        id_task: task.id_task,
        description: task.description,
      };

      req.body.task = task_base_info;
      next();
    }
  };

  //! ROUT: Task deletion (Exercice 4 Rout)
  projectsRouter.delete(
    '/:slug/boards/:name/tasks/:id',
    findProject,
    findBoard,
    findTask,
    async (req, res) => {
      const { project, board, task } = req.body;

      const update_result = await db
        .collection('projects')
        .updateOne(
          { slug: project.slug, 'boards.name': board.name },
          { $pull: { 'boards.$.tasks': { id_task: task.id_task } } }
        );

      const remove_result = await db
        .collection('tasks')
        .deleteOne({ id_task: task.id_task });

      if (!update_result || !remove_result) {
        res.status(500).json({
          error: `couldn't delete task with id "${task.id_task}" inside board "${board.name}" from project $"{project.slug}". Database request failed`,
        });
      } else {
        res.json({ task });
      }
    }
  );

  return projectsRouter;
}
