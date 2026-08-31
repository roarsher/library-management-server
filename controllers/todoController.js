 const asyncHandler = require('../utils/asyncHandler');
const { Todo, Student } = require('../models');

// @desc    Create a to-do item
// @route   POST /api/todos
// @access  Private (student)
const createTodo = asyncHandler(async (req, res) => {
  const { title, dueDate, priority, notes, category, subtasks, repeat } = req.body;
  const student = await Student.findOne({ userId: req.user._id });

  const last = await Todo.findOne({ studentId: student._id }).sort({ order: -1 });
  const order = last ? last.order + 1 : 0;

  const todo = await Todo.create({
    libraryId: req.libraryId,
    studentId: student._id,
    title,
    dueDate,
    priority,
    notes,
    category,
    subtasks,
    repeat,
    order,
  });

  res.status(201).json({ todo });
});

// @desc    List logged-in student's to-dos
// @route   GET /api/todos/me
// @access  Private (student)
const getMyTodos = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const todos = await Todo.find({ studentId: student._id }).sort({ order: 1, createdAt: -1 });
  res.status(200).json({ todos });
});

// @desc    Update a to-do — also handles repeat regeneration when marked complete
// @route   PUT /api/todos/:id
// @access  Private (student)
const updateTodo = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const todo = await Todo.findOne({ _id: req.params.id, studentId: student._id });
  if (!todo) {
    return res.status(404).json({ message: 'To-do not found' });
  }

  const wasCompleted = todo.isCompleted;

  const fields = ['title', 'notes', 'dueDate', 'priority', 'category', 'subtasks', 'repeat', 'isCompleted', 'order'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) todo[f] = req.body[f];
  });

  await todo.save();

  // If this task just got marked complete and has a repeat rule,
  // spin up the next occurrence automatically.
  let newTodo = null;
  if (!wasCompleted && todo.isCompleted && todo.repeat !== 'none') {
    const base = todo.dueDate ? new Date(todo.dueDate) : new Date();
    const nextDue = new Date(base);
    if (todo.repeat === 'daily') nextDue.setDate(nextDue.getDate() + 1);
    if (todo.repeat === 'weekly') nextDue.setDate(nextDue.getDate() + 7);

    newTodo = await Todo.create({
      libraryId: todo.libraryId,
      studentId: todo.studentId,
      title: todo.title,
      notes: todo.notes,
      priority: todo.priority,
      category: todo.category,
      repeat: todo.repeat,
      dueDate: nextDue,
      subtasks: todo.subtasks.map((s) => ({ title: s.title, isCompleted: false })),
      order: todo.order,
    });
  }

  res.status(200).json({ todo, newTodo });
});

// @desc    Delete a to-do
// @route   DELETE /api/todos/:id
// @access  Private (student)
const deleteTodo = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, studentId: student._id });
  if (!todo) {
    return res.status(404).json({ message: 'To-do not found' });
  }
  res.status(200).json({ message: 'To-do deleted' });
});

// @desc    Persist new manual order after drag-and-drop
// @route   PUT /api/todos/reorder
// @access  Private (student)
const reorderTodos = asyncHandler(async (req, res) => {
  const { orders } = req.body; // [{ id, order }]
  if (!Array.isArray(orders)) {
    return res.status(400).json({ message: 'orders array required' });
  }
  const student = await Student.findOne({ userId: req.user._id });

  await Promise.all(
    orders.map(({ id, order }) =>
      Todo.updateOne({ _id: id, studentId: student._id }, { $set: { order } })
    )
  );

  res.status(200).json({ message: 'Order updated' });
});

// @desc    Bulk complete / incomplete / delete
// @route   POST /api/todos/bulk
// @access  Private (student)
const bulkUpdateTodos = asyncHandler(async (req, res) => {
  const { ids, action } = req.body; // action: 'complete' | 'incomplete' | 'delete'
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array required' });
  }
  const student = await Student.findOne({ userId: req.user._id });

  if (action === 'delete') {
    await Todo.deleteMany({ _id: { $in: ids }, studentId: student._id });
    return res.status(200).json({ message: 'Deleted' });
  }

  if (action === 'complete' || action === 'incomplete') {
    await Todo.updateMany(
      { _id: { $in: ids }, studentId: student._id },
      { $set: { isCompleted: action === 'complete' } }
    );
    return res.status(200).json({ message: 'Updated' });
  }

  return res.status(400).json({ message: 'Invalid action' });
});

module.exports = {
  createTodo,
  getMyTodos,
  updateTodo,
  deleteTodo,
  reorderTodos,
  bulkUpdateTodos,
};