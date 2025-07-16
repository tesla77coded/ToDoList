
// utils/queryBuilders.js

export const buildPaginatedTaskQuery = ({
  userId = null,
  search = null,
  after = null,
  sort = 'created',
  limit = 5,
  isAdmin = false,
}) => {
  const values = [];
  let whereClause = '';
  let cursorClause = '';
  let sortClause = '';
  let paramIndex = 1;

  // Search (title or description)
  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    whereClause += `(LOWER(title) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex})`;
    paramIndex++;
  }

  // user_id condition (skip for admin)
  if (!isAdmin && userId) {
    if (whereClause) whereClause += ' AND ';
    values.push(userId);
    whereClause += `user_id = $${paramIndex}`;
    paramIndex++;
  }

  if (whereClause) whereClause = 'WHERE ' + whereClause;

  // Cursor logic
  if (after) {
    if (sort === 'title') {
      values.push(after);
      cursorClause = `${whereClause ? ' AND' : 'WHERE'} title > $${paramIndex}`;
      paramIndex++;
    } else {
      values.push(after);
      cursorClause = `${whereClause ? ' AND' : 'WHERE'} created_at < $${paramIndex}`;
      paramIndex++;
    }
  }

  // Sorting
  if (sort === 'title') {
    sortClause = `
      ORDER BY
        CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END,
        title ASC
    `;
  } else {
    sortClause = `ORDER BY created_at DESC`;
  }

  const limitClause = `LIMIT $${paramIndex}`;
  values.push(limit);

  const query = `
    SELECT * FROM tasks
    ${whereClause}
    ${cursorClause}
    ${sortClause}
    ${limitClause}
  `;

  return { query, values };
};
