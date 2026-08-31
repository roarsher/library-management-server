 const express = require('express');
const router = express.Router();
const {
  createTodo,
  getMyTodos,
  updateTodo,
  deleteTodo,
  reorderTodos,
  bulkUpdateTodos,
} = require('../controllers/todoController');
 const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('student'));

// IMPORTANT: '/reorder' must be registered before '/:id' or Express
// will treat "reorder" as an :id param on the PUT /:id route.
router.put('/reorder', reorderTodos);
router.post('/bulk', bulkUpdateTodos);

router.post('/', createTodo);
router.get('/me', getMyTodos);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

module.exports = router;